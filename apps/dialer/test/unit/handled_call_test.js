requireApp('dialer/js/handled_call.js');

requireApp('dialer/test/unit/mock_call.js');
requireApp('dialer/test/unit/mock_contacts.js');
requireApp('dialer/test/unit/mock_call_screen.js');
requireApp('dialer/test/unit/mock_recents.js');

suite('dialer/handled_call', function() {
  var subject;
  var mockCall;
  var fakeNode;

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

    Recents._calledWith = null;
    Contacts._calledWith = null;
    CallScreen._enableKeypadCalled = false;
    CallScreen._syncSpeakerCalled = false;
  });

  suite('initialization', function() {
    test('ticker', function() {
      assert.equal(subject._ticker, null);
    });

    test('picture', function() {
      assert.equal(subject.picture, null);
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
      assert.equal(subject.durationNode.textContent, '...');
    });

    test('direction', function() {
      assert.ok(subject.directionNode);
    });

    test('number', function() {
      assert.ok(subject.numberNode);
      assert.equal(Contacts._calledWith, mockCall.number);
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
      assert.isTrue(CallScreen._enableKeypadCalled);
    });

    test('sync speaker', function() {
      assert.isTrue(CallScreen._syncSpeakerCalled);
    });
  });

  suite('on disconnect', function() {
    setup(function() {
      mockCall._connect();
      mockCall._disconnect();
    });

    test('save recents entry', function() {
      assert.equal(Recents._calledWith, subject.recentsEntry);
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
      CallScreen._syncSpeakerCalled = false;
      mockCall._resume();
    });

    test('remove the css class', function() {
      assert.equal(fakeNode.className, '');
    });

    test('sync speaker', function() {
      assert.isTrue(CallScreen._syncSpeakerCalled);
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
      var savedEntry;

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
