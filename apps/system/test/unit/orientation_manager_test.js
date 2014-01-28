'use strict';

mocha.globals(['OrientationManager', 'SettingsListener', 'lockScreen']);
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_lock_screen.js');

var mocksForOrientationManager = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/OrientationManager >', function() {
  var originalLocked;
  mocksForOrientationManager.attachTestHelpers();
  setup(function(done) {
    window.lockScreen = window.MockLockScreen;
    originalLocked = window.lockScreen.locked;
    window.lockScreen.locked = false;
    requireApp('system/js/orientation_manager.js', done);
    window.lockScreen = MockLockScreen;
  });

  teardown(function() {
    window.lockScreen.locked = originalLocked;
  });

  suite('handle events', function() {
    test('attentionscreenhide', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'attentionscreenhide'
      });
      assert.isTrue(stubPublish.calledWith('reset-orientation'));
    });

    test('status-active', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'status-active'
      });
      assert.isTrue(stubPublish.calledWith('reset-orientation'));
    });

    test('sleepmenuhide', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'sleepmenuhide'
      });
      assert.isTrue(stubPublish.calledWith('reset-orientation'));
    });

    test('trusteduiclose', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'trusteduiclose'
      });
      assert.isTrue(stubPublish.calledWith('reset-orientation'));
    });

    test('will-unlock', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'will-unlock'
      });
      assert.isTrue(stubPublish.calledWith('reset-orientation'));
    });

    test('attention screen hides when lockscreen is active', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      window.lockScreen.locked = true;
      OrientationManager.handleEvent({
        type: 'attentionscreenhide'
      });
      assert.isFalse(stubPublish.called);
    });
  });
});
