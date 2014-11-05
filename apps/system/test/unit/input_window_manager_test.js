'use strict';

/* global MocksHelper, InputWindowManager, MockKeyboardManager,
   InputWindow */

require('/shared/test/unit/mocks/mock_custom_event.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/test/unit/mock_orientation_manager.js');
require('/test/unit/mock_keyboard_manager.js');
require('/js/input_window_manager.js');

var mocksForInputWindowManager = new MocksHelper([
  'OrientationManager', 'SettingsListener', 'KeyboardManager', 'CustomEvent'
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
    var realIWPrototype = InputWindow.prototype;
    stubIWConstructor = this.sinon.stub(window, 'InputWindow', () =>
      // simulate |sinon.createStubInstance|: we want a new stubbed instance
      // each time we call the constructor, so use Object.create here.
      this.sinon.stub(Object.create(realIWPrototype))
    );

    manager = new InputWindowManager(MockKeyboardManager);
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
          this.sinon.stub(manager._keyboardManager, '_onKeyboardReady');

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

      test('Immediate-closes lastWindow if it is available', function() {
        var lastWindow = new InputWindow();
        manager._lastWindow = lastWindow;
        evt.detail = new InputWindow();

        manager.handleEvent(evt);

        assert.isTrue(lastWindow.close.calledWith('immediate'));
        assert.strictEqual(manager._lastWindow, null);
      });
    });

    suite('input-appclosing', function() {
      var evt;
      var stubKBPublish;

      setup(function() {
        stubKBPublish = this.sinon.stub(manager, '_kbPublish');

        evt = {
          type: 'input-appclosing',
          detail: new InputWindow()
        };
      });

      test('Send keyboardhide if there is no currentWindow', function() {
        manager._currentWindow = undefined;

        manager.handleEvent(evt);

        assert.isTrue(stubKBPublish.calledWith('keyboardhide', undefined));
      });

      test('Do not send keyboardhide if there is currentWindow', function() {
        manager._currentWindow = new InputWindow();

        manager.handleEvent(evt);

        assert.isFalse(stubKBPublish.called);
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

      test('Send keyboardhidden if there is no currentWindow', function() {
        manager._currentWindow = undefined;

        manager.handleEvent(evt);

        assert.isTrue(stubKBPublish.calledWith('keyboardhidden', undefined));
      });

      test('Do not send keyboardhidden if there is currentWindow', function() {
        manager._currentWindow = new InputWindow();

        manager.handleEvent(evt);

        assert.isFalse(stubKBPublish.called);
      });

      test('Source InputWindow is deactivated', function() {
        manager.handleEvent(evt);

        assert.isTrue(evt.detail._setAsActiveInput.calledWith(false));
      });
    });

    test('input-appterminated', function() {
      var inputWindow = new InputWindow();

      var evt = {
        type: 'input-appterminated',
        detail: inputWindow
      };

      inputWindow.manifestURL =
        'app://victim-kb.gaiamobile.org/manifest.webapp';

      var stubRemoveKeyboard =
        this.sinon.stub(manager._keyboardManager, 'removeKeyboard');

      manager.handleEvent(evt);

      assert.isTrue(stubRemoveKeyboard.calledWith(inputWindow.manifestURL));
    });
  });

  test('removeKeyboard', function() {
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

    manager.removeKeyboard('app://keyboard.gaiamobile.org/manifest.webapp');

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

  test('getHeight', function() {
    manager._currentWindow = new InputWindow();
    manager._currentWindow.height = 300;

    assert.equal(manager.getHeight(), 300);
  });

  test('hasActiveKeyboard', function() {
    manager._currentWindow = undefined;
    assert.isFalse(manager.hasActiveKeyboard());

    manager._currentWindow = new InputWindow();
    assert.isTrue(manager.hasActiveKeyboard());
  });

  test('hasActiveKeyboard', function() {
    manager._currentWindow = undefined;
    assert.isFalse(manager.hasActiveKeyboard());

    manager._currentWindow = new InputWindow();
    assert.isTrue(manager.hasActiveKeyboard());
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
        var oldKBManagerOOPEnabled;
        var oldKBManagerTotalMemory;

        setup(function() {
          oldKBManagerOOPEnabled =
            manager._keyboardManager.isOutOfProcessEnabled;
          oldKBManagerTotalMemory = manager._keyboardManager.totalMemory;
        });

        teardown(function() {
          manager._keyboardManager.isOutOfProcessEnabled = 
            oldKBManagerOOPEnabled;

          manager._keyboardManager.totalMemory = oldKBManagerTotalMemory;
        });

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

          manager._keyboardManager.isOutOfProcessEnabled = oopEnabled;
          manager._keyboardManager.totalMemory = memory;

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

    test('hideInputWindow', function() {
      var inputWindow = new InputWindow();
      manager._currentWindow = inputWindow;

      manager.hideInputWindow();

      assert.strictEqual(manager._currentWindow, null);
      assert.isTrue(inputWindow.close.called);
      assert.isFalse(inputWindow.close.calledWith('immediate'));
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

    test('_kbPublish', function() {
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
    });
  });
});
