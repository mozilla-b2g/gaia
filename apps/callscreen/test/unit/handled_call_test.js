/* globals CallsHandler, FontSizeManager, HandledCall, MockCall, MockCallScreen,
           MockCallsHandler, MockContactPhotoHelper, MockContacts,
           MockLazyL10n, MockMozL10n, MockNavigatorMozIccManager,
           MockNavigatorSettings, MocksHelper, MockUtils, Voicemail */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/test/unit/mock_call_screen.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/dialer/mock_calls_handler.js');
require('/shared/test/unit/mocks/dialer/mock_font_size_manager.js');

require('/js/handled_call.js');
require('/shared/js/dialer/voicemail.js');

var mocksHelperForHandledCall = new MocksHelper([
  'Contacts',
  'CallScreen',
  'CallsHandler',
  'KeypadManager',
  'Utils',
  'LazyL10n',
  'ContactPhotoHelper',
  'FontSizeManager'
]).init();

suite('dialer/handled_call', function() {
  var realMozL10n;

  var realNavigatorSettings;
  var realMozIccManager;

  const VOICEMAIL_NUMBER = '123';
  var subject;
  var mockCall;

  var templates;

  var phoneNumber;
  var photoFullResolution;
  var photoThumbnail;

  mocksHelperForHandledCall.attachTestHelpers();

  suiteSetup(function() {
    realMozL10n = navigator.l10n;
    navigator.mozL10n = MockMozL10n;

    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    phoneNumber = Math.floor(Math.random() * 10000);

    sinon.stub(Voicemail, 'check', function(number, callback) {
      var isVoicemailNumber = false;
      if (number === VOICEMAIL_NUMBER) {
        isVoicemailNumber = true;
      }
      callback(isVoicemailNumber);
    });

    templates = document.createElement('div');
    templates.innerHTML = '<section id="handled-call-template" hidden>' +
                            '<div class="numberWrapper">' +
                              '<div class="hangup-button"></div>' +
                              '<div class="number font-light"></div>' +
                            '</div>' +
                            '<div class="fake-number font-light"></div>' +
                            '<div class="additionalContactInfo"></div>' +
                            '<div class="duration">' +
                              '<span class="font-light"></span>' +
                              '<div class="direction"></div>' +
                              '<div class="total-duration font-light"></div>' +
                            '</div>' +
                            '<div class="sim">' +
                              '<span class="via-sim"></span>' +
                              '<span class="sim-number"></span>' +
                            '</div>' +
                            '<button class="merge-button"></button>' +
                          '</section>';
    document.body.appendChild(templates);
  });

  suiteTeardown(function() {
    templates.parentNode.removeChild(templates);
    Voicemail.check.restore();
    navigator.mozSettings = realNavigatorSettings;
    navigator.mozIccManager = realMozIccManager;
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    photoFullResolution = new Blob();
    photoThumbnail = new Blob();
    this.sinon.stub(MockContactPhotoHelper,
                    'getFullResolution').returns(photoFullResolution);
    this.sinon.stub(MockContactPhotoHelper,
                    'getThumbnail').returns(photoThumbnail);
    this.sinon.useFakeTimers(Date.now());

    mockCall = new MockCall(String(phoneNumber), 'dialing');
    subject = new HandledCall(mockCall);

    document.body.appendChild(subject.node);
  });

  teardown(function() {
    MockNavigatorMozIccManager.mTeardown();
    var node = subject.node;
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  });

  suite('initialization', function() {
    test('full resolution photo', function() {
      assert.equal(subject.photo, photoFullResolution);
    });

    test('should set caller image by contact photo', function() {
      assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
    });

    test('call', function() {
      assert.equal(subject.call, mockCall);
    });

    test('call event listener', function() {
      assert.isTrue(mockCall._eventListeners.statechange.length > 0);
    });

    suite('node', function() {
      test('should not have an id', function() {
        assert.equal(subject.node.id, '');
      });

      test('should have the handled-call class', function() {
        assert.isTrue(subject.node.classList.contains('handled-call'));
      });

      test('should not be hidden', function() {
        assert.isFalse(subject.node.hidden);
      });

      test('should have a numberNode in a numberWrapper', function() {
        var numberNode = subject.node.querySelector('.numberWrapper .number');
        assert.equal(subject.numberNode, numberNode);
      });

      test('should have an additionalContactInfo node', function() {
        var additionalNode =
          subject.node.querySelector('.additionalContactInfo');
        assert.equal(subject.additionalInfoNode, additionalNode);
      });

      test('should have a duration node', function() {
        var durationNode = subject.node.querySelector('.duration');
        assert.equal(subject.durationNode, durationNode);
      });

      test('should have a duration child node', function() {
        var durationChildNode = subject.node.querySelector('.duration span');
        assert.equal(subject.durationChildNode, durationChildNode);
        assert.isTrue(durationChildNode.classList.contains('font-light'));
      });

      test('should have a merge button', function() {
        var mergeButton = subject.node.querySelector('.merge-button');
        assert.equal(subject.mergeButton, mergeButton);
      });
    });

    test('duration outgoing', function() {
      assert.ok(subject.durationChildNode);
      assert.equal(subject.durationChildNode.textContent, 'connecting');
    });

    test('duration incoming', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall);

      assert.ok(subject.durationChildNode);
      assert.equal(subject.durationChildNode.textContent, 'incoming');
    });

    test('number', function() {
      assert.ok(subject.numberNode);
      assert.equal(MockContacts.mCalledWith, mockCall.id.number);
    });

    test('initial state', function() {
      assert.equal(subject._initialState, 'dialing');
    });

    test('support for calls already connected at init', function() {
      mockCall = new MockCall(String(phoneNumber), 'connected');
      subject = new HandledCall(mockCall);

      assert.isTrue(MockCallScreen.mEnableKeypadCalled);
      assert.isFalse(subject.node.hidden);
      assert.isTrue(subject.node.classList.contains('ongoing'));
    });

    suite('stk call', function() {
      var reqStub, settingsSetSpy;
      var contactLookupSpy, tel, contact;
      setup(function() {
        reqStub = {
          onsuccess: null,
          result: {
            'icc.callmessage': 'stk second alpha identifier'
          }
        };
        settingsSetSpy = this.sinon.spy();
        var newCreateLock = function() {
          return {
            get: function() {
              return reqStub;
            },
            set: settingsSetSpy
          };
        };
        this.sinon.stub(navigator.mozSettings, 'createLock', newCreateLock);
        tel = {
          value: '666666666',
          carrier: 'carrier',
          type: 'type'
        };
        contact = {
          id: 666,
          name: ['from contact lookup'],
          tel: [tel]
        };
        contactLookupSpy = this.sinon.spy(MockContacts, 'findByNumber');
        mockCall = new MockCall(String(phoneNumber), 'dialing');
        subject = new HandledCall(mockCall);
      });

      test('should display the icc call message', function() {
        contactLookupSpy.yield(contact, tel, false);
        reqStub.onsuccess();
        assert.equal(subject.numberNode.textContent,
                     'stk second alpha identifier');
      });

      test('should clear the icc call message setting', function() {
        reqStub.onsuccess();
        assert.isTrue(settingsSetSpy.calledOnce);
        assert.isTrue(settingsSetSpy.calledWith({'icc.callmessage': null}));
      });

      test('should not let the contact lookup override the number', function() {
        reqStub.onsuccess();
        contactLookupSpy.yield(contact, tel, false);
        assert.equal(subject.numberNode.textContent,
                     'stk second alpha identifier');
      });
    });
  });

  suite('while dialing', function() {
    var updateKeypadSpy;

    setup(function() {
      updateKeypadSpy = this.sinon.spy(MockCallsHandler, 'updateKeypadEnabled');
      mockCall.mChangeState('dialing');
    });

    test('should check if we can enable the keypad', function() {
      assert.isTrue(updateKeypadSpy.calledOnce);
    });
  });

  suite('while alerting', function() {
    var updateKeypadSpy;

    setup(function() {
      updateKeypadSpy = this.sinon.spy(MockCallsHandler, 'updateKeypadEnabled');
      mockCall.mChangeState('alerting');
    });

    test('should check if we can enable the keypad', function() {
      assert.isTrue(updateKeypadSpy.calledOnce);
    });
  });

  suite('on connect', function() {
    setup(function() {
      mockCall._connect();
    });

    test('show the node', function() {
      assert.isFalse(subject.node.hidden);
    });

    test('ensure the callscreen in connected mode', function() {
      assert.equal(MockCallScreen.mLastRenderMode, 'connected');
    });

    test('start the timer', function() {
      assert.isTrue(MockCallScreen.mCalledCreateTicker);
    });

    test('keypad enabled', function() {
      assert.isTrue(MockCallScreen.mEnableKeypadCalled);
    });

    test('sync speaker', function() {
      assert.isTrue(MockCallScreen.mSyncSpeakerCalled);
    });

    test('photo displaying', function() {
      assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
    });

    test('should set contact picture', function() {
      this.sinon.stub(MockCallScreen, 'setCallerContactImage');
      mockCall._connect();
      sinon.assert.calledOnce(MockCallScreen.setCallerContactImage);
    });

    suite('in a group', function() {
      setup(function() {
        MockCallScreen.mSetCallerContactImageCalled = false;
        mockCall.group = {};

        mockCall._connect();
      });

      test('contact image updated', function() {
        assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
      });
    });

    test('primary contact info', function() {
      assert.isTrue(MockUtils.mCalledGetPhoneNumberPrimaryInfo);
    });

    test('additional contact info', function() {
      assert.isTrue(MockUtils.mCalledGetPhoneNumberAdditionalInfo);
    });

    test('mute initially off', function() {
      assert.isFalse(MockCallScreen.mMuteOn);
    });

    test('speaker initially off', function() {
      assert.isFalse(MockCallScreen.mSpeakerOn);
    });
  });

  suite('on disconnect', function() {
    var node;

    setup(function() {
      node = subject.node;

      mockCall._connect();
      MockCallScreen.mute();
      MockCallScreen.switchToSpeaker();
    });

    suite('from a regular call', function() {

      test('should show call ended', function() {
        mockCall._disconnect();
        assert.equal(
          subject.node.querySelector('.duration span').textContent,
          'callEnded');
      });

      test('should not show the total call duration', function() {
        subject.node.querySelector('.duration span').textContent = 'Incoming';
        mockCall._disconnect();
        assert.equal(subject.node.querySelector('.total-duration').textContent,
                     '');
      });

      test('should show the total call duration', function() {
        var totalCallDuration = '12:34';
        subject.node.querySelector('.duration span').textContent =
          totalCallDuration;
        mockCall._disconnect();
        assert.equal(subject.node.querySelector('.total-duration').textContent,
                     totalCallDuration);
      });

      test('should remove listener on the call', function() {
        this.sinon.spy(mockCall, 'removeEventListener');
        mockCall._disconnect();
        sinon.assert.calledWith(
          mockCall.removeEventListener, 'statechange', subject);
        mockCall.removeEventListener.restore();
      });

      test('should keep the call', function() {
        mockCall._disconnect();
        assert.ok(subject.call);
      });

      test('should nullify the photo', function() {
        mockCall._disconnect();
        assert.isNull(subject.photo);
      });

      test('should clear the ticker', function() {
        mockCall._disconnect();
        assert.isTrue(MockCallScreen.mCalledStopTicker);
      });

      test('should remove the node from the dom', function() {
        mockCall._disconnect();
        assert.isFalse(MockCallScreen.mRemoveCallCalled);
        this.sinon.clock.tick(2000);
        assert.isTrue(MockCallScreen.mRemoveCallCalled);
      });

      test('should nullify the node', function() {
        mockCall._disconnect();
        assert.isNotNull(subject.node);
        this.sinon.clock.tick(2000);
        assert.isNull(subject.node);
      });

      test('it does not show the banner', function() {
        assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
      });
    });

    suite('from a group', function() {
      setup(function() {
        mockCall.group = null;
        mockCall.mChangeState('disconnecting');
        mockCall.ongroupchange(mockCall);
        mockCall._disconnect();
      });

      test('show the banner', function() {
        assert.isTrue(MockCallScreen.mShowStatusMessageCalled);
        var caller = MockLazyL10n.keys['caller-left-call'].caller;
        assert.isTrue(typeof(caller) === 'string');
      });
    });
  });

  suite('holding', function() {
    setup(function() {
      mockCall._hold();
    });

    test('disable keypad', function() {
      assert.equal(MockCallsHandler.mUpdateKeypadEnabledCalled, false);
    });

    test('add the css class', function() {
      assert.isTrue(subject.node.classList.contains('held'));
    });
  });

  suite('resuming', function() {
    setup(function() {
      mockCall._hold();
      MockCallScreen.mSyncSpeakerCalled = false;
      MockCallScreen.mEnableKeypadCalled = false;
      subject.photo = 'dummy_photo_1';
      mockCall._resume();
    });

    test('remove the css class', function() {
      assert.isFalse(subject.node.classList.contains('held'));
    });

    test('enable keypad', function() {
      assert.isTrue(MockCallScreen.mEnableKeypadCalled);
    });

    test('sync speaker', function() {
      assert.isTrue(MockCallScreen.mSyncSpeakerCalled);
    });

    test('changed the user photo', function() {
      assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
    });
  });

  suite('call direction', function() {

    suite('outgoing call', function() {
      setup(function() {
        mockCall = new MockCall('888', 'outgoing');
        subject = new HandledCall(mockCall);
      });

      test('before and after connexion', function() {
        assert.isTrue(subject.node.classList.contains('outgoing'));
        assert.isFalse(subject.node.classList.contains('ongoing'));
        mockCall._connect();
        assert.isTrue(subject.node.classList.contains('ongoing'));
        assert.isTrue(subject.node.classList.contains('outgoing'));
      });
    });

    suite('incoming call', function() {
      setup(function() {
        mockCall = new MockCall('888', 'incoming');
        subject = new HandledCall(mockCall);
      });

      test('before and after connexion', function() {
        assert.isTrue(subject.node.classList.contains('incoming'));
        assert.isFalse(subject.node.classList.contains('ongoing'));
        mockCall._connect();
        assert.isTrue(subject.node.classList.contains('ongoing'));
        assert.isTrue(subject.node.classList.contains('incoming'));
      });
    });
  });

  test('should display contact name', function() {
    mockCall = new MockCall('888', 'incoming');
    subject = new HandledCall(mockCall);

    assert.equal(subject.numberNode.textContent, 'test name');
  });

  test('should display withheld-number l10n key', function() {
    mockCall = new MockCall('', 'incoming');
    subject = new HandledCall(mockCall);

    assert.equal(subject.numberNode.textContent, 'withheld-number');
  });

  test('should display switch-calls l10n key', function() {
    mockCall = new MockCall('888', 'connected');
    subject = new HandledCall(mockCall);
    mockCall.secondId = { number: '999' };
    subject.updateCallNumber();

    assert.equal(subject.numberNode.textContent, 'switch-calls');
  });

  suite('Emergency Call layout', function() {
    setup(function() {
      MockCallScreen.mSetEmergencyWallpaperCalled = false;
    });

    test('should set the emergency class', function() {
      mockCall = new MockCall('112', 'dialing');
      subject = new HandledCall(mockCall);

      assert.isTrue(subject.node.classList.contains('emergency'));
    });

    test('should display emergency number label', function() {
      mockCall = new MockCall('112', 'dialing');
      mockCall.emergency = true;
      subject = new HandledCall(mockCall);

      assert.equal(subject.numberNode.textContent, '112');
    });
  });

  test('should display voicemail label', function() {
    mockCall = new MockCall('123', 'dialing');
    subject = new HandledCall(mockCall);

    assert.equal(subject.numberNode.textContent, 'voiceMail');
  });

  suite('additional information', function() {
    test('check additional info updated', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall);
      assert.equal(subject.additionalInfoNode.textContent, '888');
    });

    test('check without additional info', function() {
      mockCall = new MockCall('999', 'incoming');
      subject = new HandledCall(mockCall);
      assert.equal('', subject.additionalInfoNode.textContent);
    });

    test('check switch-calls mode', function() {
      mockCall = new MockCall('888', 'connected');
      subject = new HandledCall(mockCall);
      mockCall.secondId = { number: '999' };
      subject.updateCallNumber();

      assert.equal('', subject.additionalInfoNode.textContent);
      subject.restoreAdditionalContactInfo();
      assert.equal('', subject.additionalInfoNode.textContent);
    });

    suite('additional contact info', function() {
      setup(function() {
        mockCall = new MockCall('888', 'incoming');
        subject = new HandledCall(mockCall);
      });

      suite('when there are additional infos to display', function() {
        setup(function() {
          subject.replaceAdditionalContactInfo('test additional info');
        });

        test('should update the text content', function() {
          assert.equal(subject.additionalInfoNode.textContent,
                       'test additional info');
        });

        test('should add the proper css class', function() {
          assert.isTrue(subject.node.classList.contains('additionalInfo'));
        });
      });

      suite('when there aren\'t additional infos to display', function() {
        setup(function() {
          subject.replaceAdditionalContactInfo('');
        });

        test('should empty the text content', function() {
          assert.equal(subject.additionalInfoNode.textContent, '');
        });

        test('should remove the css class', function() {
          assert.isFalse(subject.node.classList.contains('additionalInfo'));
        });
      });
    });

    test('check restore additional info', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall);
      subject.replaceAdditionalContactInfo('test additional info');
      subject.restoreAdditionalContactInfo();
      assert.equal(subject.additionalInfoNode.textContent, '888');
    });
  });

  suite('phone number', function() {
    test('formatPhoneNumber should call the font size manager',
    function() {
      this.sinon.spy(FontSizeManager, 'adaptToSpace');
      subject.formatPhoneNumber('end');
      sinon.assert.calledWith(
        FontSizeManager.adaptToSpace, MockCallScreen.getScenario(),
        subject.numberNode, subject.node.querySelector('.fake-number'),
        false, 'end');
    });

    test('check replace number', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall);

      subject.replacePhoneNumber('12345678');
      assert.equal(subject.numberNode.textContent, '12345678');
    });

    test('check restore number', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall);

      subject.replacePhoneNumber('12345678');
      subject.restorePhoneNumber();
      assert.equal(subject.numberNode.textContent, 'test name');
    });

    test('check restore withheld-number', function() {
      mockCall = new MockCall('', 'incoming');
      subject = new HandledCall(mockCall);

      subject.restorePhoneNumber();
      assert.equal(subject.numberNode.textContent, 'withheld-number');
    });

   test('check restore voicemail number', function() {
      mockCall = new MockCall('123', 'incoming');
      subject = new HandledCall(mockCall);

      subject.restorePhoneNumber();
      assert.equal(subject.numberNode.textContent, 'voiceMail');
    });

   test('check restore emergency number', function() {
      mockCall = new MockCall('112', 'incoming');
      mockCall.emergency = true;
      subject = new HandledCall(mockCall);

      subject.restorePhoneNumber();
      assert.equal(subject.numberNode.textContent, '112');
    });
  });

  suite('caller photo', function() {
    setup(function() {
      MockCallScreen.mSetCallerContactImageCalled = false;
    });

    test('should reset photo when receiving a new handled call', function() {
      mockCall = new MockCall('111', 'incoming');
      subject = new HandledCall(mockCall);

      assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
    });
  });

  suite('explicit visibility', function() {
    test('calling show should show the node', function() {
      subject.node.hidden = true;
      subject.show();
      assert.isFalse(subject.node.hidden);
    });

    test('calling show should update singleLine status', function() {
      subject.show();
      assert.isTrue(MockCallScreen.mUpdateSingleLineCalled);
    });

    test('calling hide should hide the node', function() {
      subject.node.hidden = false;
      subject.hide();
      assert.isTrue(subject.node.hidden);
    });

    test('calling hide should update singleLine status', function() {
      subject.show();
      assert.isTrue(MockCallScreen.mUpdateSingleLineCalled);
    });

    suite('when the node got nullified', function() {
      setup(function() {
        subject.node = null;
      });

      test('show() should handle it', function() {
        subject.show();
        assert.isTrue(true); // We'll get a JS error otherwise
      });

      test('hide() should handle it', function() {
        subject.hide();
        assert.isTrue(true); // We'll get a JS error otherwise
      });
    });
  });

  suite('ongroupchange', function() {
    var moveToGroupSpy;
    var insertCallSpy;

    setup(function() {
      mockCall = new MockCall(String(phoneNumber), 'connected');
      subject = new HandledCall(mockCall);

      moveToGroupSpy = this.sinon.spy(MockCallScreen, 'moveToGroup');
      insertCallSpy = this.sinon.spy(MockCallScreen, 'insertCall');
    });

    test('When entering a group, it should ask ' +
         'the CallScreen to move into the group details', function() {
      mockCall.group = this.sinon.stub();
      mockCall.ongroupchange(mockCall);
      assert.isTrue(moveToGroupSpy.calledWith(subject.node));
      assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
    });

    test('when leaving a group but still connected, it should move back to ' +
         'the CallScreen but not show any status message on disconnect.',
    function() {
      mockCall.group = null;
      mockCall.ongroupchange(mockCall);
      assert.isTrue(insertCallSpy.calledWith(subject.node));
      mockCall._disconnect();
      assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
    });

    test('when leaving a group by hanging up, it shouldn\'t move back to the' +
         'CallScreen and show a status message.', function() {
      mockCall.group = null;
      mockCall.state = 'disconnecting';
      mockCall.ongroupchange(mockCall);
      assert.isFalse(insertCallSpy.calledWith(subject.node));
      assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
      mockCall._disconnect();
      assert.isTrue(MockCallScreen.mShowStatusMessageCalled);
    });

    test('when leaving a group by hanging up the whole group calls, it ' +
         ' shouldn\'t move back and shouldn\'t show any status message.',
    function() {
      mockCall.group = null;
      mockCall.state = 'disconnecting';
      subject.node.dataset.groupHangup = 'groupHangup';
      mockCall.ongroupchange(mockCall);
      assert.isFalse(insertCallSpy.calledWith(subject.node));
      mockCall._disconnect();
      assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
    });
  });

  suite('Controls displayed when in a group', function() {
    test('hangup button', function() {
      mockCall = new MockCall(String(phoneNumber), 'connected');
      subject = new HandledCall(mockCall);

      var hangUpSpy = this.sinon.spy(mockCall, 'hangUp');
      subject.hangupButton.onclick();
      assert.isTrue(hangUpSpy.calledOnce);
    });
  });

  suite('merge button', function() {
    test('should listen for click', function() {
      var mergeActiveCallWithSpy = this.sinon.spy(CallsHandler,
                                                  'mergeActiveCallWith');
      subject.mergeButton.onclick();
      assert.isTrue(mergeActiveCallWithSpy.calledWith(subject.call));
    });
  });

  suite('DSDS SIM display >', function() {
    setup(function() {
      MockNavigatorMozIccManager.addIcc('12345', {'cardState': 'ready'});
    });

    suite('One SIM >', function() {
      test('should hide the sim nodes', function() {
        mockCall = new MockCall('888', 'outgoing');
        subject = new HandledCall(mockCall);

        assert.isTrue(subject.viaSimNode.hidden);
        assert.isTrue(subject.simNumberNode.hidden);
      });
    });

    suite('Multiple SIMs >', function() {
      setup(function() {
        MockNavigatorMozIccManager.addIcc('424242', {'cardState': 'ready'});
      });

      test('should show which sim is in use', function() {
        mockCall = new MockCall('888', 'outgoing');
        subject = new HandledCall(mockCall);

        assert.isFalse(subject.viaSimNode.hidden);
        assert.isFalse(subject.simNumberNode.hidden);

        assert.equal(subject.viaSimNode.textContent, 'via-sim');
        assert.deepEqual(MockLazyL10n.keys['via-sim'], {n: 2});

        assert.equal(subject.simNumberNode.textContent, 'sim-number');
        assert.deepEqual(MockLazyL10n.keys['sim-number'], {n: 2});
      });
    });
  });
});
