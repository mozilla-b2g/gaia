'use strict';
/* global MocksHelper, SuspendingAppPriorityManager, MockStackManager,
  AppWindow */

mocha.globals(['AppWindow', 'SuspendingAppPriorityManager',
  'StackManager']);

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/js/system.js');

var mocksForSuspendingAppPriorityManager = new MocksHelper([
  'AppWindow', 'StackManager'
]).init();

suite('system/AppWindowManager', function() {
  function generateApps(count) {
    var apps = [];
    for (var i = 0; i < count; i++) {
      apps.push(new AppWindow({
        origin: 'fake.origin' + i,
        manifestURL: 'fake.origin' + i + '/manifest.webapp',
        name: 'fake app ' + i,
        suspended: false
      }));
    }

    return apps;
  }
  mocksForSuspendingAppPriorityManager.attachTestHelpers();

  setup(function(done) {
    requireApp('system/js/suspending_app_priority_manager.js', done);
  });

  teardown(function() {
  });

  test('increasing zombie count', function() {
    var sapm = new SuspendingAppPriorityManager();
    sapm.suspendedCount = 10;
    var count = sapm.suspendedCount;
    var spy = this.sinon.stub(sapm, '_handleSuspendingAppCountChanged');
    sapm.handleEvent({
      type: 'appsuspended'
    });
    assert.equal(count + 1, sapm.suspendedCount);
    assert.isTrue(spy.called);
  });

  test('decreasing zombie count', function() {
    var sapm = new SuspendingAppPriorityManager();
    sapm.suspendedCount = 10;
    var count = sapm.suspendedCount;
    count = 10;
    sapm.handleEvent({
      type: 'appresumed'
    });
    assert.equal(count - 1, sapm.suspendedCount);
  });

  test('purge the zombie when there are too many.', function() {
    var apps = generateApps(10);
    MockStackManager._stack = apps;
    MockStackManager._current = 0;
    apps[3].suspended = true;
    MockStackManager._current = 1;
    var stubKill = this.sinon.stub(apps[3], 'kill');

    var sapm = new SuspendingAppPriorityManager();
    sapm.suspendedCount = sapm.MAXIMUM_SUSPENDED_COUNT + 2;
    sapm._handleSuspendingAppCountChanged();
    assert.isTrue(stubKill.called);
  });
});
