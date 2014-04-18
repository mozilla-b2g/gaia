(function() {
'use strict';

mocha.globals(['LockScreenWindowManager', 'LockScreen', 'LockScreenWindow',
               'addEventListener', 'dispatchEvent', 'lockScreenWindowManager',
               'lockScreen', 'SettingsListener']);

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
  var originalSettingsListener;

  mocksForLockScreenWindowManager.attachTestHelpers();

  setup(function() {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    appFake = new window.LockScreenWindow();

    originalSettingsListener = window.SettingsListener;
    window.SettingsListener = {
      observe: function(name, bool, cb) {},
      getSettingsLock: function() {
        return {get: function(name) {
          if ('lockscreen.enabled' === name) {
            return true;
          }
        }};
      }
    };
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
    window.SettingsListener = originalSettingsListener;
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

    test('Screenchange by proximity sensor, should not open the LockScreen app',
    function() {
      var stubOpenApp = this.sinon.stub(window.lockScreenWindowManager,
        'openApp');
      window.lockScreenWindowManager.handleEvent(
        {
          type: 'screenchange',
          detail: { screenEnabled: true,
                    screenOffBy: 'proximity'
          }
        });
      assert.isFalse(stubOpenApp.called,
        'the manager still open the LockScreen app even the ' +
        'screenchange was caused by proximity sensor');
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

    test('When FTU occurs, the window should not be instantiated', function() {
      var stubOpenApp = this.sinon.stub(window.lockScreenWindowManager,
        'openApp');
      window.lockScreenWindowManager.handleEvent( { type: 'ftuopen' } );
      window.lockScreenWindowManager.handleEvent(
        { type: 'screenchange',
          detail: { screenEnabled: true } });
      assert.isFalse(stubOpenApp.called,
        'the LockScreenWindow still be instantiated while the FTU is opened');
    });

    test('But after FTU done, the window should be instantiated', function() {
      var stubOpenApp = this.sinon.stub(window.lockScreenWindowManager,
        'openApp');
      window.lockScreenWindowManager.handleEvent( { type: 'ftuopen' } );
      window.lockScreenWindowManager.handleEvent( { type: 'ftudone' } );
      window.lockScreenWindowManager.handleEvent(
        { type: 'screenchange',
          detail: { screenEnabled: true } });
      assert.isTrue(stubOpenApp.called,
        'the LockScreenWindow is not instantiated after the FTU was closed.');
    });

    test('Send lockscreen window to background while overlay is there.',
      function() {
        var app = new window.MockLockScreenWindow();
        this.sinon.stub(app, 'isActive').returns(true);
        window.lockScreenWindowManager.states.instance = app;
        var stubSetVisible = this.sinon.stub(app, 'setVisible');
        window.lockScreenWindowManager.handleEvent( { type: 'overlaystart' } );
        assert.isTrue(stubSetVisible.calledWith(false));
      });

    test('Send lockscreen window to foreground.', function() {
      var app = new window.MockLockScreenWindow();
      this.sinon.stub(app, 'isActive').returns(true);
      window.lockScreenWindowManager.states.instance = app;
      var stubSetVisible = this.sinon.stub(app, 'setVisible');
      window.lockScreenWindowManager.handleEvent({
        type: 'showlockscreenwindow'
      });
      assert.isTrue(stubSetVisible.calledWith(true));
    });
  });
});

})();
