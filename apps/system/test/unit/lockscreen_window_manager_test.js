(function() {
'use strict';

mocha.globals(['LockScreenWindowManager', 'LockScreen', 'LockScreenWindow',
               'addEventListener', 'dispatchEvent', 'lockScreenWindowManager',
               'lockScreen']);

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_lockscreen_window.js');
requireApp('system/js/lockscreen_window_manager.js');

var mocksForLockScreenWindowManager = new window.MocksHelper([
  'LockScreen', 'LockScreenWindow'
]).init();

suite('system/LockScreenWindowManager', function() {
  var stubById;
  var appFake;

  mocksForLockScreenWindowManager.attachTestHelpers();

  setup(function() {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    appFake = new window.LockScreenWindow();
    // To prevent the original one has been
    // initialized in the bootstrap stage.
    //
    // XXX: On Travis the manager would be a empty object,
    // but on local everything is fine. So the second condition
    // is necessary.
    if (window.lockScreenWindowManager &&
        0 !== Object.keys(window.lockScreenWindowManager).length) {
      window.lockScreenWindowManager.stopEventListeners();
      window.lockScreenWindowManager.startEventListeners();
    } else {
      window.lockScreenWindowManager = new window.LockScreenWindowManager();
    }
    // Differs from the existing mock which is expected by other components.
    window.LockScreen = function() {};
  });

  teardown(function() {
    stubById.restore();
  });

  suite('Handle events', function() {
    test('App created', function() {
      window.lockScreenWindowManager.handleEvent(
        { type: 'lockscreen-appcreated',
          detail: appFake });
      assert.equal(
        window.lockScreenWindowManager.states.instance.instanceID,
          appFake.instanceID,
        'the app was not activated');
        window.assert.isObject(window.lockScreenWindowManager
          .states.instance,
        'the app was not registered in the maanger');
      window.lockScreenWindowManager.unregisterApp(appFake);
    });

    test('Initialize when screenchange', function() {
      var originalCreateWindow = window.lockScreenWindowManager.createWindow;
      var stubCreateWindow =
      this.sinon.stub(window.lockScreenWindowManager, 'createWindow',
        function() {
          return originalCreateWindow.bind(this).call();
        });
      window.lockScreenWindowManager.handleEvent(
        { type: 'screenchange',
          detail: { screenEnabled: true } });
      assert.isTrue(stubCreateWindow.called,
          'the manage didn\'t create the singleton window');
      var app = window.lockScreenWindowManager.states.instance;
      if (app) {
        window.lockScreenWindowManager.unregisterApp(app);
      }
      window.lockScreenWindowManager.stopEventListeners();
    });

    test('Open the app when screen is turned on', function() {
      window.lockScreenWindowManager.registerApp(appFake);
      var stubOpen = this.sinon.stub(appFake, 'open');
      window.lockScreenWindowManager.handleEvent(
        { type: 'screenchange',
          detail: { screenEnabled: true } });
      assert.isTrue(stubOpen.called,
        'the manager didn\'t call the app.close when screen off');
      window.lockScreenWindowManager.unregisterApp(appFake);
    });
  });
});

})();
