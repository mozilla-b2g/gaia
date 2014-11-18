/*global KeyboardManager, sinon, KeyboardHelper, MockKeyboardHelper,
  MocksHelper, MockNavigatorSettings, Applications, MockL10n,
  MockImeMenu, InputWindowManager, inputWindowManager, TYPE_GROUP_MAPPING */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_applications.js');
require('/test/unit/mock_homescreen_launcher.js');
require('/test/unit/mock_ime_switcher.js');
require('/test/unit/mock_ime_menu.js');
require('/js/input_layouts.js');
require('/js/input_window_manager.js');
require('/js/keyboard_manager.js');

var mocksHelperForKeyboardManager = new MocksHelper([
    'KeyboardHelper',
    'LazyLoader',
    'Applications',
    'IMESwitcher',
    'ImeMenu',
    'L10n'
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

    window.inputWindowManager =
      this.sinon.stub(Object.create(InputWindowManager.prototype));
    inputWindowManager.getLoadedManifestURLs.returns([]);

    KeyboardManager.init();

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
      setup(function() {
        this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts');
        this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');
        MockKeyboardHelper.watchCallback(KeyboardHelper.layouts,
          { apps: true });
      });
      test('Switching from "text" to "number"', function() {
        simulateInputChangeEvent('text');

        simulateInputChangeEvent('number');

        sinon.assert.calledWith(KeyboardManager._setKeyboardToShow, 'text');
        sinon.assert.calledWith(KeyboardManager._setKeyboardToShow, 'number');
      });

      test('Switching from "text" to "text"', function() {
        simulateInputChangeEvent('text');
        simulateInputChangeEvent('text');

        sinon.assert.calledWith(KeyboardManager._setKeyboardToShow, 'text');
      });

      test('Switching from "text" to "select-one"', function() {
        simulateInputChangeEvent('text');
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

        simulateInputChangeEvent('url');
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
      });
      teardown(function() {
        MockKeyboardHelper.watchCallback(KeyboardHelper.layouts,
          { apps: true });
      });
      suite('no defaults enabled', function() {
        setup(function() {
          this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');

          simulateInputChangeEvent('url');

          this.checkDefaults.getCall(0).args[0]();
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
          simulateInputChangeEvent('url');
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
      var mkh, km;

      setup(function() {
        mkh = MockKeyboardHelper;
        km = KeyboardManager;

        TYPE_GROUP_MAPPING.chocola = 'chocola';

        km.inputLayouts.layouts.chocola = [
          { id: 'default', manifestURL: 'app://default' },
          { id: 'trahlah', manifestURL: 'app://yolo' },
          { id: 'another', manifestURL: 'app://yolo' }
        ];
      });

      teardown(function() {
        mkh.getCurrentActiveLayout = function() {};
      });

      test('Selection is present', function() {
        mkh.getCurrentActiveLayout = sinon.stub().returns(
          { id: 'trahlah', manifestURL: 'app://yolo' }
        );

        simulateInputChangeEvent('chocola');

        sinon.assert.calledWith(km._setKeyboardToShow, 'chocola', 1);
      });

      test('Selection is present, multiple from same manifest', function() {
        mkh.getCurrentActiveLayout = sinon.stub().returns(
          { id: 'another', manifestURL: 'app://yolo' }
        );

        simulateInputChangeEvent('chocola');

        sinon.assert.calledWith(km._setKeyboardToShow, 'chocola', 2);
      });

      test('Selection is not present', function() {
        mkh.getCurrentActiveLayout = sinon.stub().returns(
          { id: 'trahlah', manifestURL: 'app://dontexist' }
        );

        simulateInputChangeEvent('chocola');

        sinon.assert.calledWith(km._setKeyboardToShow, 'chocola');
      });

      test('No selection set', function() {
        mkh.getCurrentActiveLayout = sinon.stub().returns(null);

        simulateInputChangeEvent('chocola');

        sinon.assert.callCount(mkh.getCurrentActiveLayout, 1);
        sinon.assert.calledWith(mkh.getCurrentActiveLayout, 'chocola');
        sinon.assert.calledWith(km._setKeyboardToShow, 'chocola');
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

      KeyboardManager.inputLayouts.layouts.text.activeLayout = 0;
      KeyboardManager.inputLayouts.layouts.password.activeLayout = 0;
      KeyboardManager.inputLayouts.layouts.number.activeLayout = 0;
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

    KeyboardManager._showingLayoutInfo.group = 'text';

    KeyboardManager._onKeyboardKilled(fakeFrame_A.manifestURL);
    assert.ok(_setKeyboardToShow.calledWith('text'));
  });

  suite('Event handler', function() {
    test('keyboardhide should call resetShowingLayoutInfo', function() {
      var stubResetShowingLayoutInfo =
        this.sinon.stub(KeyboardManager, '_resetShowingLayoutInfo');

      KeyboardManager.handleEvent(new CustomEvent('keyboardhide'));

      assert.isTrue(stubResetShowingLayoutInfo.called);
    });
  });

  suite('Show Keyboard', function() {
    test('setKeyboardToShow: preload vs. show', function() {
      KeyboardManager._setKeyboardToShow('text', undefined, true);

      sinon.assert.called(
        inputWindowManager.preloadInputWindow
      );
      sinon.assert.notCalled(
        inputWindowManager.showInputWindow
      );

      inputWindowManager.preloadInputWindow.reset();
      inputWindowManager.showInputWindow.reset();

      KeyboardManager._setKeyboardToShow('text', undefined, false);

      sinon.assert.notCalled(
        inputWindowManager.preloadInputWindow
      );
      sinon.assert.called(inputWindowManager.showInputWindow);
    });

    test('_onKeyboardReady', function() {
      this.sinon.stub(KeyboardManager, '_showIMESwitcher');
      KeyboardManager._onKeyboardReady();
      sinon.assert.called(KeyboardManager._showIMESwitcher);
    });

    test('Do not save activeLayout to settings if setKeyboardToShow is called' +
         'with launchOnly=true', function() {
      MockKeyboardHelper.saveCurrentActiveLayout = this.sinon.stub();

      KeyboardManager._setKeyboardToShow('text', undefined, true);

      sinon.assert.notCalled(MockKeyboardHelper.saveCurrentActiveLayout);
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
          activeLayout: {}
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
    var oldShowingLayoutInfo = KeyboardManager._showingLayoutInfo;
    var oldInputLayouts = KeyboardManager.inputLayouts.layouts;
    KeyboardManager._showingLayoutInfo = {
      group: 'text',
      index: 0
    };
    KeyboardManager.inputLayouts.layouts = {
      text: [
        {
          appName: 'DummyApp',
          name: 'DummyKB'
        }
      ]
    };

    var stubIMESwitcherShow =
      this.sinon.stub(KeyboardManager.imeSwitcher, 'show');
    KeyboardManager._showIMESwitcher();

    sinon.assert.calledWith(stubIMESwitcherShow, 'DummyApp', 'DummyKB');

    KeyboardManager._showingLayoutInfo = oldShowingLayoutInfo;
    KeyboardManager.inputLayouts.layouts = oldInputLayouts;
  });

  suite('showingLayoutInfo helpers', function() {
    var layoutInfo;
    setup(function() {
      layoutInfo = KeyboardManager._showingLayoutInfo;
    });
    teardown(function() {
      KeyboardManager._showingLayoutInfo = layoutInfo;
    });
    test('resetShowingLayoutInfo', function(){
      KeyboardManager._showingLayoutInfo = {};
      KeyboardManager._showingLayoutInfo.group = 'dummy';
      KeyboardManager._showingLayoutInfo.index = 0xfff;
      KeyboardManager._showingLayoutInfo.layout = 'something';

      KeyboardManager._resetShowingLayoutInfo();

      assert.equal(KeyboardManager._showingLayoutInfo.group, 'text');
      assert.equal(KeyboardManager._showingLayoutInfo.index, 0);
      assert.strictEqual(KeyboardManager._showingLayoutInfo.layout, null);
    });
    test('setShowingLayoutInfo', function(){
      KeyboardManager._showingLayoutInfo = {};
      KeyboardManager._showingLayoutInfo.group = 'dummy';
      KeyboardManager._showingLayoutInfo.index = 0xfff;
      KeyboardManager._showingLayoutInfo.layout = 'something';

      KeyboardManager._setShowingLayoutInfo('group', 1, 'someLayout');

      assert.equal(KeyboardManager._showingLayoutInfo.group, 'group');
      assert.equal(KeyboardManager._showingLayoutInfo.index, 1);
      assert.equal(KeyboardManager._showingLayoutInfo.layout, 'someLayout');
    });
  });

  suite('Switching keyboards within same type', function() {
    var oldInputLayouts;
    var oldShowingLayoutInfoGroup;

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

      KeyboardManager.inputLayouts.layouts.text.activeLayout = 2;

      oldShowingLayoutInfoGroup = KeyboardManager._showingLayoutInfo.group;
      KeyboardManager._showingLayoutInfo.group = 'text';
    });

    teardown(function() {
      KeyboardManager._showingLayoutInfo.group = oldShowingLayoutInfoGroup;
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
        assert.equal(KeyboardManager.inputLayouts.layouts.text.activeLayout, 1);
        assert.isTrue(stubSetKeyboardToShow.calledWith('text', 1));
        assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                     'keyboardchanged');
      });

      test('cancel', function(){
        KeyboardManager._imeMenuCallback('text');
        assert.equal(KeyboardManager.inputLayouts.layouts.text.activeLayout, 2);
        assert.isTrue(stubSetKeyboardToShow.calledWithExactly('text'));
        assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                     'keyboardchangecanceled');
      });
    });

    suite('switchToNext', function() {
      var oldShowingLayoutInfo;
      var stubWaitForSwitchTimeout;
      var stubSetKeyboardToShow;
      setup(function() {
        oldShowingLayoutInfo = KeyboardManager._showingLayoutInfo;
        KeyboardManager._showingLayoutInfo = {
          type: 'text',
          index: 2,
          layout: {
            name: 'Chinese',
            appName: 'Built-inout Keyboard',
            manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp'
          }
        };

        stubWaitForSwitchTimeout =
          this.sinon.stub(KeyboardManager, '_waitForSwitchTimeout');

        stubSetKeyboardToShow =
          this.sinon.stub(KeyboardManager, '_setKeyboardToShow');
      });

      test('to same kb app', function(){
        KeyboardManager._switchToNext();

        stubWaitForSwitchTimeout.getCall(0).args[0]();

        assert.strictEqual(
          KeyboardManager.inputLayouts.layouts.text.activeLayout, 0);
        assert.isTrue(stubSetKeyboardToShow.calledWith('text', 0));
      });

      test('to different kb app', function(){
        KeyboardManager._showingLayoutInfo.index = 0;

        KeyboardManager._switchToNext();

        stubWaitForSwitchTimeout.getCall(0).args[0]();

        assert.strictEqual(
          KeyboardManager.inputLayouts.layouts.text.activeLayout, 1);
        assert.isTrue(stubSetKeyboardToShow.calledWith('text', 1));
      });
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
      KeyboardManager._showingLayoutInfo.type = 'text';
    });

    test('Switching stores new layout in settings', function() {
      MockKeyboardHelper.saveCurrentActiveLayout = this.sinon.stub();

      KeyboardManager._showingLayoutInfo.index = 0;
      KeyboardManager.inputLayouts.
        _layoutToGroupMapping['app://unreal/manifest.webapp/ur'] =
          [{
            group: 'text',
            index: 3
          }];

      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);

      sinon.assert.callCount(MockKeyboardHelper.saveCurrentActiveLayout, 1);
      sinon.assert.calledWith(MockKeyboardHelper.saveCurrentActiveLayout,
        'text', 'ur', 'app://unreal/manifest.webapp');
    });

    test('Switching calls setKeyboardToShow', function() {
      KeyboardManager._setKeyboardToShow = this.sinon.stub();

      KeyboardManager._showingLayoutInfo.index = 1;

      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);

      sinon.assert.callCount(KeyboardManager._setKeyboardToShow, 1);
      sinon.assert.calledWith(KeyboardManager._setKeyboardToShow,
        'text', 0);
    });
  });

  test('updateLayouts calls functions as needed', function() {
    var oldShowingLayoutInfo = KeyboardManager._showingLayoutInfo;

    KeyboardManager._showingLayoutInfo = {
      layout: {
        manifestURL: 'app://keyboard3.gaiamobila.org/manifest.webapp'
      }
    };

    var stubProcessLayouts =
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

    var stubResetShowingLayoutInfo =
      this.sinon.stub(KeyboardManager, '_resetShowingLayoutInfo');

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

    // updateLayouts is always called at KeyboardManager.init()
    // so we need to check against the last call of updateLayouts

    var lastCallIndex = inputWindowManager._onInputLayoutsRemoved.callCount - 1;

    assert.deepEqual(
      inputWindowManager._onInputLayoutsRemoved.getCall(lastCallIndex).args[0],
      ['app://keyboard3.gaiamobila.org/manifest.webapp',
       'app://keyboard4.gaiamobila.org/manifest.webapp'],
      'kb3 and kb4 should be removed'
    );

    assert.isTrue(stubResetShowingLayoutInfo.calledOnce,
      '_resetShowingLayoutInfo should be called once for kb3');

    assert.isTrue(KeyboardManager._tryLaunchOnBoot.called);

    KeyboardManager._showingLayoutInfo = oldShowingLayoutInfo;
  });
});
