'use strict';

mocha.globals(['OrientationManager', 'SettingsListener']);
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForOrientationManager = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/OrientationManager >', function() {
  mocksForOrientationManager.attachTestHelpers();
  setup(function(done) {
    requireApp('system/js/orientation_manager.js', done);
  });

  teardown(function() {
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
  });
});
