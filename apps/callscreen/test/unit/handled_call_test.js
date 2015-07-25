/* globals AudioCompetingHelper, ConferenceGroupHandler, FontSizeManager,
           HandledCall, MockCall, MockCallScreen, MockCallsHandler,
           MockContactPhotoHelper, MockContacts, MockFontSizeUtils,
           MockL10n, MockNavigatorMozIccManager,
           MockNavigatorSettings, MocksHelper, MockTonePlayer, MockUtils,
           MockVoicemail */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/test/unit/mock_call_screen.js');
require('/test/unit/mock_conference_group_handler.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/shared/test/unit/mocks/mock_font_size_utils.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/dialer/mock_calls_handler.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');
require('/shared/test/unit/mocks/dialer/mock_font_size_manager.js');
require('/shared/test/unit/mocks/mock_voicemail.js');

require('/js/audio_competing_helper.js');
require('/js/handled_call.js');

var mocksHelperForHandledCall = new MocksHelper([
  'Audio',
  'AudioContext',
  'Contacts',
  'CallScreen',
  'ConferenceGroupHandler',
  'CallsHandler',
  'FontSizeUtils',
  'KeypadManager',
  'Utils',
  'ContactPhotoHelper',
  'TonePlayer',
  'FontSizeManager',
  'Voicemail'
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
    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    phoneNumber = Math.floor(Math.random() * 10000);

    templates = document.createElement('div');
    templates.innerHTML = `<section id="handled-call-template" role="dialog"
                             hidden>
                             <div class="hangup-button" role="button"
                               data-l10n-id="hangup-a11y-button"></div>
                               <div class="numberWrapper
                                 direction-status-bar">
                               <div class="number font-light">
                                 <bdi></bdi>
                               </div>
                               <span role="button" id="switch-calls-button">
                               </span>
                             </div>
                             <div class="additionalContactInfo font-light">
                               <span class="tel" dir="ltr"></span>
                               <span class="separator"></span>
                               <span class="tel-type" dir="auto"></span>
                             </div>
                             <div class="duration">
                               <span class="font-light"></span>
                               <div class="total-duration"></div>
                               <div class="direction"></div>
                             </div>
                             <div class="sim">
                               <span class="via-sim"></span>
                               <span class="sim-number"></span>
                             </div>
                             <button class="merge-button"
                               data-l10n-id="merge">Merge</button>
                           </section>`;
    document.body.appendChild(templates);
  });

  suiteTeardown(function() {
    templates.parentNode.removeChild(templates);
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
    MockVoicemail.mResolvePromise(false);

    AudioCompetingHelper.init('test');
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
    setup(function() {
      this.sinon.spy(MockCallsHandler, 'updatePlaceNewCall');
    });

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
      assert.equal(mockCall._eventListeners.statechange.length, 1);
    });

    test('CallsHandler.updatePlaceNewCall added as call state listener',
    function() {
      subject.call.mChangeState();
      sinon.assert.calledOnce(MockCallsHandler.updatePlaceNewCall);
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
        var numberNode =
          subject.node.querySelector('.numberWrapper .number bdi');
        assert.equal(subject.numberNode, numberNode);
      });

      test('should have an outerNode in a numberWrapper', function() {
        var outerNode = subject.node.querySelector('.numberWrapper .number');
        assert.equal(subject.outerNode, outerNode);
      });

      test('should have an additionalContactTel node', function() {
        var additionalTelNode =
          subject.node.querySelector('.additionalContactInfo .tel');
        assert.equal(subject.additionalTelNode, additionalTelNode);
      });

      test('should have an additionalContactTelType node', function() {
        var additionalTelTypeNode =
          subject.node.querySelector('.additionalContactInfo .tel-type');
        assert.equal(subject.additionalTelTypeNode, additionalTelTypeNode);
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
    });

    test('duration outgoing', function() {
      assert.ok(subject.durationChildNode);
      assert.equal(subject.durationChildNode.getAttribute('data-l10n-id'),
        'connecting');
    });

    test('duration incoming', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall);

      assert.ok(subject.durationChildNode);
      assert.equal(subject.durationChildNode.getAttribute('data-l10n-id'),
        'incoming');
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
        MockVoicemail.mResolvePromise(false);
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

  suite('on connect', function() {
    setup(function() {
      this.sinon.spy(AudioCompetingHelper, 'compete');
      this.sinon.spy(MockCallsHandler, 'updatePlaceNewCall');
      this.sinon.spy(MockCallsHandler, 'updateMergeAndOnHoldStatus');
      this.sinon.spy(MockCallsHandler, 'updateMuteAndSpeakerStatus');
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

    test('mute initially off', function() {
      assert.isFalse(MockCallScreen.mMuteOn);
    });

    test('speaker initially off', function() {
      assert.isFalse(MockCallScreen.mSpeakerOn);
    });

    test('the place new call button status is updated', function() {
      sinon.assert.calledOnce(MockCallsHandler.updatePlaceNewCall);
    });

    test('the merge and on hold buttons status is updated', function() {
      sinon.assert.calledOnce(MockCallsHandler.updateMergeAndOnHoldStatus);
    });

    test('the mute and speaker buttons\' status is updated', function() {
      sinon.assert.calledOnce(MockCallsHandler.updateMuteAndSpeakerStatus);
    });

    test('AudioCompetingHelper compete gets called when connected', function() {
      sinon.assert.notCalled(AudioCompetingHelper.compete);
      this.sinon.clock.tick(1000);
      sinon.assert.calledOnce(AudioCompetingHelper.compete);
    });
  });

  suite('on disconnect', function() {
    var node;

    setup(function() {
      node = subject.node;
    });

    suite('from a regular call', function() {

      setup(function() {
        mockCall._connect();
        MockCallScreen.mute();
        MockCallScreen.switchToSpeaker();
      });

      test('should show call ended', function() {
        var span = subject.node.querySelector('.duration span');

        mockCall._disconnect();
        assert.isTrue(span.hasAttribute('data-l10n-id'));
        assert.equal(span.getAttribute('data-l10n-id'), 'callEnded');
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
        assert.isFalse(MockCallScreen.mRemoveCallCalled);
        mockCall._disconnect();
        //check that the node is not immediately removed from DOM.
        assert.isFalse(MockCallScreen.mRemoveCallCalled);
        this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
        assert.isTrue(MockCallScreen.mRemoveCallCalled);
      });

      test('should nullify the node', function() {
        mockCall._disconnect();
        assert.isNotNull(subject.node);
        this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
        assert.isNull(subject.node);
      });

      test('it does not show the banner', function() {
        assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
      });

      test('end call tone should be played', function() {
        var playSpy = this.sinon.spy(MockTonePlayer, 'playSequence');
        mockCall._disconnect();
        assert.isTrue(playSpy.calledWith([[480, 620, 250]]));
      });

      test('the place new call button status is updated', function() {
        this.sinon.spy(MockCallsHandler, 'updatePlaceNewCall');
        mockCall._disconnect();
        sinon.assert.calledOnce(MockCallsHandler.updatePlaceNewCall);
      });

      test('the merge and on hold buttons status is updated', function() {
        this.sinon.spy(MockCallsHandler, 'updateMergeAndOnHoldStatus');
        mockCall._disconnect();
        sinon.assert.calledOnce(MockCallsHandler.updateMergeAndOnHoldStatus);
      });

      test('the mute and speaker buttons\' status is updated', function() {
        this.sinon.spy(MockCallsHandler, 'updateMuteAndSpeakerStatus');
        mockCall._disconnect();
        sinon.assert.calledOnce(MockCallsHandler.updateMuteAndSpeakerStatus);
      });

      test('AudioCompetingHelper leaveCompetition gets called on disconnected',
        function() {
          this.sinon.spy(AudioCompetingHelper, 'leaveCompetition');
          mockCall._disconnect();

          sinon.assert.called(AudioCompetingHelper.leaveCompetition);
      });
    });

    suite('from a group', function() {
      setup(function() {
        this.sinon.spy(MockCallScreen, 'showStatusMessage');
        mockCall._connect();
        MockCallScreen.mute();
        MockCallScreen.switchToSpeaker();
        mockCall.group = null;
        mockCall.mChangeState('disconnecting');
        mockCall.ongroupchange(mockCall);
        mockCall._disconnect();
      });

      test('show the banner', function() {
        sinon.assert.calledWithMatch(
          MockCallScreen.showStatusMessage, {
            id: 'caller-left-call',
            args: { caller: 'test name' }
          }
        );
      });
    });

    suite('the call was not connected', function() {
      test('end call tone is not played', function() {
        var playSpy = this.sinon.spy(MockTonePlayer, 'playSequence');
        mockCall._disconnect();
        assert.isFalse(playSpy.called);
      });
    });
  });

  suite('holding', function() {
    setup(function() {
      this.sinon.spy(MockCallsHandler, 'updatePlaceNewCall');
      this.sinon.spy(MockCallsHandler, 'updateMergeAndOnHoldStatus');
      this.sinon.spy(MockCallsHandler, 'updateMuteAndSpeakerStatus');
      this.sinon.spy(AudioCompetingHelper, 'leaveCompetition');
      mockCall._hold();
    });

    test('add the css class', function() {
      assert.isTrue(subject.node.classList.contains('held'));
    });

    test('AudioCompetingHelper leaveCompetition gets called when held',
    function() {
      sinon.assert.calledOnce(AudioCompetingHelper.leaveCompetition);
    });

    test('the place new call button status is updated', function() {
      // Call passes through the 'holding' and 'held' states.
      sinon.assert.calledTwice(MockCallsHandler.updatePlaceNewCall);
    });

    test('the merge and on hold buttons status is updated', function() {
      // Call passes through the 'holding' and 'held' states.
      sinon.assert.calledTwice(MockCallsHandler.updateMergeAndOnHoldStatus);
    });

    test('the mute and speaker buttons status is updated', function() {
      // Call passes through the 'holding' and 'held' states.
      sinon.assert.calledTwice(MockCallsHandler.updateMuteAndSpeakerStatus);
    });
  });

  suite('resuming', function() {
    setup(function() {
      this.sinon.spy(MockCallsHandler, 'updatePlaceNewCall');
      this.sinon.spy(MockCallsHandler, 'updateMergeAndOnHoldStatus');
      this.sinon.spy(MockCallsHandler, 'updateMuteAndSpeakerStatus');
      mockCall._hold();
      MockCallScreen.mSyncSpeakerCalled = false;
      MockCallScreen.mEnableKeypadCalled = false;
      subject.photo = 'dummy_photo_1';
      mockCall._resume();
    });

    test('remove the css class', function() {
      assert.isFalse(subject.node.classList.contains('held'));
    });

    test('sync speaker', function() {
      assert.isTrue(MockCallScreen.mSyncSpeakerCalled);
    });

    test('changed the user photo', function() {
      assert.isTrue(MockCallScreen.mSetCallerContactImageCalled);
    });

    test('the place new call button status is updated', function() {
      // Call passes through the 'holding', 'held', 'resuming' and 'connected'
      //  states.
      sinon.assert.callCount(MockCallsHandler.updatePlaceNewCall, 4);
    });

    test('the merge and on hold buttons status is updated', function() {
      // Call passes through the 'holding', 'held', 'resuming' and 'connected'
      //  states.
      sinon.assert.callCount(MockCallsHandler.updateMergeAndOnHoldStatus, 4);
    });

    test('the mute and speaker buttons status is updated', function() {
      // Call passes through the 'holding' and 'held' states.
      sinon.assert.callCount(MockCallsHandler.updateMuteAndSpeakerStatus, 4);
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
        assert.equal(subject.node.getAttribute('data-l10n-id'), 'outgoing');
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
        assert.equal(subject.node.getAttribute('data-l10n-id'), 'incoming');
      });
    });
  });

  test('should display contact name', function() {
    mockCall = new MockCall('888', 'incoming');
    subject = new HandledCall(mockCall);
    MockVoicemail.mResolvePromise(false);

    assert.equal(subject.numberNode.textContent, 'test name');
  });

  test('should display withheld-number l10n key', function() {
    mockCall = new MockCall('', 'incoming');
    subject = new HandledCall(mockCall);

    assert.equal(subject.numberNode.getAttribute('data-l10n-id'),
      'withheld-number');
  });

  test('should display switch-calls l10n key', function() {
    mockCall = new MockCall('888', 'connected');
    subject = new HandledCall(mockCall);
    mockCall.secondId = { number: '999' };
    subject.updateCallNumber();

    assert.equal(subject.numberNode.getAttribute('data-l10n-id'),
      'switch-calls');
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

      assert.equal(subject.additionalTelNode.getAttribute('data-l10n-id'),
        'emergencyNumber');
    });
  });

  test('should display voicemail label', function() {
    mockCall = new MockCall(VOICEMAIL_NUMBER, 'dialing');
    subject = new HandledCall(mockCall);
    MockVoicemail.mResolvePromise(true);

    assert.equal(subject.numberNode.getAttribute('data-l10n-id'), 'voiceMail');
  });

  suite('additional information', function() {
    test('check additional info updated', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall);
      MockVoicemail.mResolvePromise(false);
      assert.equal(subject.additionalTelNode.textContent, '888');
      assert.equal(subject.additionalTelTypeNode.textContent, 'type, carrier');
    });

    test('check switch-calls mode', function() {
      mockCall = new MockCall('888', 'connected');
      subject = new HandledCall(mockCall);
      mockCall.secondId = { number: '999' };
      subject.updateCallNumber();

      assert.equal('', subject.additionalTelNode.textContent);
      assert.equal('', subject.additionalTelTypeNode.textContent);
      subject.restoreAdditionalContactInfo();
      assert.equal('', subject.additionalTelNode.textContent);
      assert.equal('', subject.additionalTelTypeNode.textContent);
    });

    suite('additional contact info', function() {
      setup(function() {
        mockCall = new MockCall('888', 'incoming');
        subject = new HandledCall(mockCall);
      });

      suite('when there are additional infos to display', function() {
        setup(function() {
          subject.replaceAdditionalContactInfo(
              {raw: 'test additional tel'},
              {raw: 'test additional tel-type'});
        });

        test('should update the text content', function() {
          assert.equal(subject.additionalTelNode.textContent,
                       'test additional tel');
          assert.equal(subject.additionalTelTypeNode.textContent,
                       'test additional tel-type');
        });

        test('should add the proper css class', function() {
          assert.isTrue(subject.node.classList.contains('additionalInfo'));
        });
      });

      suite('when there aren\'t additional infos to display', function() {
        setup(function() {
          subject.replaceAdditionalContactInfo('', '');
        });

        test('should empty the text content', function() {
          assert.equal(subject.additionalTelNode.textContent, '');
          assert.equal(subject.additionalTelTypeNode.textContent, '');
        });

        test('should remove the css class', function() {
          assert.isFalse(subject.node.classList.contains('additionalInfo'));
        });
      });
    });
  });

  suite('phone number', function() {
    test('formatPhoneNumber should call the font size manager if call is not' +
         ' in a conference', function() {
      this.sinon.spy(FontSizeManager, 'adaptToSpace');
      subject.formatPhoneNumber('end');
      sinon.assert.calledWith(
        FontSizeManager.adaptToSpace, MockCallScreen.mScenario,
        subject.outerNode, false, 'end');
    });

    test('formatPhoneNumber should not call the font size manager if call is' +
         ' in a conference', function() {
      subject.call.group = {};
      this.sinon.spy(FontSizeManager, 'adaptToSpace');
      subject.formatPhoneNumber('end');
      assert.equal(FontSizeManager.adaptToSpace.callCount, 0);
      delete subject.call.group;
    });

    test('should ensureFixedBaseline with a contact', function() {
      mockCall = new MockCall('888', 'dialing');
      subject = new HandledCall(mockCall);
      MockVoicemail.mResolvePromise(false);
      this.sinon.spy(FontSizeManager, 'ensureFixedBaseline');
      subject.formatPhoneNumber('end');
      sinon.assert.calledWith(
        FontSizeManager.ensureFixedBaseline,
        MockCallScreen.mScenario,
        subject.numberNode
      );
    });

    test('should call resetFixedBaseline without a contact', function() {
      mockCall = new MockCall('111', 'dialing');
      subject = new HandledCall(mockCall);
      this.sinon.spy(FontSizeManager, 'resetFixedBaseline');
      subject.formatPhoneNumber('end');
      sinon.assert.calledWith(
        FontSizeManager.resetFixedBaseline, subject.numberNode);
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
      MockVoicemail.mResolvePromise(false);

      subject.replacePhoneNumber('12345678');
      subject.restorePhoneNumber();
      assert.equal(subject.numberNode.textContent, 'test name');
    });

    test('check restore withheld-number', function() {
      mockCall = new MockCall('', 'incoming');
      subject = new HandledCall(mockCall);

      subject.restorePhoneNumber();
      assert.equal(subject.numberNode.getAttribute('data-l10n-id'),
        'withheld-number');
    });

   test('check restore voicemail number', function() {
      mockCall = new MockCall(VOICEMAIL_NUMBER, 'incoming');
      subject = new HandledCall(mockCall);
      MockVoicemail.mResolvePromise(true);

      subject.restorePhoneNumber();
      assert.equal(subject.numberNode.getAttribute('data-l10n-id'),
        'voiceMail');
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
    var addToGroupDetailsSpy;

    setup(function() {
      mockCall = new MockCall(String(phoneNumber), 'connected');
      subject = new HandledCall(mockCall);

      addToGroupDetailsSpy = this.sinon.spy(
        ConferenceGroupHandler, 'addToGroupDetails');
      this.sinon.spy(MockCallScreen, 'insertCall');
    });

    test('When entering a group, it should ask ' +
         'the CallScreen to move into the group details', function() {
      mockCall.group = this.sinon.stub();
      mockCall.ongroupchange(mockCall);
      assert.isTrue(addToGroupDetailsSpy.calledWith(subject.node));
      assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
    });

    suite('when leaving a group but still connected', function() {
      setup(function() {
        mockCall.group = null;
      });

      test('it should clone the call node if the participant list overlay is ' +
        'shown', function() {
        this.sinon.stub(
          ConferenceGroupHandler, 'isGroupDetailsShown').returns(true);
        var parent = document.createElement('div');
        this.sinon.spy(parent, 'insertBefore');
        parent.appendChild(subject.node);
        mockCall.ongroupchange(mockCall);
        sinon.assert.calledOnce(parent.insertBefore);
        document.body.appendChild(subject.node);
      });

      test('it should move the call node back to the CallScreen', function() {
        mockCall.ongroupchange(mockCall);
        sinon.assert.calledWith(MockCallScreen.insertCall, subject.node);
      });

      test('it should not show any status message on disconnect', function() {
        mockCall.ongroupchange(mockCall);
        mockCall._disconnect();
        assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
      });
    });

    suite('when leaving a group by hanging up', function() {
      setup(function() {
        mockCall.group = null;
        mockCall.state = 'disconnecting';
        mockCall.ongroupchange(mockCall);
      });

      test('it shouldn\'t move back to the CallScreen', function() {
        sinon.assert.notCalled(MockCallScreen.insertCall);
        assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
      });

      test('it should show a status message.', function() {
        mockCall._disconnect();
        assert.isTrue(MockCallScreen.mShowStatusMessageCalled);
      });
    });

    suite('when leaving a group by hanging up the whole group calls',
    function() {
      setup(function() {
        mockCall.group = null;
        mockCall.state = 'disconnecting';
        subject.node.dataset.groupHangup = 'groupHangup';
        mockCall.ongroupchange(mockCall);
      });

      test('it shouldn\'t move back',
      function() {
        sinon.assert.notCalled(MockCallScreen.insertCall);
      });

      test('it shouldn\'t show any status message',
      function() {
        mockCall._disconnect();
        assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
      });
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

        var l10nAttrs = navigator.mozL10n.getAttributes(subject.viaSimNode);
        assert.equal(l10nAttrs.id, 'via-sim');
        assert.deepEqual(l10nAttrs.args, {n: 2});

        l10nAttrs = navigator.mozL10n.getAttributes(subject.simNumberNode);
        assert.equal(l10nAttrs.id, 'sim-number');
        assert.deepEqual(l10nAttrs.args, {n: 2});
      });
    });
  });

  suite('STK Call Control changes Number', function() {
    test('should resolve to changed contact', function() {
      mockCall = new MockCall('111', 'dialing');
      subject = new HandledCall(mockCall);
      assert.equal(subject.numberNode.textContent, '');

      //simulate the STK change to a different number
      mockCall.id.number = '555';
      mockCall._connect();
      MockVoicemail.mResolvePromise(false);

      assert.equal(subject.numberNode.textContent, 'test name');
    });

    test('should resolve to number if no contact', function() {
      mockCall = new MockCall('555', 'dialing');
      subject = new HandledCall(mockCall);
      assert.equal(subject.numberNode.textContent, '');

      //simulate the STK change to a different number
      mockCall.id.number = '111';
      mockCall._connect();
      MockVoicemail.mResolvePromise(false);

      assert.equal(subject.numberNode.textContent, '111');
    });

    test('should resolve to voicemail', function() {
      //simulate the STK change to a different number
      mockCall = new MockCall('111', 'dialing');
      subject = new HandledCall(mockCall);
      mockCall.id.number = '123';

      mockCall._connect();
      MockVoicemail.mResolvePromise(true);

      assert.equal(subject.numberNode.getAttribute('data-l10n-id'),
        'voiceMail');
    });

    test('should correctly identify emergency', function() {
      //simulate the STK change to a different number
      mockCall = new MockCall('555', 'dialing');
      subject = new HandledCall(mockCall);

      mockCall.id.number = '112';
      mockCall.emergency = true;
      mockCall._connect();

      assert.equal(subject.additionalTelNode.getAttribute('data-l10n-id'),
        'emergencyNumber');
      assert.isTrue(subject.node.classList.contains('emergency'));
      assert.isTrue(subject.node.textContent.includes('112'));
    });
  });

  suite('Resizing the call ended string', function() {
    var durationChildNode;

    setup(function() {
      durationChildNode = subject.node.querySelector('.duration span');
      durationChildNode.textContent = 'Call ended';

      this.sinon.spy(subject.mutationObserver, 'disconnect');
      this.sinon.spy(subject.mutationObserver, 'observe');
      this.sinon.spy(subject, 'computeCallEndedFontSizeRules');
    });

    test('Does not resize the string if no l10n attribute is present',
    function() {
      subject.observeMutation();
      sinon.assert.notCalled(subject.mutationObserver.disconnect);
      sinon.assert.notCalled(subject.mutationObserver.observe);
      sinon.assert.notCalled(subject.computeCallEndedFontSizeRules);
    });

    test('Disconnects and reconnects the observer before adjusting the string',
    function() {
      this.sinon.stub(MockFontSizeUtils, 'getMaxFontSizeInfo').returns({
        fontSize: 1.0
      });
      durationChildNode.setAttribute('data-l10n-id', 'callEnded');
      subject.observeMutation();
      assert.isTrue(
        subject.mutationObserver.disconnect.calledBefore(
          subject.computeCallEndedFontSizeRules
        )
      );
      assert.isTrue(
        subject.mutationObserver.observe.calledAfter(
          subject.computeCallEndedFontSizeRules
        )
      );
    });
  });
});
