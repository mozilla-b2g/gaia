/* global MockService */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_service.js');

var mocksForOrientationManager = new MocksHelper([
  'SettingsListener', 'Service'
]).init();

suite('system/OrientationManager >', function() {
  var originalLocked;
  mocksForOrientationManager.attachTestHelpers();
  setup(function(done) {
    MockService.mockQueryWith('locked', false);
    requireApp('system/js/orientation_manager.js', done);
  });

  suite('handle events', function() {
    test('attentionclosed', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'attentionclosed'
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

    test('search window close should trigger reset', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'searchclosing'
      });
      assert.isTrue(stubPublish.calledWith('reset-orientation'));
    });

    test('lockscreen-appclosing', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'lockscreen-appclosing'
      });
      assert.isTrue(stubPublish.calledWith('reset-orientation'));
    });

    test('attention screen hides when lockscreen is active', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      MockService.mockQueryWith('locked', true);
      OrientationManager.handleEvent({
        type: 'attentionclosing'
      });
      assert.isFalse(stubPublish.called);
    });

    test('shrinking-stop', function() {
      var stubPublish = this.sinon.stub(OrientationManager, 'publish');
      OrientationManager.handleEvent({
        type: 'shrinking-stop'
      });

      assert.isTrue(stubPublish.withArgs('reset-orientation').calledOnce);
    });
  });
});
