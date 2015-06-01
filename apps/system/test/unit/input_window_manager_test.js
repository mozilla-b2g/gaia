'use strict';

/* global MocksHelper, InputWindowManager, MockKeyboardManager, MockPromise,
   InputWindow, MockSettingsListener, MockService */

require('/shared/test/unit/mocks/mock_custom_event.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/test/unit/mock_orientation_manager.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/test/unit/mock_keyboard_manager.js');
require('/js/input_window_manager.js');

var mocksForInputWindowManager = new MocksHelper([
  'OrientationManager', 'SettingsListener', 'KeyboardManager', 'CustomEvent',
  'Service'
]).init();

suite('InputWindowManager', function() {
  mocksForInputWindowManager.attachTestHelpers();

  var manager;
  var stubIWConstructor;

  suiteSetup(function(done) {
    require('/js/browser_frame.js');
    require('/js/app_transition_controller.js');
    require('/js/app_window.js');
    require('/js/browser_mixin.js');
    require('/js/input_window.js', function() {
      done();
    });
  });

  setup(function() {
    var getDeviceMemoryPromise = new MockPromise();
    this.sinon.stub(MockService, 'request', (requestService) => {
      if (requestService === 'getDeviceMemory') {
        return getDeviceMemoryPromise;
      }
    });

    var realIWPrototype = InputWindow.prototype;
    stubIWConstructor = this.sinon.stub(window, 'InputWindow', () =>
      // simulate |sinon.createStubInstance|: we want a new stubbed instance
      // each time we call the constructor, so use Object.create here.
      this.sinon.stub(Object.create(realIWPrototype))
    );

    manager = new InputWindowManager();
    getDeviceMemoryPromise.mFulfillToValue(768);
  });

  test('Hardware memory is correctly retrieved', function() {
    assert.isTrue(MockService.request.calledOnce);
    assert.isTrue(MockService.request.calledWith('getDeviceMemory'));
    assert.equal(manager._totalMemory, 768);
  });

  suite('Event handling', function() {
    var heightChangedSuite = function (evtType) {
      suite(evtType, function() {
        var evt;
        var stubKBPublish;

        setup(function() {
          stubKBPublish = this.sinon.stub(manager, '_kbPublish');

          evt = {
            type: evtType
          };
        });

        test(`Send keyboardchange if source InputWindow
              is currentWindow`, function() {

          var inputWindow = new InputWindow();
          inputWindow.height = 200;

          manager._currentWindow = inputWindow;
          evt.detail = inputWindow;

          manager.handleEvent(evt);

          assert.isTrue(stubKBPublish.calledWith('keyboardchange', 200));
        });

        test(`Do not send keyboardchange if source InputWindow
              is not currentWindow`, function() {

          manager._currentWindow = new InputWindow();
          evt.detail = new InputWindow();
          manager.handleEvent(evt);

          assert.isFalse(stubKBPublish.called);
        });
      });
    };

    heightChangedSuite('input-appopened');
    heightChangedSuite('input-appheightchanged');

    suite('input-appready', function() {
      var evt;
      var stubKBReady;

      setup(function() {
        stubKBReady =
          this.sinon.stub(MockKeyboardManager, '_onKeyboardReady');

        evt = {
          type: 'input-appready'
        };
      });

      test(`Call onKeyboardReady if Source InputWindow
            is currentWindow`, function() {

        var inputWindow = new InputWindow();

        manager._currentWindow = inputWindow;
        evt.detail = inputWindow;

        manager.handleEvent(evt);

        assert.isTrue(stubKBReady.called);
      });

      test(`Do not call onKeyboardReady if source InputWindow
            is not currentWindow`, function() {

        manager._currentWindow = new InputWindow();
        evt.detail = new InputWindow();

        manager.handleEvent(evt);

        assert.isFalse(stubKBReady.called);
      });

      test('Immediate-closes lastWindow if it is available and not dead',
      function() {
        var lastWindow = new InputWindow();
        manager._lastWindow = lastWindow;
        lastWindow.isDead.returns(false);
        evt.detail = new InputWindow();

        manager.handleEvent(evt);

        assert.isTrue(lastWindow.close.calledWith('immediate'));
        assert.strictEqual(manager._lastWindow, null);
      });

      test('Do not immediate-closes lastWindow if it is dead',
      function() {
        var lastWindow = new InputWindow();
        manager._lastWindow = lastWindow;
        lastWindow.isDead.returns(true);
        evt.detail = new InputWindow();

        manager.handleEvent(evt);

        assert.isFalse(lastWindow.close.called);
        assert.strictEqual(manager._lastWindow, null);
      });
    });

    suite('input-appclosed', function() {
      var evt;
      var stubKBPublish;

      setup(function() {
        stubKBPublish = this.sinon.stub(manager, '_kbPublish');

        evt = {
          type: 'input-appclosed',
          detail: new InputWindow()
        };
      });

      suite('inputWindow._pendingReady = false', function() {
        setup(function() {
          evt.detail._pendingReady = false;
        });
        test('Send keyboardhidden if there is no currentWindow', function() {
          manager._currentWindow = undefined;

          manager.handleEvent(evt);

          assert.isTrue(stubKBPublish.calledWith('keyboardhidden', undefined));
        });

        test('Do not send keyboardhidden if there is currentWindow',
        function() {
          manager._currentWindow = new InputWindow();

          manager.handleEvent(evt);

          assert.isFalse(stubKBPublish.called);
        });

        test('Source InputWindow is deactivated', function() {
          manager.handleEvent(evt);

          assert.isTrue(evt.detail._setAsActiveInput.calledWith(false));
        });
      });

      test('inputWindow._pendingReady = true -- should not do anything',
      function() {
        evt.detail._pendingReady = true;
        manager._currentWindow = undefined;

        manager.handleEvent(evt);

        assert.isFalse(evt.detail._setAsActiveInput.called);
        assert.isFalse(stubKBPublish.called);
      });
    });

    suite('input-appterminated', function() {
      var stubRemoveInputApp;
      var stubOnKeyboardKilled;
      var victimInputWindow;
      var evt;

      setup(function(){
        stubRemoveInputApp = this.sinon.stub(manager, '_removeInputApp');

        stubOnKeyboardKilled =
          this.sinon.stub(MockKeyboardManager, '_onKeyboardKilled');

        victimInputWindow = new InputWindow();

        victimInputWindow.manifestURL =
          'app://victim-kb.gaiamobile.org/manifest.webapp';

        evt = {
          type: 'input-appterminated',
          detail: victimInputWindow
        };
      });

      test('Not the currentWindow', function() {
        manager._currentWindow = new InputWindow();

        manager.handleEvent(evt);

        assert.isTrue(
          stubRemoveInputApp.calledWith(victimInputWindow.manifestURL));
        assert.isFalse(
          stubOnKeyboardKilled.calledWith(victimInputWindow.manifestURL));
      });
      test('Killed the currentWindow', function() {
        manager._currentWindow = victimInputWindow;

        manager.handleEvent(evt);

        assert.isTrue(
          stubRemoveInputApp.calledWith(victimInputWindow.manifestURL));
        assert.isTrue(
          stubOnKeyboardKilled.calledWith(victimInputWindow.manifestURL));
      });
    });

    suite('External events for hideInputWindowImmediately', function() {
      var stubHideInputWindowImmediately;
      setup(function() {
        stubHideInputWindowImmediately =
          this.sinon.stub(manager, 'hideInputWindowImmediately');
      });

      var testForHideImmeidately = function(evtType) {
        test(evtType, function() {
          manager.handleEvent(new CustomEvent(evtType));

          assert.isTrue(stubHideInputWindowImmediately.called);
        });
      };

      ['activityrequesting', 'activityopening', 'activityclosing',
       'attentionrequestopen', 'attentionrecovering', 'attentionopening',
       'attentionclosing', 'attentionopened', 'attentionclosed',
       'notification-clicked', 'applicationsetupdialogshow'].forEach(evtType =>
      {
        testForHideImmeidately(evtType);
      });
    });

    suite('External events for removing input focus', function() {
      var stubHasActiveInputApp;
      var realInputMethod;

      setup(function() {
        stubHasActiveInputApp = this.sinon.stub(manager, '_hasActiveInputApp');

        realInputMethod = window.navigator.mozInputMethod;
        navigator.mozInputMethod = {
          removeFocus: this.sinon.stub()
        };

        MockService.currentApp = {
          blur: this.sinon.stub()
        };
      });

      teardown(function() {
        navigator.mozInputMethod = realInputMethod;
      });

      var testForRemoveFocus = function(evtType) {
        test(evtType + ' do nothing if there is no active keyboard',
        function() {
          stubHasActiveInputApp.returns(false);

          manager.handleEvent(new CustomEvent(evtType));

          assert.isFalse(navigator.mozInputMethod.removeFocus.called);
          assert.isFalse(MockService.currentApp.blur.called);
        });

        test(evtType + ' remove focus if there is active keyboard', function() {
          stubHasActiveInputApp.returns(true);

          manager.handleEvent(new CustomEvent(evtType));

          assert.isTrue(navigator.mozInputMethod.removeFocus.called);
          assert.isTrue(MockService.currentApp.blur.called);
        });
      };

      ['lockscreen-appopened', 'sheets-gesture-begin',
        'cardviewbeforeshow'].forEach(evtType => {
        testForRemoveFocus(evtType);
      });
    });

    suite('mozmemorypressure', function() {
      var stubHasActiveInputApp;
      var stubRemoveInputApp;
      var stubGetLoadedManifestURLs;

      setup(function() {
        stubHasActiveInputApp = this.sinon.stub(manager, '_hasActiveInputApp');
        stubGetLoadedManifestURLs =
          this.sinon.stub(manager, 'getLoadedManifestURLs');
        stubRemoveInputApp = this.sinon.stub(manager, '_removeInputApp');
      });

      test('Do nothing if oop is enabled', function() {
        manager.isOutOfProcessEnabled = true;

        manager.handleEvent(new CustomEvent('mozmemorypressure'));

        assert.isFalse(stubGetLoadedManifestURLs.called);
        assert.isFalse(stubRemoveInputApp.called);
      });

      test('Do nothing if we have active app', function() {
        stubHasActiveInputApp.returns(true);

        manager.handleEvent(new CustomEvent('mozmemorypressure'));

        assert.isFalse(stubGetLoadedManifestURLs.called);
        assert.isFalse(stubRemoveInputApp.called);
      });

      test('Actually removeInputApp', function() {
        manager.isOutOfProcessEnabled = false;
        stubHasActiveInputApp.returns(false);

        var manifestURLs = [
          'app://keyboard1.gaiamobile.org/manifest.webapp',
          'app://keyboard2.gaiamobile.org/manifest.webapp',
          'app://keyboard3.gaiamobile.org/manifest.webapp'
        ];

        stubGetLoadedManifestURLs.returns(manifestURLs);

        manager.handleEvent(new CustomEvent('mozmemorypressure'));

        assert.equal(stubRemoveInputApp.callCount, manifestURLs.length,
          '_removeInputApp should be called as many times as count of KBs');

        manifestURLs.forEach(manifestURL => {
          assert.isTrue(stubRemoveInputApp.calledWith(manifestURL),
            '_removeInputApp was not called with ' + manifestURL);
        });
      });
    });
  });

  test('removeInputApp', function() {
    var inputWindow = new InputWindow();
    var inputWindow2 = new InputWindow();
    var inputWindow3 = new InputWindow();

    manager._inputWindows['app://keyboard.gaiamobile.org/manifest.webapp'] = {
      '/index.html': inputWindow,
      '/index2.html': inputWindow2
    };
    manager._inputWindows['app://keyboard2.gaiamobile.org/manifest.webapp'] = {
      '/index.html': inputWindow3
    };

    manager._removeInputApp('app://keyboard.gaiamobile.org/manifest.webapp');

    assert.isTrue(inputWindow.destroy.called);
    assert.isTrue(inputWindow2.destroy.called);
    assert.isFalse(inputWindow3.destroy.called);

    assert.isFalse(
      'app://keyboard.gaiamobile.org/manifest.webapp' in manager._inputWindows,
      'The "keyboard" app should be removed'
    );
    assert.isTrue(
      'app://keyboard2.gaiamobile.org/manifest.webapp' in manager._inputWindows,
      'The "keyboard2" app should not be removed'
    );
  });

  test('onInputLayoutsRemoved', function() {
    var manifestURLs1 = [
      'app://keyboard1.gaiamobile.org/manifest.webapp',
      'app://keyboard2.gaiamobile.org/manifest.webapp',
      'app://keyboard3.gaiamobile.org/manifest.webapp'
    ];

    var manifestURLs2 = [
      'app://keyboard4.gaiamobile.org/manifest.webapp',
      'app://keyboard5.gaiamobile.org/manifest.webapp',
      'app://keyboard6.gaiamobile.org/manifest.webapp'
    ];

    manager._currentWindow = new InputWindow();
    manager._currentWindow.manifestURL =
      'app://keyboard5.gaiamobile.org/manifest.webapp';

    var stubHideInputWindow = this.sinon.stub(manager, 'hideInputWindow');
    var stubRemoveInputApp = this.sinon.stub(manager, '_removeInputApp');

    // removed apps do not include current window
    var ret = manager._onInputLayoutsRemoved(manifestURLs1);
    assert.isFalse(stubHideInputWindow.called);

    assert.isFalse(ret, 'should return false as no currentWindow hid');

    manifestURLs1.forEach(manifestURL => {
      assert.isTrue(stubRemoveInputApp.calledWith(manifestURL),
        manifestURL + ' was not passed to removeInputApp');
    });

    // removed apps include current window
    ret = manager._onInputLayoutsRemoved(manifestURLs2);
    assert.isTrue(stubHideInputWindow.calledOnce);

    assert.isTrue(ret, 'should return true as some currentWindow hid');

    manifestURLs1.forEach(manifestURL => {
      assert.isTrue(stubRemoveInputApp.calledWith(manifestURL),
        manifestURL + ' was not passed to removeInputApp');
    });
  });

  test('getHeight', function() {
    manager._currentWindow = new InputWindow();
    manager._currentWindow.height = 300;

    assert.equal(manager.getHeight(), 300);
  });

  suite('Observation on 3rd-party keyboard Settings', function() {
    setup(function() {
      MockSettingsListener.mTeardown();
    });

    teardown(function() {
      MockSettingsListener.mTeardown();
    });

    test('start observes/stop unobserves correctly', function() {
      var stubObserve = this.sinon.stub(MockSettingsListener, 'observe');

      manager.start();

      assert.isTrue(
        stubObserve.calledWith('keyboard.3rd-party-app.enabled'), true);

      var callback = MockSettingsListener.mCallback;

      var stubUnobserve = this.sinon.stub(MockSettingsListener, 'unobserve');

      manager.stop();

      assert.isTrue(
        stubUnobserve.calledWith('keyboard.3rd-party-app.enabled'), callback);
    });
    test('setting is correctly set by callback', function() {
      manager.isOutOfProcessEnabled = undefined;

      manager.start();

      var callback = MockSettingsListener.mCallback;

      callback(true);

      manager.stop();

      assert.isTrue(manager.isOutOfProcessEnabled);
    });
  });

  test('hasActiveInputApp', function() {
    manager._currentWindow = undefined;
    assert.isFalse(manager._hasActiveInputApp());

    manager._currentWindow = new InputWindow();
    assert.isTrue(manager._hasActiveInputApp());
  });

  suite('extractLayoutConfigs', function() {
    var oldWindowApplications;

    setup(function() {
      oldWindowApplications = window.applications;

      var app = {
        manifest: {
          dummy: 'dummy'
        }
      };

      window.applications = {
        getByManifestURL: this.sinon.stub().returns(app)
      };
    });

    teardown(function() {
      window.applications = oldWindowApplications;
    });

    test('Path has hash part', function() {
      var layout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        path: '/index.html#ime1',
        id: 'ime1',
        origin: 'app://keyboard.gaiamobile.org'
      };

      assert.deepEqual(manager._extractLayoutConfigs(layout), {
        manifest: {dummy: 'dummy'},
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        path: '/index.html#ime1',
        id: 'ime1',
        origin: 'app://keyboard.gaiamobile.org',
        pathInitial: '/index.html',
        hash: '#ime1'
      });
    });

    test('Path has no hash part', function() {
      var layout = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        path: '/index.html',
        id: 'ime1',
        origin: 'app://keyboard.gaiamobile.org'
      };

      assert.deepEqual(manager._extractLayoutConfigs(layout), {
        manifest: {dummy: 'dummy'},
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        path: '/index.html',
        id: 'ime1',
        origin: 'app://keyboard.gaiamobile.org',
        pathInitial: '/index.html',
        hash: ''
      });
    });

    suite('_makeInputWindow', function() {
      test('configs passed, inputWindow inserted into mapping', function() {
        var configs = {
          manifest: {
            type: 'certified'
          },
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          pathInitial: '/index.html',
          origin: 'app://keyboard.gaiamobile.org'
        };

        var inputWindow = manager._makeInputWindow(configs);

        assert.equal(configs, stubIWConstructor.getCall(0).args[0],
                     'configs should be passed into inputWindow');

        assert.equal(
          manager._inputWindows['app://keyboard.gaiamobile.org/manifest.webapp']
                               ['/index.html'],
          inputWindow
        );

        var configs2 = {
          manifest: {
            type: 'certified'
          },
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          pathInitial: '/index2.html',
          origin: 'app://keyboard.gaiamobile.org'
        };

        manager._makeInputWindow(configs2);

        assert.equal(
          Object.keys(
            manager
            ._inputWindows['app://keyboard.gaiamobile.org/manifest.webapp']
          ).length,
          2,
          'should have two inputWindow created for the keyboard app'
        );
      });

      // the key point of loading an input app is we determine whether to make
      // it out-of-process correctly, so it's being thoroughly tested.
      suite('oop flag', function() {
        var oopTest = function(certified, oopEnabled, memory, expectedOOP) {
          var configs = {
            manifest: {
              type: ''
            },

            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            pathInitial: '/index.html',
            origin: 'app://keyboard.gaiamobile.org'
          };

          if (certified) {
            configs.manifest.type = 'certified';
          } else {
            configs.manifest.type = 'privileged';
          }

          manager.isOutOfProcessEnabled = oopEnabled;
          manager._totalMemory = memory;

          manager._makeInputWindow(configs);

          assert.strictEqual(configs.oop, expectedOOP,
            `oop flag should be ${expectedOOP} for the configs`);
        };

        test('app is certified, oop settings enabled, totalMemory >= 512',
        function() {
          oopTest(true, true, 512, true);
          oopTest(true, true, 1024, true);
        });

        test('app is certified, oop settings enabled, totalMemory < 512',
        function() {
          oopTest(true, true, 128, false);
          oopTest(true, true, 256, false);
        });

        test('app is certified, oop settings disabled, totalMemory >= 512',
        function() {
          oopTest(true, false, 512, false);
          oopTest(true, false, 1024, false);
        });

        test('app is certified, oop settings disabled, totalMemory < 512',
        function() {
          oopTest(true, false, 128, false);
          oopTest(true, false, 256, false);
        });

        test('app is not certified, oop settings enabled, totalMemory >= 512',
        function() {
          oopTest(false, true, 512, true);
          oopTest(false, true, 1024, true);
        });

        test('app is not certified, oop settings enabled, totalMemory < 512',
        function() {
          oopTest(false, true, 128, true);
          oopTest(false, true, 256, true);
        });

        test('app is not certified, oop settings disabled, totalMemory >= 512',
        function() {
          oopTest(false, false, 512, false);
          oopTest(false, false, 1024, false);
        });

        test('app is not certified, oop settings disabled, totalMemory < 512',
        function() {
          oopTest(false, false, 128, false);
          oopTest(false, false, 256, false);
        });
      });
    });

    test('preloadInputWindow', function() {
      var layout = {
        dummy: 'dummy'
      };

      var configs = {
        dummy2: 'dummy2'
      };

      var stubExtractLayoutConfigs =
        this.sinon.stub(manager, '_extractLayoutConfigs').returns(configs);

      var stubMakeInputWindow = this.sinon.stub(manager, '_makeInputWindow');

      manager.preloadInputWindow(layout);

      assert.isTrue(stubExtractLayoutConfigs.calledWith(layout));

      assert.deepEqual(stubMakeInputWindow.getCall(0).args[0], {
        dummy2: 'dummy2',
        stayBackground: true
      }, 'stayBackground should be true');
    });

    suite('showInputWindow', function() {
      var layout = {
        dummy: 'dummy'
      };

      var configs = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        pathInitial: '/index.html'
      };

      var inputWindow;
      var inputWindow2;

      setup(function() {
        inputWindow = new InputWindow();
        inputWindow2 = new InputWindow();
      });

      test('Parameters are passed to helper functions correctly', function() {
        var stubExtractLayoutConfigs =
          this.sinon.stub(manager, '_extractLayoutConfigs').returns(configs);

        var stubMakeInputWindow =
          this.sinon.stub(manager, '_makeInputWindow').returns(inputWindow);

        manager.showInputWindow(layout);

        assert.isTrue(stubExtractLayoutConfigs.calledWith(layout),
                      `_extractLayoutConfigs should be called with
                       correct layout`);
        assert.isTrue(stubMakeInputWindow.calledWith(configs),
                      '_makeInputWindow should be called with correct configs');
      });

      test('Fill _currentWindow', function() {
        this.sinon.stub(manager, '_extractLayoutConfigs').returns(configs);
        this.sinon.stub(manager, '_makeInputWindow').returns(inputWindow);

        manager.showInputWindow(layout);
        assert.equal(manager._currentWindow, inputWindow);
      });

      suite('Determine reusability of InputWindows', function() {
        setup(function() {
          manager._inputWindows = {
            'app://keyboard.gaiamobile.org/manifest.webapp': {
              '/index.html': inputWindow
            }
          };

          this.sinon.stub(manager, '_makeInputWindow').returns(inputWindow2);
        });

        test('Reusable', function() {
          this.sinon.stub(manager, '_extractLayoutConfigs').returns(configs);

          manager.showInputWindow(layout);

          assert.equal(manager._currentWindow, inputWindow);
        });

        test('Not reusable, same app but different pathInitials', function() {
          var configs2 = {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            pathInitial: '/index2.html'
          };

          this.sinon.stub(manager, '_extractLayoutConfigs').returns(configs2);

          manager.showInputWindow(layout);

          assert.equal(manager._currentWindow, inputWindow2);
        });

        test('Not reusable, different apps', function() {
          var configs2 = {
            manifestURL: 'app://keyboard2.gaiamobile.org/manifest.webapp',
            pathInitial: '/index.html'
          };

          this.sinon.stub(manager, '_extractLayoutConfigs').returns(configs2);

          manager.showInputWindow(layout);

          assert.equal(manager._currentWindow, inputWindow2);
        });
      });

      suite('Determine replacement of InputWindows', function() {
        setup(function() {
          this.sinon.stub(manager, '_extractLayoutConfigs').returns(configs);
          this.sinon.stub(manager, '_makeInputWindow').returns(inputWindow);
        });

        test('No currentWindow', function(){
          manager._currentWindow = undefined;

          manager.showInputWindow(layout);

          // we want to make sure immediateOpen is not there (see the last case)
          // so use deepEqual checking here
          assert.deepEqual(inputWindow.open.getCall(0).args[0], {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            pathInitial: '/index.html'
          });
          assert.equal(manager._currentWindow, inputWindow);
          assert.strictEqual(manager._lastWindow, null);
        });

        test('currentWindow is the same as the window to display', function(){
          manager._currentWindow = inputWindow;

          manager.showInputWindow(layout);

          assert.deepEqual(inputWindow.open.getCall(0).args[0], {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            pathInitial: '/index.html'
          });
          assert.equal(manager._currentWindow, inputWindow);
          assert.strictEqual(manager._lastWindow, null);
        });

        test('currentWindow is different from the window to display',
        function(){
          manager._currentWindow = inputWindow2;

          manager.showInputWindow(layout);

          assert.deepEqual(inputWindow.open.getCall(0).args[0], {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            pathInitial: '/index.html',
            immediateOpen: true
          });
          assert.equal(manager._currentWindow, inputWindow);
          assert.equal(manager._lastWindow, inputWindow2);
        });
      });
    });

    test('hideInputWindow', function(done) {
      var stubKBPublish = this.sinon.stub(manager, '_kbPublish')
        .returns(Promise.resolve());
      var inputWindow = new InputWindow();
      manager._currentWindow = inputWindow;

      manager.hideInputWindow();

      assert.isTrue(stubKBPublish.calledWith('keyboardhide', undefined));

      Promise.resolve().then(function() {
        assert.strictEqual(manager._currentWindow, null);
        assert.isTrue(inputWindow.close.called);
        assert.isFalse(inputWindow.close.calledWith('immediate'));
      }).then(done, done);
    });

    test('hideInputWindow (cancelled w/ another showInputWindow() call)',
    function(done) {
      var stubKBPublish = this.sinon.stub(manager, '_kbPublish')
        .returns(Promise.resolve());
      var inputWindow = new InputWindow();
      manager._currentWindow = inputWindow;

      manager.hideInputWindow();

      assert.isTrue(stubKBPublish.calledWith('keyboardhide', undefined));
      assert.equal(manager._currentWindow, null);

      manager._currentWindow = inputWindow;

      Promise.resolve().then(function() {
        assert.isFalse(inputWindow.close.called);
      }).then(done, done);
    });

    test('hideInputWindowImmediately', function() {
      var stubKBPublish = this.sinon.stub(manager, '_kbPublish');

      var inputWindow = new InputWindow();
      manager._currentWindow = inputWindow;

      manager.hideInputWindowImmediately();

      assert.isTrue(stubKBPublish.calledWith('keyboardhide', undefined));

      assert.strictEqual(manager._currentWindow, null);
      assert.isTrue(inputWindow.close.calledWith('immediate'));
    });

    test('getLoadedManifestURLs', function() {
      manager._inputWindows = {
        'app://keyboard.gaiamobile.org/manifest.webapp': {},
        'app://keyboard2.gaiamobile.org/manifest.webapp': {}
      };

      assert.deepEqual(manager.getLoadedManifestURLs(), [
        'app://keyboard.gaiamobile.org/manifest.webapp',
        'app://keyboard2.gaiamobile.org/manifest.webapp'
      ]);
    });

    test('_kbPublish', function(done) {
      var stubDispatchEvent = this.sinon.stub(document.body, 'dispatchEvent');

      var p = manager._kbPublish('keyboardevent', 400);

      sinon.assert.calledWithMatch(stubDispatchEvent, {
        type: 'keyboardevent',
        bubbles: true,
        cancelable: true,
        detail: {
          height: 400
        }
      });

      p.then(done, done);
    });

    test('_kbPublish (delayed with waitUntil())', function(done) {
      var p2resolver;
      var p2resolved = false;
      var p2 = new Promise(function(resolve) {
        p2resolver = resolve;
      });

      var stubDispatchEvent =
        this.sinon.stub(document.body, 'dispatchEvent', function(evt) {
          evt.detail.waitUntil(p2);
        });

      var p = manager._kbPublish('keyboardevent', 400);

      sinon.assert.calledWithMatch(stubDispatchEvent, {
        type: 'keyboardevent',
        bubbles: true,
        cancelable: true,
        detail: {
          height: 400
        }
      });

      p = p.then(function() {
        assert.isTrue(p2resolved,
          'Should not resolve before waitUntil(promise).');
      });

      Promise.resolve()
        .then(function() {
          p2resolver();
          p2resolved = true;

          return p2;
        })
        .then(function() {
          return p;
        })
        .then(done, done);
    });

    test('_kbPublish (call waitUntil() out of event loop)', function() {
      var stubDispatchEvent = this.sinon.stub(document.body, 'dispatchEvent');

      manager._kbPublish('keyboardevent', 400);

      sinon.assert.calledWithMatch(stubDispatchEvent, {
        type: 'keyboardevent',
        bubbles: true,
        cancelable: true,
        detail: {
          height: 400
        }
      });

      var evt = stubDispatchEvent.firstCall.args[0];
      assert.throws(evt.detail.waitUntil,
        /You must call waitUntil\(\) within the event handling loop/,
        'Should throw if called out of event loop.');
    });
  });
});
