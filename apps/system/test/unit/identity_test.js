requireApp('system/js/identity.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');

// ensure its defined as a global so mocha will not complain about us
// leaking new global variables during the test
if (!window.TrustedUIManager) {
  window.TrustedUIManager = true;
}

suite('identity', function() {
  var subject;
  var realTrustedUIManager;
  var realDispatchEvent;

  var lastDispatchedEvent = null;

  suiteSetup(function() {
    subject = Identity;
    realTrustedUIManager = window.TrustedUIManager;
    window.TrustedUIManager = MockTrustedUIManager;

    realDispatchEvent = subject._dispatchEvent;
    subject._dispatchEvent = function (obj) {
      lastDispatchedEvent = obj;
    };
  });

  suiteTeardown(function() {
    window.TrustedUIManager = realTrustedUIManager;
    subject._dispatchEvent = realDispatchEvent;
  });

  setup(function() {});

  teardown(function() {
    MockTrustedUIManager.mTeardown();
  });

  suite('open popup', function() {
    setup(function() {
      var event = new MockChromeEvent({
        type: 'open-id-dialog',
        id: 'test-open-event-id',
        showUI: true
      });
      subject.handleEvent(event);
    });

    test('popup parameters', function() {
      assert.equal(true, MockTrustedUIManager.mOpened);
      assert.equal('IdentityFlow', MockTrustedUIManager.mName);
      assert.equal('https://b2g.personatest.org/sign_in#NATIVE', MockTrustedUIManager.mOrigin);
      assert.equal(MockTrustedUIManager.mOrigin, MockTrustedUIManager.mFrame.src);
    });

    test('frame event listener', function() {
      var frame = MockTrustedUIManager.mFrame;
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozbrowserloadstart', true, true, {target: frame});
      frame.dispatchEvent(event);

      assert.equal(frame, lastDispatchedEvent.frame);
      assert.equal('test-open-event-id', lastDispatchedEvent.id);
    });
  });

  suite('close popup', function() {
    setup(function() {
      var event = new MockChromeEvent({
        type: 'received-id-assertion',
        id: 'test-close-event-id',
        showUI: true
      });
      subject.handleEvent(event);
    });

    test('close', function() {
      assert.equal(false, MockTrustedUIManager.mOpened);
      assert.equal('test-close-event-id', lastDispatchedEvent.id);
    });
  });
});

