'use strict';

requireApp('communications/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_call_screen.js');
requireApp('communications/dialer/test/unit/mock_calls_handler.js');
requireApp('communications/dialer/test/unit/mock_keypad.js');
requireApp('communications/dialer/test/unit/mock_utils.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');
requireApp('communications/dialer/test/unit/mock_call.js');

requireApp('communications/dialer/js/handled_call.js');
requireApp('communications/dialer/js/voicemail.js');


var mocksHelperForHandledCall = new MocksHelper([
  'Contacts',
  'CallScreen',
  'CallsHandler',
  'KeypadManager',
  'Utils',
  'LazyL10n'
]).init();

suite('dialer/handled_call', function() {
  var realNavigatorSettings;

  const VOICEMAIL_NUMBER = '123';
  var subject;
  var mockCall;

  var templates;

  var phoneNumber;

  mocksHelperForHandledCall.attachTestHelpers();

  suiteSetup(function() {
    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

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
                              '<div class="direction">' +
                                '<div></div>' +
                              '</div>' +
                            '<button class="merge-button"></button>' +
                            '</div>' +
                          '</section>';
    document.body.appendChild(templates);
  });

  suiteTeardown(function() {
    templates.parentNode.removeChild(templates);
    Voicemail.check.restore();
    navigator.mozSettings = realNavigatorSettings;
  });

  setup(function() {
    mockCall = new MockCall(String(phoneNumber), 'dialing');
    subject = new HandledCall(mockCall);

    document.body.appendChild(subject.node);
  });

  teardown(function() {
    var node = subject.node;
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  });

  suite('initialization', function() {
    test('ticker', function() {
      assert.equal(subject._ticker, null);
    });

    test('photo', function() {
      assert.equal(subject.photo, MockContacts.mPhoto);
    });

    test('call', function() {
      assert.equal(subject.call, mockCall);
    });

    test('call event listener', function() {
      assert.isTrue(mockCall._listenerAdded);
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
      assert.equal(MockContacts.mCalledWith, mockCall.number);
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
      assert.ok(subject._ticker);
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
      MockCallScreen.turnSpeakerOn();
    });

    suite('from a regular call', function() {
      setup(function() {
        mockCall._disconnect();
      });
      test('should save the recents entry', function() {
        assert.equal(subject.recentsEntry, MockCallsHandler.mLastEntryAdded);
      });

      test('should remove listener on the call', function() {
        assert.isTrue(mockCall._listenerRemoved);
      });

      test('should keep the call', function() {
        assert.ok(subject.call);
      });

      test('should nullify the photo', function() {
        assert.isNull(subject.photo);
      });

      test('should clear the ticker', function() {
        assert.equal(subject._ticker, null);
      });

      test('should remove the node from the dom', function() {
        assert.isNull(node.parentNode);
      });

      test('should nullify the node', function() {
        assert.isNull(subject.node);
      });
      test('it does not show the banner', function() {
        assert.isFalse(MockCallScreen.mShowStatusMessageCalled);
      });
    });

    suite('from a group', function() {
      setup(function() {
        mockCall.group = null;
        mockCall.ongroupchange(mockCall);
        mockCall._disconnect();
      });
      test('show the banner', function() {
        assert.isTrue(MockCallScreen.mShowStatusMessageCalled);
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
      MockCallScreen.mSyncSpeakerCalled = false;
      MockCallsHandler.mUpdateKeypadEnabledCalled = false;
      mockCall._resume();
    });

    test('remove the css class', function() {
      assert.isFalse(subject.node.classList.contains('held'));
    });

    test('enable keypad', function() {
      assert.equal(MockCallsHandler.mUpdateKeypadEnabledCalled, true);
    });

    test('sync speaker', function() {
      assert.isTrue(MockCallScreen.mSyncSpeakerCalled);
    });
  });

  suite('call direction', function() {
    test('before connexion', function() {
      assert.isTrue(subject.node.classList.contains('outgoing'));
    });

    test('after connexion', function() {
      mockCall._connect();
      assert.isTrue(subject.node.classList.contains('ongoing'));
      assert.isTrue(subject.node.classList.contains('outgoing'));
    });

    suite('incoming call', function() {
      setup(function() {
        mockCall = new MockCall('888', 'incoming');
        subject = new HandledCall(mockCall);
      });

      test('before connexion', function() {
        assert.isTrue(subject.node.classList.contains('incoming'));
      });

      test('after connexion', function() {
        mockCall._connect();
        assert.isTrue(subject.node.classList.contains('ongoing'));
        assert.isTrue(subject.node.classList.contains('incoming'));
      });
    });
  });

  suite('recents entry', function() {
    test('date', function() {
      assert.ok(subject.recentsEntry.date);
    });

    test('number', function() {
      assert.equal(subject.recentsEntry.number, mockCall.number);
    });

    suite('type incoming', function() {
      setup(function() {
        mockCall = new MockCall('888', 'incoming');
        subject = new HandledCall(mockCall);
      });

      test('type', function() {
        assert.equal(subject.recentsEntry.type, 'incoming');
      });

      test('type after connexion', function() {
        mockCall._connect();
        assert.equal(subject.recentsEntry.type, 'incoming');
        assert.equal(subject.recentsEntry.status, 'connected');
      });

      test('type after refusal', function() {
        mockCall._disconnect();
        assert.equal(subject.recentsEntry.type, 'incoming');
        assert.equal(subject.recentsEntry.status, null);
      });

      test('type after disconnexion', function() {
        mockCall._connect();
        mockCall._disconnect();
        assert.equal(subject.recentsEntry.type, 'incoming');
        assert.equal(subject.recentsEntry.status, 'connected');
      });
    });

    suite('type outgoing', function() {
      setup(function() {
        mockCall = new MockCall('888', 'dialing');
        subject = new HandledCall(mockCall);
      });

      test('type', function() {
        assert.equal(subject.recentsEntry.type, 'dialing');
      });

      test('type after connexion', function() {
        mockCall._connect();
        assert.equal(subject.recentsEntry.type, 'dialing');
        assert.equal(subject.recentsEntry.status, null);
      });

      test('type after refusal', function() {
        mockCall._disconnect();
        assert.equal(subject.recentsEntry.type, 'dialing');
        assert.equal(subject.recentsEntry.status, null);
      });

      test('type after disconnexion', function() {
        mockCall._connect();
        mockCall._disconnect();
        assert.equal(subject.recentsEntry.type, 'dialing');
        assert.equal(subject.recentsEntry.status, null);
      });
    });

    suite('without contact info', function() {
      // Calling '111' means we won't find a contact with that number
      // Check out mock_contacts.js for details
      var contactInfo;
      setup(function() {
        mockCall = new MockCall('111', 'incoming');
        subject = new HandledCall(mockCall);
        mockCall._disconnect();
      });

      test('contactInfo', function() {
        contactInfo = subject.recentsEntry.contactInfo;
        assert.equal(contactInfo, null);
      });
    });

    suite('with more than 1 contact', function() {
      // Calling '222' means we will find more than 1 contact with that number
      // Check out mock_contacts.js for details
      var contactInfo;
      setup(function() {
        mockCall = new MockCall('222', 'incoming');
        subject = new HandledCall(mockCall);
        mockCall._disconnect();
      });

      test('contactInfo', function() {
        contactInfo = subject.recentsEntry.contactInfo;
        assert.ok(contactInfo);
      });

      test('contactsWithSameNumber', function() {
        assert.equal(contactInfo.contactsWithSameNumber, 2);
      });

      test('matchingTel', function() {
        var tel = {
          value: MockContacts.mCalledWith,
          carrier: MockContacts.mCarrier,
          type: MockContacts.mType
        };

        assert.ok(contactInfo.matchingTel);
        assert.equal(contactInfo.matchingTel.value, tel.value);
        assert.equal(contactInfo.matchingTel.carrier, tel.carrier);
        assert.equal(contactInfo.matchingTel.type, tel.type);
      });

      test('contact', function() {
        assert.ok(contactInfo.contact);
        var contact = contactInfo.contact;
        assert.equal(contact.name, MockContacts.mName);
        assert.equal(contact.photo, MockContacts.mPhoto);
        assert.equal(contact.tel.length, 1);
        assert.equal(contact.tel[0].value, MockContacts.mCalledWith);
        assert.equal(contact.tel[0].carrier, MockContacts.mCarrier);
        assert.equal(contact.tel[0].type, MockContacts.mType);
      });
    });

    suite('contact info', function() {
      var contactInfo;
      setup(function() {
        mockCall = new MockCall('888', 'incoming');
        subject = new HandledCall(mockCall);
        mockCall._disconnect();
      });

      test('contactInfo', function() {
        contactInfo = subject.recentsEntry.contactInfo;
        assert.ok(contactInfo);
      });

      test('contactsWithSameNumber', function() {
        assert.equal(contactInfo.contactsWithSameNumber, 0);
      });

      test('matchingTel', function() {
        var tel = {
          value: MockContacts.mCalledWith,
          carrier: MockContacts.mCarrier,
          type: MockContacts.mType
        };

        assert.ok(contactInfo.matchingTel);
        assert.equal(contactInfo.matchingTel.value, tel.value);
        assert.equal(contactInfo.matchingTel.carrier, tel.carrier);
        assert.equal(contactInfo.matchingTel.type, tel.type);
      });

      test('contact', function() {
        assert.ok(contactInfo.contact);
        var contact = contactInfo.contact;
        assert.equal(contact.name, MockContacts.mName);
        assert.equal(contact.photo, MockContacts.mPhoto);
        assert.equal(contact.tel.length, 1);
        assert.equal(contact.tel[0].value, MockContacts.mCalledWith);
        assert.equal(contact.tel[0].carrier, MockContacts.mCarrier);
        assert.equal(contact.tel[0].type, MockContacts.mType);
      });
    });

    suite('emergency calls', function() {
      test('is emergency call', function() {
        mockCall = new MockCall('112', 'dialing');
        subject = new HandledCall(mockCall);
        mockCall._disconnect();
        assert.isTrue(subject.recentsEntry.emergency);
      });

      test('is not emergency call', function() {
        mockCall = new MockCall('111', 'dialing');
        subject = new HandledCall(mockCall);
        mockCall._disconnect();
        assert.isFalse(subject.recentsEntry.emergency);
      });
    });

    suite('voicemail calls', function() {
      test('is voicemail call', function() {
        mockCall = new MockCall('123', 'dialing');
        subject = new HandledCall(mockCall);
        assert.isTrue(subject.recentsEntry.voicemail);
      });

      test('is not voicemail call', function() {
        mockCall = new MockCall('111', 'dialing');
        subject = new HandledCall(mockCall);
        assert.isFalse(subject.recentsEntry.voicemail);
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
    mockCall.secondNumber = '999';
    subject.updateCallNumber();

    assert.equal(subject.numberNode.textContent, 'switch-calls');
  });

  test('should display emergency number label', function() {
    mockCall = new MockCall('112', 'dialing');
    mockCall.emergency = true;
    subject = new HandledCall(mockCall);

    assert.equal(subject.numberNode.textContent, 'emergencyNumber');
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
      mockCall.secondNumber = '999';
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
    test('formatPhoneNumber in status bar mode should reset the fontsize',
    function() {
      MockCallScreen.mInStatusBarMode = true;
      subject.numberNode.style.fontSize = '36px';
      subject.formatPhoneNumber();
      assert.equal(subject.numberNode.style.fontSize, '');
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
      assert.equal(subject.numberNode.textContent, 'emergencyNumber');
    });
  });

  suite('explicit visibility', function() {
    test('calling show should show the node', function() {
      subject.node.hidden = true;
      subject.show();
      assert.isFalse(subject.node.hidden);
    });

    test('calling hide should hide the node', function() {
      subject.node.hidden = false;
      subject.hide();
      assert.isTrue(subject.node.hidden);
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
    });

    test('when leaving a group, it should ask the CallScreen to move back',
    function() {
      mockCall.group = null;
      mockCall.ongroupchange(mockCall);
      assert.isTrue(insertCallSpy.calledWith(subject.node));
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
    var addEventListenerSpy;

    test('should listen for click', function() {
      var mergeActiveCallWithSpy = this.sinon.spy(CallsHandler,
                                                  'mergeActiveCallWith');
      subject.mergeButton.onclick();
      assert.isTrue(mergeActiveCallWithSpy.calledWith(subject.call));
    });
  });
});
