'use strict';

mocha.globals(['openDialog', 'Settings']);
requireApp('settings/test/unit/mock_l10n.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');

requireApp('settings/js/mvvm/models.js');
requireApp('settings/js/mvvm/views.js');
requireApp('settings/js/keyboard.js');

suite('keyboard >', function() {
  var suiteSandbox = sinon.sandbox.create();
  var mockHelper = new MocksHelper([
    'KeyboardHelper',
    'ManifestHelper'
  ]).init();
  mockHelper.attachTestHelpers();
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    suiteSandbox.stub(MockL10n, 'ready');
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    suiteSandbox.restore();
  });

  suite('KeyboardContext', function() {
    /*
     * The raw data used in this test please refer to mock_keyboard_helper.js
     *
     * Keyboards is an observable array of keyboard objects.
     * A keyboard object contains the following properties:
     * - name,
         description,
         launchPath,
         layouts,
         app: an instance of App
     *
     * A layout object is a Observable and contains the following properties:
     * - name,
         appName,
         description,
         types,
         enabled
     */

    var keyboards = null;
    var enabledLayouts = null;

    var keyboardApp1 = null;
    var keyboardApp2 = null;
    var keyboardApp3 = null;
    var layouts = null;

    setup(function(callback) {
      KeyboardContext.init();
      KeyboardContext.keyboards(function(_keyboards) {
        keyboards = _keyboards;

        var keybordsArray = keyboards.array;
        keyboardApp1 = keybordsArray[0];
        keyboardApp2 = keybordsArray[1];
        keyboardApp3 = keybordsArray[2];

        layouts = {
          '0': {
            '0': keyboardApp1.layouts[0],
            '1': keyboardApp1.layouts[1]
          },
          '1': {
            '0': keyboardApp2.layouts[0]
          },
          '2': {
            '0': keyboardApp3.layouts[0]
          }
        };

        KeyboardContext.enabledLayouts(function(_enabledLayouts) {
          enabledLayouts = _enabledLayouts;
          callback();
        });
      });
    });

    teardown(function() {
      keyboards = null;
      enabledLayouts = null;
    });

    suite('keyboards', function() {
      test('Keyboard count', function() {
        assert.isNotNull(keyboardApp1);
        assert.isNotNull(keyboardApp2);
        assert.isNotNull(keyboardApp3);
      });

      test('Keyboard name', function() {
        assert.equal(keyboardApp1.name, 'app1');
        assert.equal(keyboardApp2.name, 'app2');
        assert.equal(keyboardApp3.name, 'app3');
      });

      test('Keyboard description', function() {
        assert.equal(keyboardApp1.description, 'app1');
        assert.equal(keyboardApp2.description, 'app2');
        assert.equal(keyboardApp3.description, 'app3');
      });

      test('Keyboard launch path', function() {
        assert.equal(keyboardApp1.launchPath, '/settings.html');
        assert.equal(keyboardApp2.launchPath, '/settings.html');
        assert.equal(keyboardApp3.launchPath, '/settings.html');
      });

      test('Keyboard layout count', function() {
        assert.equal(keyboardApp1.layouts.length, 2);
        assert.equal(keyboardApp2.layouts.length, 1);
        assert.equal(keyboardApp3.layouts.length, 1);
      });

      test('Layout count', function() {
        // app1
        assert.isNotNull(layouts[0][0]);
        assert.isNotNull(layouts[0][1]);
        // app2
        assert.isNotNull(layouts[1][0]);
        // app3
        assert.isNotNull(layouts[2][0]);
      });

      test('Layout name', function() {
        // app1
        assert.equal(layouts[0][0].name, 'layout1');
        assert.equal(layouts[0][1].name, 'layout2');
        // app2
        assert.equal(layouts[1][0].name, 'layout1');
        // app3
        assert.equal(layouts[2][0].name, 'layout1');
      });

      test('Layout app name', function() {
        // app1
        assert.equal(layouts[0][0].appName, 'app1');
        assert.equal(layouts[0][1].appName, 'app1');
        // app2
        assert.equal(layouts[1][0].appName, 'app2');
        // app3
        assert.equal(layouts[2][0].appName, 'app3');
      });

      test('Layout description', function() {
        // app1
        assert.equal(layouts[0][0].description, 'layout1');
        assert.equal(layouts[0][1].description, 'layout2');
        // app2
        assert.equal(layouts[1][0].description, 'layout1');
        // app3
        assert.equal(layouts[2][0].description, 'layout1');
      });

      test('Layout type', function() {
        // app1
        assert.equal(layouts[0][0].types.length, 2);
        assert.equal(layouts[0][0].types[0], 'url');
        assert.equal(layouts[0][0].types[1], 'text');
        assert.equal(layouts[0][1].types.length, 1);
        assert.equal(layouts[0][1].types[0], 'number');
        // app2
        assert.equal(layouts[1][0].types.length, 1);
        assert.equal(layouts[1][0].types[0], 'url');
        // app3
        assert.equal(layouts[2][0].types.length, 1);
        assert.equal(layouts[2][0].types[0], 'number');
      });
    });

    suite('enabledLayouts', function() {
      setup(function() {
        this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');
      });
      var isActuallyEnabled = function(targetLayout) {
        var found = false;
        enabledLayouts.forEach(function(layout) {
          if (layout === targetLayout) {
            found = true;
          }
        });
        return found;
      };

      test('Default enabled layout', function(callback) {
        KeyboardContext.enabledLayouts(function(_enabledLayouts) {
          var layout1 = _enabledLayouts.get(0);
          var layout2 = _enabledLayouts.get(1);

          assert.equal(_enabledLayouts.length, 2);
          assert.equal(layout1.appName, layouts[0][0].appName);
          assert.equal(layout1.name, layouts[0][0].name);
          assert.equal(layout2.appName, layouts[2][0].appName);
          assert.equal(layout2.name, layouts[2][0].name);

          callback();
        });
      });

      // The following tests do a series of actions and check if the layouts are
      // enabled/disabled accordingly.
      test('Disable app1 layout1', function() {
        var targetLayout = layouts[0][0];
        targetLayout.enabled = false;
        KeyboardHelper.saveToSettings();

        assert.isFalse(isActuallyEnabled(targetLayout));
        assert.isTrue(this.checkDefaults.called);
      });

      test('Enable app1 layout1', function() {
        var targetLayout = layouts[0][0];
        targetLayout.enabled = true;
        KeyboardHelper.saveToSettings();

        assert.isTrue(isActuallyEnabled(targetLayout));
        // don't check defaults when enabling a keyboard
        assert.isFalse(this.checkDefaults.called);
      });

      test('Disable app1 layout1', function() {
        var targetLayout = layouts[0][0];
        targetLayout.enabled = false;
        KeyboardHelper.saveToSettings();

        assert.isFalse(isActuallyEnabled(targetLayout));
        assert.isTrue(this.checkDefaults.called);
      });

      test('Enable app1 layout2', function() {
        var targetLayout = layouts[0][1];
        targetLayout.enabled = true;
        KeyboardHelper.saveToSettings();

        assert.isTrue(isActuallyEnabled(targetLayout));
        // don't check defaults when enabling a keyboard
        assert.isFalse(this.checkDefaults.called);
      });

      test('Enable app2 layout1', function() {
        var targetLayout = layouts[1][0];
        targetLayout.enabled = true;
        KeyboardHelper.saveToSettings();

        assert.isTrue(isActuallyEnabled(targetLayout));
        // don't check defaults when enabling a keyboard
        assert.isFalse(this.checkDefaults.called);
      });

      test('Disable app3 layout1', function() {
        var targetLayout = layouts[2][0];
        targetLayout.enabled = false;
        KeyboardHelper.saveToSettings();

        assert.isFalse(isActuallyEnabled(targetLayout));
        assert.isTrue(this.checkDefaults.called);
      });

      test('Disable app2 layout1', function() {
        var targetLayout = layouts[1][0];
        targetLayout.enabled = false;
        KeyboardHelper.saveToSettings();

        assert.isFalse(isActuallyEnabled(targetLayout));
        assert.isTrue(this.checkDefaults.called);
      });

      suite('Checks defaults', function() {
        setup(function() {
          layouts[0][0].enabled = false;
          this.defaultCallback = this.sinon.spy();
          KeyboardContext.defaultKeyboardEnabled(this.defaultCallback);
        });
        test('calls checkDefaults', function() {
          assert.isTrue(this.checkDefaults.called);
        });
        suite('default enabled', function() {
          setup(function() {
            this.layout = {};
            this.checkDefaults.yield([this.layout]);
          });
          test('calls callback with enabled layout', function() {
            assert.ok(this.defaultCallback.calledWith(this.layout));
          });
        });
      });
    });
  });

  suite('DefaultKeyboardEnabledDialog', function() {
    setup(function() {
      this.defaultKeyboardEnabled =
        this.sinon.stub(KeyboardContext, 'defaultKeyboardEnabled');
      DefaultKeyboardEnabledDialog.init();
    });
    test('attach listener method on initialization', function() {
      assert.ok(
        this.defaultKeyboardEnabled.calledWith(
          DefaultKeyboardEnabledDialog.show
        )
      );
    });
    suite('show(layout)', function() {
      setup(function() {
        this.title = document.createElement('h1');
        this.title.id = 'keyboard-default-title';
        document.body.appendChild(this.title);

        this.text = document.createElement('p');
        this.text.id = 'keyboard-default-text';
        document.body.appendChild(this.text);

        this.get = this.sinon.spy(navigator.mozL10n, 'get');
        this.localize = this.sinon.stub(navigator.mozL10n, 'localize');
        this.openDialog = this.sinon.stub(window, 'openDialog');

        DefaultKeyboardEnabledDialog.show({
          manifest: { name: 'appName' },
          inputManifest: {
            types: ['url', 'text'],
            name: 'layoutName'
          }
        });
      });
      teardown(function() {
        document.body.removeChild(this.title);
        document.body.removeChild(this.text);
      });
      test('localizes title with type', function() {
        // gets localized string for type
        assert.isTrue(this.get.calledWith('keyboardType-text'));
        // localizes element
        assert.deepEqual(this.localize.args[0], [
          this.title,
          'mustHaveOneKeyboard',
          { type: 'keyboardType-text' }
        ]);
      });
      test('localizes text with layout details', function() {
        // gets localized string for type
        assert.isTrue(this.get.calledWith('keyboardType-text'));
        // localizes element
        assert.deepEqual(this.localize.args[1], [
          this.title,
          'defaultKeyboardEnabled',
          { appName: 'appName', layoutName: 'layoutName' }
        ]);
      });
      test('calls openDialog', function() {
        assert.ok(this.openDialog.calledWith('keyboard-enabled-default'));
      });
    });
  });

  suite('InstalledLayoutsPanel', function() {
    var realSettings;
    var MockSettings = {
      currentPanel: null
    };

    suiteSetup(function() {
      realSettings = window.Settings;
      window.Settings = MockSettings;
      Settings.currentPanel = '#root';

      this.container = document.createElement('div');
      this.container.id = 'keyboardAppContainer';
      document.body.appendChild(this.container);
    });

    suiteTeardown(function() {
      window.Settings = realSettings;
      MockSettings = null;

      document.body.removeChild(this.container);
    });

    test('Save to settings when leaving panel', function() {
      var saveToSettingsStub =
        this.sinon.stub(KeyboardHelper, 'saveToSettings');

      // Init the panel.
      // The panel is visible as 'currentPanel' is #keyboard-selection-addMore.
      MockSettings.currentPanel = '#keyboard-selection-addMore';
      InstalledLayoutsPanel.init('#keyboard-selection-addMore');

      // Change to other panel
      MockSettings.currentPanel = '#other-panel';
      var event = new CustomEvent('panelready');
      window.dispatchEvent(event);

      assert.isTrue(saveToSettingsStub.called);
    });
  });
});
