'use strict';

mocha.globals(['OrientationManager', 'SettingsListener', 'System']);
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_system.js');

var mocksForOrientationManager = new MocksHelper([
  'System', 'SettingsListener'
]).init();

suite('system/OrientationManager >', function() {
  var originalLocked;
  mocksForOrientationManager.attachTestHelpers();
  setup(function(done) {
    originalLocked = window.System.locked;
    window.System.locked = false;
    requireApp('system/js/orientation_manager.js', done);
  });

  teardown(function() {
    window.System.locked = originalLocked;
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
      window.System.locked = true;
      OrientationManager.handleEvent({
        type: 'attentionscreenhide'
      });
      assert.isFalse(stubPublish.called);
    });

    test('shrinking-stop', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'shrinking-stop'
      });
      assert.isTrue(stubPublish.calledWith('reset-orientation'));
    });
  });
});
