/* global Service */

(function() {
'use strict';

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_lockscreen_window.js');
requireApp('system/js/lockscreen_window_manager.js');

var mocksForLockScreenWindowManager = new window.MocksHelper([
  'LockScreen', 'LockScreenWindow', 'Service'
]).init();

suite('system/LockScreenWindowManager', function() {
  var subject;
  var stubById;
  var appFake;
  var originalSettingsListener;
  var originalMozActivity;
  var originalMozSettings;

  mocksForLockScreenWindowManager.attachTestHelpers();

  setup(function() {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    appFake = new window.LockScreenWindow();

    originalSettingsListener = window.SettingsListener;
    originalMozActivity = window.MozActivity;
    window.SettingsListener = {
      observe: function(name, bool, cb) {},
      getSettingsLock: function() {
        return {
          get: function(name) {
            if ('lockscreen.enabled' === name) {
              return true;
            }
          },
          set: function() {}
        };
      }
    };
    window.MozActivity = function() {};

    originalMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = window.MockNavigatorSettings;

  });

  teardown(function() {
    window.SettingsListener = originalSettingsListener;
    window.MozActivity = originalMozActivity;
    window.navigator.mozSettings = originalMozSettings;
    window.MockNavigatorSettings.mTeardown();
    stubById.restore();
  });

  suite('Methods', function() {
    test('_fetchFTUStatus', function(done) {
      var method = window.LockScreenWindowManager.prototype._fetchFTUStatus;
      var stubEnabled = null;
      var stubFTUManifestUrl = 'fakeurl';
      var originalAsyncStorage = window.asyncStorage;
      window.asyncStorage = {
        getItem(key, cb) {
          return cb(stubEnabled);
        }
      };
      var originalMozSettings = window.navigator.mozSettings;
      window.navigator.mozSettings = {
        createLock() {
          return { get() { return stubFTUManifestUrl; } };
        }
      };
      var clearup = function() {
        window.asyncStorage = originalAsyncStorage;
        window.navigator.mozSettings = originalMozSettings;
      };
      method.call().then(function(result) {
        assert.isTrue(result);
        stubEnabled = true;
        stubFTUManifestUrl = '';
        return method.call();
      }).then(function(result) {
        assert.isFalse(result);
        stubEnabled = false;
        stubFTUManifestUrl = 'fakeurl';
        return method.call();
      }).then(function(result) {
        assert.isTrue(false);
        clearup();
        done();
      }).catch(function(err) {
        clearup();
        done(err);
      });
    });
  });

  suite('Hierarchy functions', function() {
    setup(function() {
      subject = new window.LockScreenWindowManager();
      subject.setup();
      subject.elements = {};
      subject.elements.screen =
        document.createElement('div');
    });
    test('Should register hierarchy on start', function() {
      this.sinon.stub(Service, 'request');
      subject.start();
      assert.isTrue(Service.request.calledWith('registerHierarchy'));
    });

    test('Should activate when openApp is called', function() {
      subject.states.enabled = true;
      var app = new window.MockLockScreenWindow();
      subject.states.instance = app;
      this.sinon.stub(app, 'isActive').returns(false);
      this.sinon.stub(subject, 'publish');
      subject.openApp();
      assert.isTrue(subject.publish.calledWith(
        subject.EVENT_PREFIX + '-activated'));
    });

    test('Should deactivate when closeApp is called', function() {
      subject.states.enabled = true;
      var app = new window.MockLockScreenWindow();
      subject.states.instance = app;
      this.sinon.stub(app, 'isActive').returns(true);
      this.sinon.stub(subject, 'publish');
      subject.closeApp();
      assert.isTrue(subject.publish.calledWith(
        subject.EVENT_PREFIX + '-deactivated'));
    });

    test('Should be active if the instance is active', function() {
      var app = new window.MockLockScreenWindow();
      subject.states.instance = app;
      this.sinon.stub(app, 'isActive').returns(true);
      assert.isTrue(subject.isActive());
    });

    test('Should be inactive if the instance is inactive', function() {
      var app = new window.MockLockScreenWindow();
      subject.states.instance = app;
      this.sinon.stub(app, 'isActive').returns(false);
      assert.isFalse(subject.isActive());
    });

    test('Should be inactive if there is no instance', function() {
      assert.isFalse(subject.isActive());
    });
  });

  suite('Handle events', function() {
    setup(function() {
      subject = new window.LockScreenWindowManager();
      subject.setup();
      subject.startObserveSettings();
      subject.elements = {};
      subject.elements.screen =
        document.createElement('div');
      // Differs from the existing mock which is expected by other components.
      window.LockScreen = function() {};
    });

    test('It should stop home event to propagate', function() {
      var evt = {
            type: 'home'
          };
      // Need to be active to block the home event.
      this.sinon.stub(subject, 'isActive',
        function() {
          return true;
      });
      subject.respondToHierarchyEvent(evt);
    });

    test('App created', function() {
      subject.handleEvent(
        { type: 'lockscreen-appcreated',
          detail: appFake });
      assert.equal(
        subject.states.instance.instanceID,
          appFake.instanceID,
        'the app was not activated');
        window.assert.isObject(subject
          .states.instance,
        'the app was not registered in the maanger');
      subject.unregisterApp(appFake);
    });

    test('Initialize when screenchange', function() {
      var originalCreateWindow = subject.createWindow;
      var originalLockScreenInputWindow = window.LockScreenInputWindow;
      window.LockScreenInputWindow = function() {};
      var stubCreateWindow =
      this.sinon.stub(subject, 'createWindow',
        function() {
          return originalCreateWindow.bind(this).call();
        });
      subject.states.ready = true;
      subject.handleEvent(
        { type: 'screenchange',
          detail: { screenEnabled: true } });
      assert.isTrue(stubCreateWindow.called,
          'the manage didn\'t create the singleton window');
      var app = subject.states.instance;
      if (app) {
        subject.unregisterApp(app);
      }
      subject.stopEventListeners();
      window.LockScreenInputWindow = originalLockScreenInputWindow =
        originalLockScreenInputWindow;
    });

    test('Screenchange by proximity sensor, should not open the LockScreen app',
    function() {
      var stubOpenApp = this.sinon.stub(subject,
        'openApp');
      subject.states.ready = true;
      subject.handleEvent(
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

    test('When ScreenChange and it\'s enabled, try to lock orientation',
    function() {
      var handleEvent =
        window.LockScreenWindowManager.prototype.handleEvent;
      var mockSubject = {
        states: {
          ready: true,
          instance: {
            lockOrientation: this.sinon.stub()
          }
        },
        openApp: function() {},
        isActive: function() {
          return true;
        }
      };
      window.secureWindowManager = {
        isActive: function() {
          return false;
        }
      };
      handleEvent.call(mockSubject,
        {
          type: 'screenchange',
          detail: { screenEnabled: true }
        });
      assert.isTrue(
        mockSubject.states.instance.lockOrientation.called,
        'it doesn\'t lock the orientation while screenchage');
    });

    test('When secure app get killed, try to lock orientation',
    function() {
      var handleEvent =
        window.LockScreenWindowManager.prototype.handleEvent;
      var mockSubject = {
        states: {
          ready: true,
          instance: {
            lockOrientation: this.sinon.stub()
          }
        },
        openApp: function() {},
        isActive: function() {
          return true;
        }
      };
      window.secureWindowManager = {
        isActive: function() {
          return false;
        }
      };
      handleEvent.call(mockSubject,
        {
          type: 'secure-appclosed'
        });
      assert.isTrue(
        mockSubject.states.instance.lockOrientation.called,
        'it doesn\'t lock the orientation while secure app closed');
    });

    test('Open the app when screen is turned on', function() {
      subject.registerApp(appFake);
      var stubOpen = this.sinon.stub(appFake, 'open');
      subject.states.ready = true;
      subject.handleEvent(
        { type: 'screenchange',
          detail: { screenEnabled: true } });
      assert.isTrue(stubOpen.called,
        'the manager didn\'t call the app.open when screen on');
      subject.unregisterApp(appFake);
    });

    test('When FTU occurs, try to close the app', function() {
      var stubCloseApp = this.sinon.stub(subject,
        'closeApp');
      subject.handleEvent({ type: 'ftuopen' });
      assert.isTrue(stubCloseApp.called,
        'the LockScreenWindowManager doesn\'t call the closeApp');
    });

    test('When FTU occurs, the window should not be instantiated', function() {
      var stubOpenApp = this.sinon.stub(subject,
        'openApp');
      subject.states.ready = true;
      subject.handleEvent({ type: 'ftuopen' });
      subject.handleEvent(
        { type: 'screenchange',
          detail: { screenEnabled: true } });
      assert.isFalse(stubOpenApp.called,
        'the LockScreenWindow still be instantiated while the FTU is opened');
    });

    test('When the lockscreen settings is not ready, ' +
          'the window should not be instantiated', function() {
      var stubOpenApp = this.sinon.stub(subject,
        'openApp');
      subject.states.ready = false;
      subject.handleEvent(
        { type: 'screenchange',
          detail: { screenEnabled: true } });
      assert.isFalse(stubOpenApp.called,
        'the LockScreenWindow still be instantiated while the FTU is opened');
    });

    test('But after FTU done, the window should be instantiated', function() {
      var stubOpenApp = this.sinon.stub(subject,
        'openApp');
      subject.handleEvent({ type: 'ftuopen' });
      subject.handleEvent({ type: 'ftudone' });
      subject.states.ready = true;
      subject.handleEvent(
        { type: 'screenchange',
          detail: { screenEnabled: true } });
      assert.isTrue(stubOpenApp.called,
        'the LockScreenWindow is not instantiated after the FTU was closed.');
    });

    test('Send lockscreen window to background while overlay is there.',
      function() {
        var app = new window.MockLockScreenWindow();
        this.sinon.stub(app, 'isActive').returns(true);
        subject.states.instance = app;
        var stubSetVisible = this.sinon.stub(app, 'setVisible');
        subject.handleEvent({ type: 'overlaystart' });
        assert.isTrue(stubSetVisible.calledWith(false));
      });

    test('Send lockscreen window to foreground.', function() {
      var app = new window.MockLockScreenWindow();
      this.sinon.stub(app, 'isActive').returns(true);
      subject.states.instance = app;
      var stubSetVisible = this.sinon.stub(app, 'setVisible');
      subject.handleEvent({
        type: 'showlockscreenwindow'
      });
      assert.isTrue(stubSetVisible.calledWith(true));
    });

    test('When system resizing event comes, try to resize the window',
    function() {
      var handleEvent =
        window.LockScreenWindowManager.prototype.handleEvent;
      var mockSubject = {
        states: {
          instance: {
            isActive: function() { return true; },
            resize: this.sinon.stub().returns({ stub: 'promise' })
          }
        }
      };

      var stubWaitUntil = this.sinon.stub();

      handleEvent.call(mockSubject,
        {
          type: 'system-resize',
          detail: {
            waitUntil: stubWaitUntil
          }
        });
      assert.isTrue(
        mockSubject.states.instance.resize.called,
        'it doesn\'t resize the window while system-resize comes');
      assert.isTrue(stubWaitUntil.calledWith({ stub: 'promise' }),
        'it doesn\'t pass the promise from the subject to waitUntil() ' +
        'function.');
    });

    test('LockScreen request to unlock without activity detail', function() {
      var evt = { type: 'lockscreen-request-unlock' },
          stubCloseApp = this.sinon.stub(subject,
            'closeApp');
      subject.handleEvent(evt);
      assert.isTrue(stubCloseApp.called,
        'it did\'t close the window while unlock request arrive');
    });

    test('Open the app when asked via lock-immediately setting', function() {
      subject.registerApp(appFake);
      var stubOpen = this.sinon.stub(appFake, 'open');
      window.MockNavigatorSettings.mTriggerObservers(
        'lockscreen.lock-immediately', {settingValue: true});
      assert.isTrue(stubOpen.called,
        'the manager didn\'t open the app when requested');
      subject.unregisterApp(appFake);
    });

    test('onInputpadOpen would open the window and call resize', function() {
      subject.states.instance = appFake;
      appFake.inputWindow = {
        open: this.sinon.stub(),
        close: this.sinon.stub()
      };
      var stubResize = this.sinon.stub(appFake, 'resize');
      subject.onInputpadClose();
      assert.isTrue(appFake.inputWindow.close.called, 'called no |open|');
      assert.isTrue(stubResize.called, 'called no |resize|');
    });

    test('Open the app would set the corresponding mozSettings', function() {
      var originalEnabled = subject.states.enabled;
      subject.states.enabled = true;
      subject.registerApp(appFake);
      var stubToggleSystemSettings = this.sinon.stub(
        subject, 'toggleLockedSetting');
      subject.openApp();
      assert.isTrue(stubToggleSystemSettings.calledWith(true),
        'the manager didn\'t set the mozSettings value');
      subject.unregisterApp(appFake);
      subject.states.enabled = originalEnabled;
    });
  });
});

})();
