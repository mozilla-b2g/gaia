/* globals MocksHelper, MockKeyboardHelper */
'use strict';

require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');

suite('KeyboardContext', function() {
  var mockHelper = new MocksHelper([
    'KeyboardHelper',
    'ManifestHelper'
  ]).init();
  mockHelper.attachTestHelpers();

  suiteSetup(function(done) {
    var map = {
      'modules/keyboard_context': {
        'shared/keyboard_helper': 'shared_mocks/mock_keyboard_helper',
        'shared/manifest_helper': 'shared_mocks/mock_manifest_helper'
      }
    };

    testRequire(['modules/keyboard_context'], map, (function(KeyboardContext) {
      this.KeyboardContext = KeyboardContext;
      done();
    }).bind(this));
  });

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
    this.KeyboardContext.init();
    this.KeyboardContext.keyboards((function(_keyboards) {
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

      this.KeyboardContext.enabledLayouts(function(_enabledLayouts) {
        enabledLayouts = _enabledLayouts;
        callback();
      });
    }).bind(this));
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
      this.checkDefaults =
        this.sinon.stub(MockKeyboardHelper, 'checkDefaults');
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
      this.KeyboardContext.enabledLayouts(function(_enabledLayouts) {
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
      MockKeyboardHelper.saveToSettings();

      assert.isFalse(isActuallyEnabled(targetLayout));
      assert.isTrue(this.checkDefaults.called);
    });

    test('Enable app1 layout1', function() {
      var targetLayout = layouts[0][0];
      targetLayout.enabled = true;
      MockKeyboardHelper.saveToSettings();

      assert.isTrue(isActuallyEnabled(targetLayout));
      // don't check defaults when enabling a keyboard
      assert.isFalse(this.checkDefaults.called);
    });

    test('Disable app1 layout1', function() {
      var targetLayout = layouts[0][0];
      targetLayout.enabled = false;
      MockKeyboardHelper.saveToSettings();

      assert.isFalse(isActuallyEnabled(targetLayout));
      assert.isTrue(this.checkDefaults.called);
    });

    test('Enable app1 layout2', function() {
      var targetLayout = layouts[0][1];
      targetLayout.enabled = true;
      MockKeyboardHelper.saveToSettings();

      assert.isTrue(isActuallyEnabled(targetLayout));
      // don't check defaults when enabling a keyboard
      assert.isFalse(this.checkDefaults.called);
    });

    test('Enable app2 layout1', function() {
      var targetLayout = layouts[1][0];
      targetLayout.enabled = true;
      MockKeyboardHelper.saveToSettings();

      assert.isTrue(isActuallyEnabled(targetLayout));
      // don't check defaults when enabling a keyboard
      assert.isFalse(this.checkDefaults.called);
    });

    test('Disable app3 layout1', function() {
      var targetLayout = layouts[2][0];
      targetLayout.enabled = false;
      MockKeyboardHelper.saveToSettings();

      assert.isFalse(isActuallyEnabled(targetLayout));
      assert.isTrue(this.checkDefaults.called);
    });

    test('Disable app2 layout1', function() {
      var targetLayout = layouts[1][0];
      targetLayout.enabled = false;
      MockKeyboardHelper.saveToSettings();

      assert.isFalse(isActuallyEnabled(targetLayout));
      assert.isTrue(this.checkDefaults.called);
    });

    suite('Checks defaults', function() {
      setup(function() {
        layouts[0][0].enabled = false;
        this.defaultCallback = this.sinon.spy();
        this.missingTypes = [];
        this.KeyboardContext.defaultKeyboardEnabled(this.defaultCallback,
          this.missingTypes);
      });
      test('calls checkDefaults', function() {
        assert.isTrue(this.checkDefaults.called);
      });
      suite('default enabled', function() {
        setup(function() {
          this.layout = {};
          this.checkDefaults.yield([this.layout], [this.missingTypes]);
        });
        test('calls callback with enabled layout', function() {
          assert.ok(this.defaultCallback.calledWith(this.layout));
        });
      });
    });
  });
});
