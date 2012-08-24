requireApp('dialer/js/handled_call.js');
requireApp('dialer/shared/js/l10n.js');

requireApp('dialer/test/unit/mock_call.js');
requireApp('dialer/test/unit/mock_contacts.js');
requireApp('dialer/test/unit/mock_call_screen.js');
requireApp('dialer/test/unit/mock_recents_db.js');

// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!this.Contacts) {
  this.Contacts = null;
}
if (!this.RecentsDBManager) {
  this.RecentsDBManager = null;
}
if (!this.CallScreen) {
  this.CallScreen = null;
}

suite('dialer/handled_call', function() {
  var subject;
  var mockCall;
  var fakeNode;

  var realContacts;
  var realRecents;
  var realCallScreen;

  suiteSetup(function() {
    realContacts = window.Contacts;
    window.Contacts = MockContacts;

    realRecents = window.RecentsDBManager;
    window.RecentsDBManager = MockRecentsDBManager;

    realCallScreen = window.CallScreen;
    window.CallScreen = MockCallScreen;
  });

  suiteTeardown(function() {
    window.Contacts = realContacts;
    window.RecentsDBManager = realRecents;
    window.CallScreen = realCallScreen;
  });

  setup(function() {
    fakeNode = document.createElement('section');
    fakeNode.id = 'test';
    fakeNode.innerHTML = [
      '<div class="number">',
      '</div>',
      '<div class="fake-number">',
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

    mockCall = new MockCall('12345', 'dialing');
    subject = new HandledCall(mockCall, fakeNode);
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);

    MockRecentsDBManager.mTearDown();
    MockContacts.mTearDown();
    MockCallScreen.mTearDown();
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

    test('duration', function() {
      assert.ok(subject.durationNode);
      assert.include(subject.durationNode.textContent, '…');
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
  });

  suite('on connect', function() {
    setup(function() {
      mockCall._connect();
    });

    test('show the node', function() {
      assert.isFalse(fakeNode.hidden);
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
  });

  suite('on disconnect', function() {
    setup(function() {
      mockCall._connect();
      mockCall._disconnect();
    });

    test('save recents entry', function() {
      assert.isTrue(MockRecentsDBManager.mCalledInit);
      assert.equal(MockRecentsDBManager.mCalledAdd, subject.recentsEntry);
      assert.isTrue(MockRecentsDBManager.mCalledClose);
    });

    test('remove listener', function() {
      assert.isTrue(mockCall._listenerRemoved);
    });

    test('hide the node', function() {
      assert.isTrue(fakeNode.hidden);
    });

    test('clear the ticker', function() {
      assert.equal(subject._ticker, null);
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
});
