requireApp('communications/dialer/js/handled_call.js');
requireApp('communications/dialer/js/voicemail.js');

requireApp('communications/dialer/test/unit/mock_keypad.js');
requireApp('communications/dialer/test/unit/mock_call.js');
requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_call_screen.js');
requireApp('communications/dialer/test/unit/mock_on_call.js');
requireApp('communications/dialer/test/unit/mock_utils.js');

// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!this.Contacts) {
  this.Contacts = null;
}
if (!this.CallScreen) {
  this.CallScreen = null;
}
if (!this.OnCallHandler) {
  this.OnCallHandler = null;
}
if (!this.KeypadManager) {
  this.KeypadManager = null;
}
if (!this.Utils) {
  this.Utils = null;
}
if (!this.LazyL10n) {
  this.LazyL10n = null;
}

suite('dialer/handled_call', function() {
  const VOICEMAIL_NUMBER = '123';
  var subject;
  var mockCall;
  var fakeNode;

  var realContacts;
  var realCallScreen;
  var realCallHandler;
  var realKeypadManager;
  var realLazyL10n;
  var realUtils;
  var phoneNumber;

  suiteSetup(function() {
    realContacts = window.Contacts;
    window.Contacts = MockContacts;

    realCallScreen = window.CallScreen;
    window.CallScreen = MockCallScreen;

    realCallHandler = window.OnCallHandler;
    window.OnCallHandler = MockOnCallHandler;

    realKeypadManager = window.KeypadManager;
    window.KeypadManager = MockKeypadManager;

    realLazyL10n = LazyL10n;
    window.LazyL10n = {
      get: function get(cb) {
        cb(function l10n_get(key) {
          return key;
        });
      }
    };

    realUtils = window.Utils;
    window.Utils = MockUtils;

    phoneNumber = Math.floor(Math.random() * 10000);

    sinon.stub(Voicemail, 'check', function(number, callback) {
      var isVoicemailNumber = false;
      if (number === VOICEMAIL_NUMBER) {
        isVoicemailNumber = true;
      }
      callback(isVoicemailNumber);
    });
  });

  suiteTeardown(function() {
    window.Contacts = realContacts;
    window.CallScreen = realCallScreen;
    window.OnCallHandler = realCallHandler;
    window.KeypadManager = realKeypadManager;
    window.LazyL10n = realLazyL10n;
    window.Utils = realUtils;
    Voicemail.check.restore();
  });

  setup(function() {
    fakeNode = document.createElement('section');
    fakeNode.id = 'test';
    fakeNode.innerHTML = [
      '<div class="numberWrapper">',
        '<div class="number"></div>',
      '</div>',
      '<div class="numberWrapper">',
        '<div class="number">',
        '</div>',
      '</div>',
      '<div class="fake-number">',
      '</div>',
      '<div class="additionalContactInfo">',
      '</div>',
      '<div class="duration">',
        '<span></span>',
        '<div class="direction">',
          '<div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(fakeNode);

    mockCall = new MockCall(String(phoneNumber), 'dialing');
    subject = new HandledCall(mockCall, fakeNode);
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);

    MockContacts.mTearDown();
    MockCallScreen.mTearDown();
    MockOnCallHandler.mTeardown();
    MockKeypadManager.mTearDown();
    MockUtils.mTearDown();
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

    test('node', function() {
      assert.equal(subject.node, fakeNode);
    });

    test('duration outgoing', function() {
      assert.ok(subject.durationChildNode);
      assert.equal(subject.durationChildNode.textContent, 'connecting');
    });

    test('duration incoming', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall, fakeNode);

      assert.ok(subject.durationChildNode);
      assert.equal(subject.durationChildNode.textContent, 'incoming');
    });

    test('direction', function() {
      assert.ok(subject.directionNode);
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
      subject = new HandledCall(mockCall, fakeNode);

      assert.isTrue(MockCallScreen.mEnableKeypadCalled);
      assert.isFalse(fakeNode.hidden);
      assert.equal(subject.directionNode.className,
                   'direction outgoing ongoing-out');
    });

    test('occupied', function() {
      assert.equal(fakeNode.dataset.occupied, 'true');
    });
  });

  suite('on connect', function() {
    setup(function() {
      mockCall._connect();
    });

    test('show the node', function() {
      assert.isFalse(fakeNode.hidden);
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
    setup(function() {
      mockCall._connect();
      MockCallScreen.mute();
      MockCallScreen.turnSpeakerOn();
      mockCall._disconnect();
    });

    test('save recents entry', function() {
      assert.equal(subject.recentsEntry, MockOnCallHandler.mLastEntryAdded);
    });

    test('remove listener', function() {
      assert.isTrue(mockCall._listenerRemoved);
    });

    test('clear the ticker', function() {
      assert.equal(subject._ticker, null);
    });

    test('occupied', function() {
      assert.equal(fakeNode.dataset.occupied, 'false');
    });
  });

  suite('busy', function() {
    setup(function() {
      mockCall._busy();
    });

    test('playing busy tone', function() {
      assert.isTrue(MockOnCallHandler.mNotifyBusyLineCalled);
    });
  });


  suite('holding', function() {
    setup(function() {
      mockCall._hold();
    });

    test('disable keypad', function() {
      assert.equal(MockOnCallHandler.mUpdateKeypadEnabledCalled, false);
    });

    test('add the css class', function() {
      assert.equal(fakeNode.className, 'held');
    });
  });

  suite('resuming', function() {
    setup(function() {
      MockCallScreen.mSyncSpeakerCalled = false;
      MockOnCallHandler.mUpdateKeypadEnabledCalled = false;
      mockCall._resume();
    });

    test('remove the css class', function() {
      assert.equal(fakeNode.className, '');
    });

    test('enable keypad', function() {
      assert.equal(MockOnCallHandler.mUpdateKeypadEnabledCalled, true);
    });

    test('sync speaker', function() {
      assert.isTrue(MockCallScreen.mSyncSpeakerCalled);
    });
  });

  suite('call direction', function() {
    test('before connexion', function() {
      assert.equal(subject.directionNode.className,
                   'direction outgoing');
    });

    test('after connexion', function() {
      mockCall._connect();
      assert.equal(subject.directionNode.className,
                   'direction outgoing ongoing-out');
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
        subject = new HandledCall(mockCall, fakeNode);
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
        subject = new HandledCall(mockCall, fakeNode);
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
        subject = new HandledCall(mockCall, fakeNode);
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
        subject = new HandledCall(mockCall, fakeNode);
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
        subject = new HandledCall(mockCall, fakeNode);
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
  });

  suite('without node', function() {
    setup(function() {
      mockCall = new MockCall('12345', 'incoming');
      subject = new HandledCall(mockCall);
    });

    test('call event listener', function() {
      assert.isTrue(mockCall._listenerAdded);
    });

    test('no node', function() {
      assert.typeOf(subject.node, 'undefined');
    });

    test('recents entry after refusal', function() {
      mockCall._disconnect();
      assert.equal(subject.recentsEntry.type, 'incoming');
      assert.equal(subject.recentsEntry.status, null);
    });

    test('show should do nothing', function() {
      subject.show(); // will trigger a js error if failing
    });

    test('hide should do nothing', function() {
      subject.hide(); // will trigger a js error if failing
    });
  });

  test('should display contact name', function() {
    mockCall = new MockCall('888', 'incoming');
    subject = new HandledCall(mockCall, fakeNode);

    var numberNode = fakeNode.querySelector('.numberWrapper .number');
    assert.equal(numberNode.textContent, 'test name');
  });

  test('should display withheld-number l10n key', function() {
    mockCall = new MockCall('', 'incoming');
    subject = new HandledCall(mockCall, fakeNode);

    var numberNode = fakeNode.querySelector('.numberWrapper .number');
    assert.equal(numberNode.textContent, 'withheld-number');
  });

  test('should display emergency number label', function() {
    mockCall = new MockCall('112', 'dialing');
    mockCall.emergency = true;
    subject = new HandledCall(mockCall, fakeNode);

    var numberNode = fakeNode.querySelector('.numberWrapper .number');
    assert.equal(numberNode.textContent, 'emergencyNumber');
  });

  test('should display voicemail label', function() {
    mockCall = new MockCall('123', 'dialing');
    subject = new HandledCall(mockCall, fakeNode);

    var numberNode = fakeNode.querySelector('.numberWrapper .number');
    assert.equal(numberNode.textContent, 'voiceMail');
  });

  suite('additional information', function() {
    var additionalInfoNode;

    setup(function() {
      additionalInfoNode = fakeNode.querySelector('.additionalContactInfo');
    });

    test('check additional info updated', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall, fakeNode);
      assert.equal(additionalInfoNode.textContent, '888');
    });

    test('check without additional info', function() {
      mockCall = new MockCall('999', 'incoming');
      subject = new HandledCall(mockCall, fakeNode);
      assert.equal('', additionalInfoNode.textContent);
    });

    test('check replace additional info', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall, fakeNode);
      subject.replaceAdditionalContactInfo('test additional info');
      assert.equal(additionalInfoNode.textContent, 'test additional info');
    });

    test('check restore additional info', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall, fakeNode);
      subject.replaceAdditionalContactInfo('test additional info');
      subject.restoreAdditionalContactInfo();
      assert.equal(additionalInfoNode.textContent, '888');
    });
  });

  suite('phone number', function() {
    var numberNode;

    setup(function() {
      numberNode = fakeNode.querySelector('.numberWrapper .number');
    });

    test('check replace number', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall, fakeNode);

      subject.replacePhoneNumber('12345678');
      assert.equal(numberNode.textContent, '12345678');
    });

    test('check restore number', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall, fakeNode);

      subject.replacePhoneNumber('12345678');
      subject.restorePhoneNumber();
      assert.equal(numberNode.textContent, 'test name');
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
  });
});
