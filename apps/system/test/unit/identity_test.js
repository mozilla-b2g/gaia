'use strict';

requireApp('system/js/identity.js');
requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_l10n.js');

// ensure its defined as a global so mocha will not complain about us
// leaking new global variables during the test
if (!window.TrustedUIManager) {
  window.TrustedUIManager = true;
}

suite('identity', function() {
  var subject;
  var realL10n;
  var realTrustedUIManager;
  var realDispatchEvent;

  var lastDispatchedEvent = null;

  suiteSetup(function() {
    subject = Identity;
    realTrustedUIManager = window.TrustedUIManager;
    window.TrustedUIManager = MockTrustedUIManager;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realDispatchEvent = subject._dispatchEvent;
    subject._dispatchEvent = function(obj) {
      lastDispatchedEvent = obj;
    };
  });

  suiteTeardown(function() {
    window.TrustedUIManager = realTrustedUIManager;
    subject._dispatchEvent = realDispatchEvent;

    navigator.mozL10n = realL10n;
  });

  setup(function() {});

  teardown(function() {
    MockTrustedUIManager.mTeardown();
  });

  suite('open popup', function() {
    setup(function() {
      var event = new MockChromeEvent({
        type: 'id-dialog-open',
        id: 'test-open-event-id',
        showUI: true
      });
      subject.handleEvent(event);
    });

    test('popup parameters', function() {
      assert.equal(MockTrustedUIManager.mOpened, true);
      assert.equal(MockTrustedUIManager.mName, 'persona-signin');
      assert.equal(MockTrustedUIManager.mChromeEventId, 'test-open-event-id');
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
        type: 'id-dialog-done',
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

  suite('close iframe', function() {
    setup(function() {
      var event = new MockChromeEvent({
        type: 'id-dialog-close-iframe',
          id: 'test-close-iframe-id'
      });
      subject.handleEvent(event);
    });

    test('close iframe', function() {
      assert.equal(false, MockTrustedUIManager.mOpened);
      assert.equal('test-close-event-id', lastDispatchedEvent.id);
    });
  });
});

