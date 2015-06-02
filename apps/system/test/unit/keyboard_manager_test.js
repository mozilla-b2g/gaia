/*global KeyboardManager, sinon, KeyboardHelper, MockKeyboardHelper,
  MocksHelper, MockNavigatorSettings, Applications, MockL10n,
  MockImeMenu, inputWindowManager, TYPE_GROUP_MAPPING,
  InputLayouts, MockPromise */
'use strict';

require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/test/unit/mock_applications.js');
require('/test/unit/mock_homescreen_launcher.js');
require('/test/unit/mock_ime_switcher.js');
require('/test/unit/mock_ime_menu.js');
require('/js/input_layouts.js');
require('/test/unit/mock_input_window_manager.js');
require('/js/keyboard_manager.js');


var mocksHelperForKeyboardManager = new MocksHelper([
    'KeyboardHelper',
    'LazyLoader',
    'Applications',
    'IMESwitcher',
    'ImeMenu',
    'L10n',
    'Service',
    'InputWindowManager'
]).init();

suite('KeyboardManager', function() {
  var SWITCH_CHANGE_DELAY = 20;

  function inputChangeEvent(inputType) {
    return new CustomEvent('mozChromeEvent', {
      detail: {
        type: 'inputmethod-contextchange',
        inputType: inputType
      }
    });
  }

  function simulateInputChangeEvent(inputType) {
    // we call the method directly because we can't send a direct event
    // because otherwise in this test, we'll have n mozChromeEvent listeners
    KeyboardManager._inputFocusChange(inputChangeEvent(inputType));
  }

  function setupHTML() {
    var rc = document.querySelector('#run-container');
    rc.innerHTML = '';

    rc.innerHTML += '<div id="keyboards" class="hide">hoi</div>';
  }

  mocksHelperForKeyboardManager.attachTestHelpers();

  var realMozSettings = null;
  var stubGetGroupCurrentActiveLayoutIndexAsync;

  suiteSetup(function() {
    document.body.innerHTML += '<div id="run-container"></div>';
    navigator.mozSettings = MockNavigatorSettings;

    window.DynamicInputRegistry = function() {};
    window.DynamicInputRegistry.prototype.start = function() {};
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    // we use sinon's fake timers for all the tests so that the timeouts used in
    // the tested code in one test don't disturb the next test.
    this.sinon.useFakeTimers();

    setupHTML();

    // stub this such that the mocked SettingListener's callback would not
    // trigger out of the blue when sinon fake timer advances
    this.sinon.stub(KeyboardManager, '_tryLaunchOnBoot');

    // we test these InputLayouts methods separately in input_layouts_test.js
    this.sinon.stub(InputLayouts.prototype, '_getSettings');
    stubGetGroupCurrentActiveLayoutIndexAsync =
      this.sinon.stub(InputLayouts.prototype,
                      'getGroupCurrentActiveLayoutIndexAsync');

    KeyboardManager.start();
    this.sinon.stub(
      window.inputWindowManager, 'getLoadedManifestURLs').returns([]);

    this.sinon.stub(
      window.inputWindowManager, '_onInputLayoutsRemoved').returns(null);
    this.sinon.stub(window.inputWindowManager, 'showInputWindow');
    this.sinon.stub(window.inputWindowManager, 'hideInputWindow');
    this.sinon.stub(window.inputWindowManager, 'preloadInputWindow');

    window.applications = Applications;
    window.applications.mRegisterMockApp({
      manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
      manifest: {
        type: 'certified'
      }
    });
    Applications.mRegisterMockApp({
      manifestURL: 'app://keyboard-test.gaiamobile.org/manifest.webapp',
      manifest: {
        type: 'certified'
      }
    });
  });

  teardown(function() {
    stubGetGroupCurrentActiveLayoutIndexAsync.restore();
  });

  suite('Switching keyboard focus', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, '_showIMESwitcher');
      this.sinon.stub(KeyboardManager, '_setKeyboardToShow');
    });

    test('The event triggers inputFocusChange', function() {
      this.sinon.stub(KeyboardManager, '_inputFocusChange');

      var event = inputChangeEvent('text');
      window.dispatchEvent(event);

      sinon.assert.called(KeyboardManager._inputFocusChange);
    });

    suite('Switching inputType', function() {
      var p1;
      var p2;

      setup(function() {
        this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts');
        this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');
        MockKeyboardHelper.watchCallback(KeyboardHelper.layouts,
          { apps: true });

        p1 = new MockPromise();
        p2 = new MockPromise();

        stubGetGroupCurrentActiveLayoutIndexAsync
          .onFirstCall().returns(p1)
          .onSecondCall().returns(p2);
      });
      test('Switching from "text" to "number"', function() {

        simulateInputChangeEvent('text');

        p1.then.getCall(0).args[0](undefined);

        simulateInputChangeEvent('number');

        p2.then.getCall(0).args[0](undefined);

        sinon.assert.calledWith(KeyboardManager._setKeyboardToShow, 'text');
        sinon.assert.calledWith(KeyboardManager._setKeyboardToShow, 'number');
      });

      test('Switching from "text" to "text"', function() {
        simulateInputChangeEvent('text');

        p1.then.getCall(0).args[0](undefined);

        simulateInputChangeEvent('text');

        p2.then.getCall(0).args[0](undefined);

        sinon.assert.calledWith(KeyboardManager._setKeyboardToShow, 'text');
      });

      test('Switching from "text" to "select-one"', function() {
        simulateInputChangeEvent('text');

        p1.then.getCall(0).args[0](undefined);

        simulateInputChangeEvent('select-one');

        sinon.assert.called(inputWindowManager.hideInputWindow);
      });
    });

    suite('keyboard type "url" - has enabled layouts', function() {
      setup(function() {
        this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts');
        this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');
        MockKeyboardHelper.watchCallback(KeyboardHelper.layouts,
          { apps: true });

        var p = new MockPromise();
        stubGetGroupCurrentActiveLayoutIndexAsync.returns(p);

        simulateInputChangeEvent('url');

        p.then.getCall(0).args[0](undefined);
      });
      test('does not request layouts or defaults', function() {
        assert.isFalse(this.getLayouts.called);
        assert.isFalse(this.checkDefaults.called);
      });
      test('shows "url" keyboard', function() {
        assert.ok(KeyboardManager._setKeyboardToShow.calledWith('url'));
      });
    });

    suite('keyboard type "url" - no enabled layout', function() {
      setup(function() {
        this.saveToSettings = this.sinon.stub(KeyboardHelper, 'saveToSettings');
        this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts');
        // make this respond automatically
        this.getLayouts.yields([]);

        // trigger no keyboards in the first place
        MockKeyboardHelper.watchCallback([], { apps: true, settings: true });

        KeyboardManager.inputLayouts.layouts = {
          text: {
            activeLayout: undefined
          }
        };
      });
      teardown(function() {
        MockKeyboardHelper.watchCallback(KeyboardHelper.layouts,
          { apps: true });
      });
      suite('no defaults enabled', function() {
        setup(function() {
          this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');

          var p = new MockPromise();
          stubGetGroupCurrentActiveLayoutIndexAsync.returns(p);

          simulateInputChangeEvent('url');

          this.checkDefaults.getCall(0).args[0]();

          p.then.getCall(0).args[0](undefined);
        });

        test('requests defaults', function() {
          assert.ok(this.checkDefaults.called);
        });
        test('requests layouts', function() {
          assert.ok(this.getLayouts.calledAfter(this.checkDefaults));
        });
        test('reverts to "text" when no defaults', function() {
          assert.ok(KeyboardManager._setKeyboardToShow.calledWith('text'));
        });
      });

      suite('defaults enabled', function() {
        setup(function() {
          this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults',
            function overrideCheckDefaults(callback) {
              this.getLayouts.yields([KeyboardHelper.layouts[0]]);
              callback();
            }.bind(this));

          var p = new MockPromise();
          stubGetGroupCurrentActiveLayoutIndexAsync.returns(p);

          simulateInputChangeEvent('url');

          p.then.getCall(0).args[0](undefined);
        });

        test('requests layouts', function() {
          assert.ok(this.getLayouts.called);
        });
        test('requests defaults', function() {
          assert.ok(this.checkDefaults.called);
        });
        test('requests layouts again', function() {
          assert.ok(this.getLayouts.calledAfter(this.checkDefaults));
        });
        test('saves', function() {
          assert.ok(this.saveToSettings.called);
        });
        test('keeps "url" when defaults found', function() {
          assert.ok(KeyboardManager._setKeyboardToShow.calledWith('url'));
        });
      });
    });

    suite('Restore user selection from settings', function() {
      var km, p;

      setup(function() {
        km = KeyboardManager;
        p = new MockPromise();

        TYPE_GROUP_MAPPING.chocola = 'chocola';

        km.inputLayouts.layouts.chocola = [
          { id: 'default', manifestURL: 'app://default' },
          { id: 'trahlah', manifestURL: 'app://yolo' },
          { id: 'another', manifestURL: 'app://yolo' }
        ];

        stubGetGroupCurrentActiveLayoutIndexAsync.returns(p);
      });

      test('Selection is present', function() {
        simulateInputChangeEvent('chocola');

        p.then.getCall(0).args[0](1);

        sinon.assert.calledWith(km._setKeyboardToShow, 'chocola', 1);
      });

      test('Selection is present, multiple from same manifest', function() {
        simulateInputChangeEvent('chocola');

        p.then.getCall(0).args[0](2);

        sinon.assert.calledWith(km._setKeyboardToShow, 'chocola', 2);
      });

      test('Selection is not present or not set', function() {
        simulateInputChangeEvent('chocola');

        p.then.getCall(0).args[0](undefined);

        sinon.assert.calledWithExactly(
          km._setKeyboardToShow, 'chocola', undefined
        );
      });

      test('Error should still trigger _setKeyboardToShow', function() {
        simulateInputChangeEvent('chocola');

        p.mGetNextPromise().catch.getCall(0).args[0]('error');

        sinon.assert.calledWithExactly(km._setKeyboardToShow, 'chocola');
      });
    });
  });

  suite('Try using the same layout when switching input types', function() {
    var oldInputLayouts;
    var oldlayoutToGroupMapping;
    setup(function() {
      oldInputLayouts = KeyboardManager.inputLayouts.layouts;
      oldlayoutToGroupMapping =
        KeyboardManager.inputLayouts._layoutToGroupMapping;

      KeyboardManager.inputLayouts.layouts = {
        text: [
          {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            id: 'en'
          },
          {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            id: 'fr'
          },
          {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            id: 'es'
          }
        ],
        password: [
          {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            id: 'en'
          },
          {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            id: 'fr'
          },
          {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            id: 'es'
          }
        ],
        number: [
          {
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
            id: 'number'
          }
        ]
      };

      KeyboardManager.inputLayouts._layoutToGroupMapping = {
        'app://keyboard.gaiamobile.org/manifest.webapp/en': [
          {
            group: 'text',
            index: 0
          },
          {
            group: 'password',
            index: 0
          }
        ],
        'app://keyboard.gaiamobile.org/manifest.webapp/fr': [
          {
            group: 'text',
            index: 1
          },
          {
            group: 'password',
            index: 1
          }
        ],
        'app://keyboard.gaiamobile.org/manifest.webapp/es': [
          {
            group: 'text',
            index: 2
          },
          {
            group: 'password',
            index: 2
          }
        ],
        'app://keyboard.gaiamobile.org/manifest.webapp/number': [
          {
            group: 'number',
            index: 0
          }
        ]
      };

      KeyboardManager.inputLayouts.layouts.text._activeLayoutIdx = 0;
      KeyboardManager.inputLayouts.layouts.password._activeLayoutIdx = 0;
      KeyboardManager.inputLayouts.layouts.number._activeLayoutIdx = 0;
    });

    teardown(function() {
      KeyboardManager.inputLayouts.layouts = oldInputLayouts;
      KeyboardManager.inputLayouts._layoutToGroupMapping =
        oldlayoutToGroupMapping;
    });

    test('change to text and to password', function() {
      KeyboardManager._setKeyboardToShow('text');
      assert.isTrue(
        inputWindowManager.showInputWindow.calledWith({
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          id: 'en'
        }),
        'should change to first text layout'
      );

      inputWindowManager.showInputWindow.reset();

      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);
      assert.isTrue(
        inputWindowManager.showInputWindow.calledWith({
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          id: 'fr'
        }),
        'should change to second text layout'
      );

      inputWindowManager.showInputWindow.reset();

      KeyboardManager._setKeyboardToShow('password');
      assert.isTrue(
        inputWindowManager.showInputWindow.calledWith({
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          id: 'fr'
        }),
        'should change to second password layout'
      );
    });

    test('change to text and to number and to password', function() {
      KeyboardManager._setKeyboardToShow('text');
      assert.isTrue(
        inputWindowManager.showInputWindow.calledWith({
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          id: 'en'
        }), 'should change to first text layout'
      );

      inputWindowManager.showInputWindow.reset();
      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);

      assert.isTrue(
        inputWindowManager.showInputWindow.calledWith({
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          id: 'fr'
        }), 'should change to second text layout'
      );

      inputWindowManager.showInputWindow.reset();

      KeyboardManager._setKeyboardToShow('number');

      inputWindowManager.showInputWindow.reset();

      KeyboardManager._setKeyboardToShow('password');
      assert.isTrue(
        inputWindowManager.showInputWindow.calledWith({
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          id: 'fr'
        }),
        'should change to second password layout'
      );
    });

    test('change to text, blur, and to password', function() {
      KeyboardManager._setKeyboardToShow('text');
      assert.isTrue(
        inputWindowManager.showInputWindow.calledWith({
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          id: 'en'
        }),
        'should change to first text layout'
      );

      inputWindowManager.showInputWindow.reset();
      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);

      assert.isTrue(
        inputWindowManager.showInputWindow.calledWith({
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          id: 'fr'
        }),
        'should change to second text layout'
      );

      simulateInputChangeEvent('blur');

      inputWindowManager.showInputWindow.reset();

      KeyboardManager._setKeyboardToShow('password');
      assert.isTrue(
        inputWindowManager.showInputWindow.calledWith({
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          id: 'fr'
        }),
        'should change to second password layout'
      );
    });
  });

  suite('Fallback layouts', function() {
    var oldFallbackLayotus;
    setup(function() {
      oldFallbackLayotus = MockKeyboardHelper.fallbackLayouts;
    });

    teardown(function() {
      MockKeyboardHelper.fallbackLayouts = oldFallbackLayotus;
    });

    test('Should detect fallback and insert them', function() {
      MockKeyboardHelper.fallbackLayouts = {
        password: {
          app: {
            origin: 'app://keyboard.gaiamobile.org',
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp'
          },
          layoutId: 'pwLayout',
          inputManifest: {
            launch_path: '/settings.html',
            name: 'pwInput'
          },
          manifest: {
            name: 'pwInput'
          }
        }
      };

      MockKeyboardHelper.watchCallback(KeyboardHelper.layouts, { apps: true });

      assert.isTrue('password' in KeyboardManager.inputLayouts.layouts);
      assert.equal(KeyboardManager.inputLayouts.layouts.password[0].appName,
        'pwInput');
      assert.equal(KeyboardManager.inputLayouts.layouts.password[0].origin,
        'app://keyboard.gaiamobile.org');
    });

    test('Should not insert extra fallback if already available', function() {
      MockKeyboardHelper.fallbackLayouts = {
        number: {
          app: {
            origin: 'app://app-number.gaiamobile.org',
            manifestURL: 'app://app-number.gaiamobile.org/manifest.webapp'
          },
          layoutId: 'number2',
          inputManifest: {
            launch_path: '/settings.html',
            name: 'anotherNumberInput'
          },
          manifest: {
            name: 'anotherNumberInput'
          }
        }
      };

      MockKeyboardHelper.watchCallback(KeyboardHelper.layouts, { apps: true });

      assert.isTrue(KeyboardManager.inputLayouts.layouts.number.every(
        layout => ('number2' !== layout.layoutId &&
                   'pwInput' !== layout.appName &&
                   'app://app-number.gaiamobile.org' !== layout.origin)
      ));
    });
  });

  test('_onKeyboardKilled', function() {
    var fakeFrame_A = {
      manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
      id: 'en'};

    var _setKeyboardToShow =
      this.sinon.stub(KeyboardManager, '_setKeyboardToShow');

    KeyboardManager._showingInputGroup = 'text';

    KeyboardManager._onKeyboardKilled(fakeFrame_A.manifestURL);
    assert.ok(_setKeyboardToShow.calledWith('text'));
  });

  suite('Event handler', function() {
    test('keyboardhide should reset _showingInputGroup', function() {
      var oldShowingInputGroup = KeyboardManager._showingInputGroup;

      KeyboardManager.handleEvent(new CustomEvent('keyboardhide'));

      assert.strictEqual(KeyboardManager._showingInputGroup, null);

      KeyboardManager._showingInputGroup = oldShowingInputGroup;
    });
  });

  suite('Showing & Preloading Keyboard', function() {
    test('setKeyboardToShow', function() {
      KeyboardManager._setKeyboardToShow('text', undefined);

      sinon.assert.called(inputWindowManager.showInputWindow);
    });

    test('_onKeyboardReady', function() {
      this.sinon.stub(KeyboardManager, '_showIMESwitcher');
      KeyboardManager._onKeyboardReady();
      sinon.assert.called(KeyboardManager._showIMESwitcher);
    });

    test('_preloadKeyboard', function() {
      KeyboardManager._preloadKeyboard();

      assert.isTrue(inputWindowManager.preloadInputWindow.called);
    });
  });

  suite('Focus and Blur', function() {
    var imeSwitcherHide;
    setup(function() {
      // prevent _setKeyboardToShow callCount miscalculation
      // due to launch on boot
      inputWindowManager._inputWindows = {
        'app://keyboard.gaiamobile.org/manifest.webapp': {}
      };

      this.sinon.stub(KeyboardManager, '_setKeyboardToShow');
      this.sinon.stub(KeyboardManager, '_showIMESwitcher');
      imeSwitcherHide = this.sinon.stub(KeyboardManager.imeSwitcher, 'hide');
      KeyboardManager.inputLayouts.layouts = {
        text: {
          _activeLayoutIdx: 0
        }
      };
    });

    test('Blur should hide', function() {
      simulateInputChangeEvent('blur');

      sinon.assert.callCount(inputWindowManager.hideInputWindow, 1);
      sinon.assert.notCalled(KeyboardManager._setKeyboardToShow);
      sinon.assert.callCount(imeSwitcherHide, 1,
                             'IMESwitcher.hide should be called');
    });

    test('Focus should show', function() {
      simulateInputChangeEvent('text');

      sinon.assert.notCalled(inputWindowManager.hideInputWindow);
      sinon.assert.callCount(KeyboardManager._setKeyboardToShow, 1);
    });
  });

  test('showIMESwitcher should call IMESwitcher.show properly', function() {
    var oldShowingInputGroup = KeyboardManager._showingInputGroup;
    var oldInputLayouts = KeyboardManager.inputLayouts.layouts;
    KeyboardManager._showingInputGroup = 'text';
    KeyboardManager.inputLayouts.layouts = {
      text: [
        {
          appName: 'DummyApp',
          name: 'DummyKB'
        }
      ]
    };

    KeyboardManager.inputLayouts.layouts.text._activeLayoutIdx = 0;

    var stubIMESwitcherShow =
      this.sinon.stub(KeyboardManager.imeSwitcher, 'show');
    KeyboardManager._showIMESwitcher();

    sinon.assert.calledWith(stubIMESwitcherShow, 'DummyApp', 'DummyKB');

    KeyboardManager._showingInputGroup = oldShowingInputGroup;
    KeyboardManager.inputLayouts.layouts = oldInputLayouts;
  });

  suite('Switching keyboards within same type', function() {
    var oldInputLayouts;
    var oldShowingInputGroup;

    setup(function() {
      oldInputLayouts = KeyboardManager.inputLayouts.layouts;
      KeyboardManager.inputLayouts.layouts = {
        text: [
          {
            name: 'English',
            appName: 'Built-in Keyboard',
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp'
          },{
            name: 'French',
            appName: 'Built-out Keyboard',
            manifestURL: 'app://anotherkb.gaiamobile.org/manifest.webapp'
          },{
            name: 'Chinese',
            appName: 'Built-inout Keyboard',
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp'
          }
        ]
      };

      KeyboardManager.inputLayouts.layouts.text._activeLayoutIdx = 2;

      oldShowingInputGroup = KeyboardManager._showingInputGroup;
      KeyboardManager._showingInputGroup = 'text';
    });

    teardown(function() {
      KeyboardManager._showingInputGroup = oldShowingInputGroup;
      KeyboardManager.inputLayouts.layouts = oldInputLayouts;
    });

    test('showImeMenu / call to ImeMenu', function(){
      var oldMozL10n;
      var stubWaitForSwitchTimeout;
      var stubImeMenuCallback;

      oldMozL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      stubWaitForSwitchTimeout =
        this.sinon.stub(KeyboardManager, '_waitForSwitchTimeout');

      stubImeMenuCallback =
        this.sinon.stub(KeyboardManager, '_imeMenuCallback');

      MockImeMenu.mSetup();

      KeyboardManager._showImeMenu();

      stubWaitForSwitchTimeout.getCall(0).args[0]();

      assert.isTrue(inputWindowManager.hideInputWindow.called);

      var imeMenu = MockImeMenu.instances[0];
      assert.deepEqual(imeMenu.listItems,
        [{
          layoutName: 'English',
          appName: 'Built-in Keyboard',
          value: 0,
          selected: false
        }, {
          layoutName: 'French',
          appName: 'Built-out Keyboard',
          value: 1,
          selected: false
        }, {
          layoutName: 'Chinese',
          appName: 'Built-inout Keyboard',
          value: 2,
          selected: true
        }]);

      imeMenu.onselected();
      imeMenu.oncancel();
      assert.isTrue(stubImeMenuCallback.alwaysCalledWith('text'));
      assert.equal(stubImeMenuCallback.callCount, 2);

      assert.equal(imeMenu.title, 'choose-option');

      imeMenu.mTeardown();

      navigator.mozL10n = oldMozL10n;
    });

    suite('imeMenuCallback', function() {
      var stubSetKeyboardToShow;
      var stubDispatchEvent;

      setup(function() {
        stubSetKeyboardToShow =
          this.sinon.stub(KeyboardManager, '_setKeyboardToShow');
        stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      });

      test('success', function(){
        KeyboardManager._imeMenuCallback('text', 1);
        assert.isTrue(stubSetKeyboardToShow.calledWith('text', 1));
        assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                     'keyboardchanged');
      });

      test('cancel', function(){
        KeyboardManager._imeMenuCallback('text');
        assert.isTrue(stubSetKeyboardToShow.calledWithExactly('text'));
        assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                     'keyboardchangecanceled');
      });
    });

    test('switchToNext', function() {
      var oldShowingInputGroup = KeyboardManager._showingInputGroup;
      KeyboardManager._showingInputGroup = 'text';

      KeyboardManager.inputLayouts.layouts.text._activeLayoutIdx = 2;

      var stubWaitForSwitchTimeout =
        this.sinon.stub(KeyboardManager, '_waitForSwitchTimeout');

      var stubSetKeyboardToShow =
        this.sinon.stub(KeyboardManager, '_setKeyboardToShow');

      KeyboardManager._switchToNext();

      stubWaitForSwitchTimeout.getCall(0).args[0]();

      assert.isTrue(stubSetKeyboardToShow.calledWith('text', 0));

      KeyboardManager._showingInputGroup = oldShowingInputGroup;
    });

    test('waitForSwitchTimeout helper', function(done) {
      var oldSwitchChangeTimeout = KeyboardManager._switchChangeTimeout;
      KeyboardManager._switchChangeTimeout = 1234;

      var stubClearTimeout = this.sinon.stub(window, 'clearTimeout');

      KeyboardManager._waitForSwitchTimeout(function(){
        done();
      });

      assert.isTrue(stubClearTimeout.calledWith(1234));

      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);

      KeyboardManager._switchChangeTimeout = oldSwitchChangeTimeout;
    });
  });

  suite('Switching keyboard layout', function() {
    var _layouts;

    suiteSetup(function() {
      _layouts = KeyboardManager.inputLayouts.layouts;
    });

    suiteTeardown(function() {
      KeyboardManager.inputLayouts.layouts = _layouts;
    });

    setup(function() {
      KeyboardManager.inputLayouts.layouts = {
        'text': [
          { id: 'fk', manifestURL: 'app://fake/manifest.webapp' },
          { id: 'ur', manifestURL: 'app://unreal/manifest.webapp' }
        ]
      };
      KeyboardManager._showingInputGroup = 'text';
    });

    test('Switching stores new layout in settings', function() {
      KeyboardManager.inputLayouts.layouts.text._activeLayoutIdx = 0;
      KeyboardManager.inputLayouts.
        _layoutToGroupMapping['app://unreal/manifest.webapp/ur'] =
          [{
            group: 'text',
            index: 3
          }];

      var stubSaveGroupsCurrentActiveLayout =
        this.sinon.stub(InputLayouts.prototype,
          'saveGroupsCurrentActiveLayout');

      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);

      assert.isTrue(stubSaveGroupsCurrentActiveLayout.calledOnce);
      assert.isTrue(
        stubSaveGroupsCurrentActiveLayout.calledWith(
          {id: 'ur', manifestURL: 'app://unreal/manifest.webapp'}
        )
      );

      stubSaveGroupsCurrentActiveLayout.restore();
    });

    test('Switching calls setKeyboardToShow', function() {
      KeyboardManager._setKeyboardToShow = this.sinon.stub();

      KeyboardManager.inputLayouts.layouts.text._activeLayoutIdx = 1;

      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);

      sinon.assert.callCount(KeyboardManager._setKeyboardToShow, 1);
      sinon.assert.calledWith(KeyboardManager._setKeyboardToShow,
        'text', 0);
    });
  });

  suite('updateLayouts', function() {
    var oldShowingInputGroup;
    var stubProcessLayouts;

    setup(function(){
      oldShowingInputGroup = KeyboardManager._showingInputGroup;
    });

    teardown(function(){
      KeyboardManager._showingInputGroup = oldShowingInputGroup;
    });
    test('updateLayouts calls functions as needed', function() {
      KeyboardManager._showingInputGroup = 'text';

      stubProcessLayouts =
        this.sinon.stub(KeyboardManager.inputLayouts, 'processLayouts');

      stubProcessLayouts.returns(
        new Set(['app://keyboard1.gaiamobila.org/manifest.webapp',
                 'app://keyboard2.gaiamobila.org/manifest.webapp']));

      inputWindowManager.getLoadedManifestURLs.returns([
        'app://keyboard1.gaiamobila.org/manifest.webapp',
        'app://keyboard2.gaiamobila.org/manifest.webapp',
        'app://keyboard3.gaiamobila.org/manifest.webapp',
        'app://keyboard4.gaiamobila.org/manifest.webapp'
      ]);

      KeyboardManager._tryLaunchOnBoot.reset();

      var layouts = [
        {
          app: {
            manifestURL: 'app://keyboard1.gaiamobila.org/manifest.webapp'
          },
        },
        {
          app: {
            manifestURL: 'app://keyboard2.gaiamobila.org/manifest.webapp'
          }
        }
      ];

      KeyboardManager._updateLayouts(layouts);

      assert.isTrue(stubProcessLayouts.calledWith(layouts));

      // updateLayouts is always called at KeyboardManager.start()
      // so we need to check against the last call of updateLayouts

      var lastCallIndex =
        inputWindowManager._onInputLayoutsRemoved.callCount - 1;

      assert.deepEqual(
        inputWindowManager._onInputLayoutsRemoved.getCall(lastCallIndex)
          .args[0],
        ['app://keyboard3.gaiamobila.org/manifest.webapp',
         'app://keyboard4.gaiamobila.org/manifest.webapp'],
        'kb3 and kb4 should be removed'
      );

      assert.isTrue(KeyboardManager._tryLaunchOnBoot.called);
    });

    test('reset showingInputGroup as needed', function() {
      stubProcessLayouts.returns(new Set([]));

      inputWindowManager.getLoadedManifestURLs.returns([]);

      KeyboardManager._showingInputGroup = 'number';

      inputWindowManager._onInputLayoutsRemoved.returns(false);

      KeyboardManager._updateLayouts([]);

      assert.equal(KeyboardManager._showingInputGroup, 'number',
                   `showingInputGroup should not be reset when current layout is
                    not removed`);

      inputWindowManager._onInputLayoutsRemoved.returns(true);

      KeyboardManager._updateLayouts([]);

      assert.strictEqual(KeyboardManager._showingInputGroup, null,
                   `showingInputGroup should be reset when current layout is
                    removed`);
    });
  });
});
