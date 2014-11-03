/*global KeyboardManager, sinon, KeyboardHelper, MockKeyboardHelper,
  MocksHelper, MockNavigatorSettings, Applications, Promise, MockL10n,
  MockImeMenu, TYPE_GROUP_MAPPING */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_applications.js');
require('/test/unit/mock_homescreen_launcher.js');
require('/test/unit/mock_ime_switcher.js');
require('/test/unit/mock_input_frame_manager.js');
require('/test/unit/mock_ime_menu.js');
require('/js/input_layouts.js');
require('/js/keyboard_manager.js');

var mocksHelperForKeyboardManager = new MocksHelper([
    'SettingsListener',
    'KeyboardHelper',
    'LazyLoader',
    'Applications',
    'IMESwitcher',
    'InputFrameManager',
    'ImeMenu',
    'L10n'
]).init();

suite('KeyboardManager', function() {
  var SWITCH_CHANGE_DELAY = 20;

  function trigger(event, detail) {
    if (!detail) {
      detail = {};
    }
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, true, false, detail);
    window.dispatchEvent(evt);
  }

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
  var realKeyboard = null;
  var realGetFeature = null;

  suiteSetup(function() {
    document.body.innerHTML += '<div id="run-container"></div>';
    navigator.mozSettings = MockNavigatorSettings;

    realKeyboard = window.navigator.mozInputMethod;
    window.navigator.mozInputMethod = {
      removeFocus: function() {}
    };

    realGetFeature = window.navigator.getFeature;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    window.navigator.mozInputMethod = realKeyboard;
    window.navigator.getFeature = realGetFeature;
  });

  setup(function() {
    // we use sinon's fake timers for all the tests so that the timeouts used in
    // the tested code in one test don't disturb the next test.
    this.sinon.useFakeTimers();

    setupHTML();

    // stub this such that the mocked SettingListener's callback would not
    // trigger out of the blue when sinon fake timer advances
    this.sinon.stub(KeyboardManager, '_tryLaunchOnBoot');

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

    window.navigator.getFeature = this.sinon.stub();
    window.navigator.getFeature.returns(Promise.resolve(1024));
  });

  suite('Switching keyboard focus', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, 'hideKeyboard');
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

        sinon.assert.called(KeyboardManager.hideKeyboard);
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
    var stubShowInputWindow;
    setup(function() {
      stubShowInputWindow =
        this.sinon.stub(KeyboardManager.inputFrameManager, 'showInputWindow');

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
      assert.isTrue(stubShowInputWindow.calledWith({
         manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
         id: 'en'
      }), 'should change to first text layout');

      stubShowInputWindow.reset();

      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);
      assert.isTrue(stubShowInputWindow.calledWith({
         manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
         id: 'fr'
      }), 'should change to second text layout');

      stubShowInputWindow.reset();

      KeyboardManager._setKeyboardToShow('password');
      assert.isTrue(stubShowInputWindow.calledWith({
         manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
         id: 'fr'
      }), 'should change to second password layout');
    });

    test('change to text and to number and to password', function() {
      KeyboardManager._setKeyboardToShow('text');
      assert.isTrue(stubShowInputWindow.calledWith({
         manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
         id: 'en'
      }), 'should change to first text layout');

      stubShowInputWindow.reset();
      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);

      assert.isTrue(stubShowInputWindow.calledWith({
         manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
         id: 'fr'
      }), 'should change to second text layout');

      stubShowInputWindow.reset();

      KeyboardManager._setKeyboardToShow('number');

      stubShowInputWindow.reset();

      KeyboardManager._setKeyboardToShow('password');
      assert.isTrue(stubShowInputWindow.calledWith({
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'fr'
      }), 'should change to second password layout');
    });

    test('change to text, blur, and to password', function() {
      KeyboardManager._setKeyboardToShow('text');
      assert.isTrue(stubShowInputWindow.calledWith({
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en'
      }), 'should change to first text layout');

      stubShowInputWindow.reset();
      KeyboardManager._switchToNext();
      this.sinon.clock.tick(SWITCH_CHANGE_DELAY);

       assert.isTrue(stubShowInputWindow.calledWith({
         manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
         id: 'fr'
       }), 'should change to second text layout');

      simulateInputChangeEvent('blur');

      stubShowInputWindow.reset();

      KeyboardManager._setKeyboardToShow('password');
      assert.isTrue(stubShowInputWindow.calledWith({
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'fr'
      }), 'should change to second password layout');
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

  suite('removeKeyboard test', function() {
    var fakeFrame_A, fakeFrame_B;
    setup(function() {
      fakeFrame_A = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en'};

      fakeFrame_B = {
        manifestURL: 'app://keyboard-test.gaiamobile.org/manifest.webapp',
        id: 'en'};
    });

    test('Not in showingLayoutInfo', function() {
      var hideKeyboard = this.sinon.stub(KeyboardManager, 'hideKeyboard');
      var stubManagerRemoveKB =
        this.sinon.stub(KeyboardManager.inputFrameManager, 'removeKeyboard');

      KeyboardManager.removeKeyboard(fakeFrame_B.manifestURL);
      sinon.assert.callCount(hideKeyboard, 0);
      assert.ok(stubManagerRemoveKB.calledWith(
        'app://keyboard-test.gaiamobile.org/manifest.webapp'
      ));
    });

    test('In showingLayoutInfo', function() {
      var hideKeyboard = this.sinon.stub(KeyboardManager, 'hideKeyboard');
      var _setKeyboardToShow =
        this.sinon.stub(KeyboardManager, '_setKeyboardToShow');

      KeyboardManager._showingLayoutInfo.group = 'text';
      KeyboardManager._showingLayoutInfo.layout = {
        manifestURL: fakeFrame_A.manifestURL
      };
      KeyboardManager.removeKeyboard(fakeFrame_A.manifestURL, true);
      sinon.assert.callCount(hideKeyboard, 1);
      assert.ok(_setKeyboardToShow.calledWith('text'));
    });
  });

  suite('Event handler', function() {
    var hideKeyboardImmediately, removeKeyboard, hideKeyboard;
    setup(function() {
      hideKeyboard = this.sinon.stub(KeyboardManager, 'hideKeyboard');
      hideKeyboardImmediately =
            this.sinon.stub(KeyboardManager, 'hideKeyboardImmediately');
      removeKeyboard = this.sinon.stub(KeyboardManager, 'removeKeyboard');
      this.sinon.stub(KeyboardManager, '_showIMESwitcher');
    });

    test('OOM event', function() {
      var fakeFrame = document.createElement('div');
      var fakeManifestURL = 'app://keyboard.gaiamobile.org/manifest.webapp';

      fakeFrame.dataset.frameManifestURL = fakeManifestURL;
      KeyboardManager.handleEvent({
        type: 'mozbrowsererror',
        target: fakeFrame
      });
      assert.ok(removeKeyboard.calledWith(fakeManifestURL));
    });

    test('attentionrequestopen event', function() {
      trigger('attentionrequestopen');

      sinon.assert.callCount(hideKeyboardImmediately, 1);
    });

    test('attentionrecovering event', function() {
      trigger('attentionrecovering');

      sinon.assert.callCount(hideKeyboardImmediately, 1);
    });

    test('activityclosing event', function() {
      trigger('activityclosing');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('activityopening event', function() {
      trigger('activityopening');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('activityrequesting event', function() {
      trigger('activityrequesting');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('applicationsetupdialogshow event', function() {
      trigger('applicationsetupdialogshow');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('notification clicked event', function() {
      trigger('notification-clicked');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('sheets-gesture-begin event: do nothing if no keyboard', function() {
      var spy = this.sinon.spy(navigator.mozInputMethod, 'removeFocus');
      trigger('sheets-gesture-begin');
      assert.ok(spy.notCalled);
    });

    test('sheets-gesture-begin event: hide keyboard if needed', function() {
      this.sinon.stub(KeyboardManager.inputFrameManager, 'hasActiveKeyboard')
        .returns(true);
      var spy = this.sinon.spy(navigator.mozInputMethod, 'removeFocus');
      trigger('sheets-gesture-begin');
      sinon.assert.calledOnce(spy);

      KeyboardManager.inputFrameManager.hasActiveKeyboard.restore();
    });

    test('lock event: do nothing if no keyboard', function() {
      var spy = this.sinon.spy(navigator.mozInputMethod, 'removeFocus');
      trigger('lockscreen-appopened');
      assert.ok(spy.notCalled);
    });

    test('lock event: hide keyboard if needed', function() {
      this.sinon.stub(KeyboardManager.inputFrameManager, 'hasActiveKeyboard')
        .returns(true);
      var spy = this.sinon.spy(navigator.mozInputMethod, 'removeFocus');
      trigger('lockscreen-appopened');
      sinon.assert.calledOnce(spy);

      KeyboardManager.inputFrameManager.hasActiveKeyboard.restore();
    });
  });

  suite('Show Keyboard', function() {
    test('setKeyboardToShow: preload vs. show', function() {
      this.sinon.stub(KeyboardManager.inputFrameManager, 'preloadInputWindow');
      this.sinon.stub(KeyboardManager.inputFrameManager, 'showInputWindow');

      KeyboardManager._setKeyboardToShow('text', undefined, true);

      sinon.assert.called(KeyboardManager.inputFrameManager.preloadInputWindow);
      sinon.assert.notCalled(KeyboardManager.inputFrameManager.showInputWindow);

      KeyboardManager.inputFrameManager.preloadInputWindow.reset();
      KeyboardManager.inputFrameManager.showInputWindow.reset();

      KeyboardManager._setKeyboardToShow('text', undefined, false);

      sinon.assert.notCalled(
        KeyboardManager.inputFrameManager.preloadInputWindow
      );
      sinon.assert.called(KeyboardManager.inputFrameManager.showInputWindow);

      KeyboardManager.inputFrameManager.preloadInputWindow.restore();
      KeyboardManager.inputFrameManager.showInputWindow.restore();
    });

    test('_onKeyboardReady', function() {
      this.sinon.stub(KeyboardManager, '_showIMESwitcher');
      KeyboardManager._onKeyboardReady();
      sinon.assert.called(KeyboardManager._showIMESwitcher);
    });
  });

  suite('Hide Keyboard', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, '_resetShowingLayoutInfo');
    });

    teardown(function() {
      KeyboardManager._resetShowingLayoutInfo.restore();
    });

    test('hide', function() {
      this.sinon.stub(KeyboardManager.inputFrameManager, 'hideInputWindow');
      KeyboardManager.hideKeyboard();
      sinon.assert.called(KeyboardManager.inputFrameManager.hideInputWindow);
      sinon.assert.called(KeyboardManager._resetShowingLayoutInfo);
      KeyboardManager.inputFrameManager.hideInputWindow.restore();
    });

    test('hideImmediately', function() {
      this.sinon.stub(KeyboardManager.inputFrameManager,
        'hideInputWindowImmediately');
      KeyboardManager.hideKeyboardImmediately();
      sinon.assert.called(
        KeyboardManager.inputFrameManager.hideInputWindowImmediately
      );
      sinon.assert.called(
        KeyboardManager._resetShowingLayoutInfo
      );
      KeyboardManager.inputFrameManager.hideInputWindowImmediately.restore();
    });
  });

  suite('Focus and Blur', function() {
    var imeSwitcherHide;
    setup(function() {
      // prevent _setKeyboardToShow callCount miscalculation
      // due to launch on boot
      KeyboardManager.inputFrameManager._inputWindows[
        'app://keyboard.gaiamobile.org/manifest.webapp'
      ] = {};

      this.sinon.stub(KeyboardManager, 'hideKeyboard');
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

      sinon.assert.callCount(KeyboardManager.hideKeyboard, 1);
      sinon.assert.notCalled(KeyboardManager._setKeyboardToShow);
      sinon.assert.callCount(imeSwitcherHide, 1,
                             'IMESwitcher.hide should be called');
    });

    test('Focus should show', function() {
      simulateInputChangeEvent('text');

      sinon.assert.notCalled(KeyboardManager.hideKeyboard);
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
      var stubHideKeyboard;
      var stubImeMenuCallback;

      oldMozL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      stubWaitForSwitchTimeout =
        this.sinon.stub(KeyboardManager, '_waitForSwitchTimeout');

      stubHideKeyboard = this.sinon.stub(KeyboardManager, 'hideKeyboard');

      stubImeMenuCallback =
        this.sinon.stub(KeyboardManager, '_imeMenuCallback');

      MockImeMenu.mSetup();

      KeyboardManager._showImeMenu();

      stubWaitForSwitchTimeout.getCall(0).args[0]();

      assert.isTrue(stubHideKeyboard.called);

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
});
