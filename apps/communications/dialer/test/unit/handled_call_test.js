requireApp('communications/dialer/js/handled_call.js');

requireApp('communications/dialer/test/unit/mock_keypad.js');
requireApp('communications/dialer/test/unit/mock_call.js');
requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_call_screen.js');
requireApp('communications/dialer/test/unit/mock_call_handler.js');
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
  });

  suiteTeardown(function() {
    window.Contacts = realContacts;
    window.CallScreen = realCallScreen;
    window.OnCallHandler = realCallHandler;
    window.KeypadManager = realKeypadManager;
    window.LazyL10n = realLazyL10n;
    window.Utils = realUtils;
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

    test('mute off after call', function() {
      assert.isFalse(MockCallScreen.mMuteOn);
    });

    test('speaker off after call', function() {
      assert.isFalse(MockCallScreen.mSpeakerOn);
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

  suite('holding', function() {
    setup(function() {
      mockCall._hold();
    });

    test('add the css class', function() {
      assert.equal(fakeNode.className, 'held');
    });
  });

  suite('resuming', function() {
    setup(function() {
      MockCallScreen.mSyncSpeakerCalled = false;
      mockCall._resume();
    });

    test('remove the css class', function() {
      assert.equal(fakeNode.className, '');
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

    suite('type', function() {
      setup(function() {
        mockCall = new MockCall('888', 'incoming');
        subject = new HandledCall(mockCall, fakeNode);
      });

      test('type', function() {
        assert.equal(subject.recentsEntry.type, 'incoming');
      });

      test('type after connexion', function() {
        mockCall._connect();
        assert.equal(subject.recentsEntry.type, 'incoming-connected');
      });

      test('type after refusal', function() {
        mockCall._disconnect();
        assert.equal(subject.recentsEntry.type, 'incoming-refused');
      });

      test('type after disconnexion', function() {
        mockCall._connect();
        mockCall._disconnect();
        assert.equal(subject.recentsEntry.type, 'incoming-connected');
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
      assert.equal(subject.recentsEntry.type, 'incoming-refused');
    });

    test('show should do nothing', function() {
      subject.show(); // will trigger a js error if failing
    });

    test('hide should do nothing', function() {
      subject.hide(); // will trigger a js error if failing
    });
  });

  test('should display unknown l10n key', function() {
    mockCall = new MockCall('', 'incoming');
    subject = new HandledCall(mockCall, fakeNode);

    var numberNode = fakeNode.querySelector('.numberWrapper .number');
    assert.equal(numberNode.textContent, 'unknown');
  });

  suite('additional information', function() {
    test('check additional info updated', function() {
      mockCall = new MockCall('888', 'incoming');
      subject = new HandledCall(mockCall, fakeNode);

      assert.isTrue(MockKeypadManager.mUpdateAdditionalContactInfo);
    });

    test('check without additional info', function() {
      mockCall = new MockCall('999', 'incoming');
      subject = new HandledCall(mockCall, fakeNode);

      var additionalInfoNode = fakeNode.querySelector('.additionalContactInfo');
      assert.equal('', additionalInfoNode.textContent);
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
