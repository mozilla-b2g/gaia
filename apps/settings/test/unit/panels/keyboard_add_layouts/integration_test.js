/* globals MocksHelper */
'use strict';

require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');

suite('KeyboardAddLayoutsPanel', function() {
  var realL10n;
  var map = {
    '*': {
      'shared/manifest_helper': 'shared_mocks/mock_manifest_helper',
      'shared/keyboard_helper': 'shared_mocks/mock_keyboard_helper',
      'modules/settings_panel': 'unit/mock_settings_panel',
      'modules/settings_service': 'unit/mock_settings_service'
    }
  };

  var mockHelper = new MocksHelper([
    'KeyboardHelper',
    'ManifestHelper'
  ]).init();
  mockHelper.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function() {}
    };

    testRequire([
      'modules/keyboard_context',
      'panels/keyboard_add_layouts/panel',
      'unit/mock_settings_panel'
    ], map,
    (function(KeyboardContext, KeyboardAddLayoutsPanel, MockSettingsPanel) {
      this.KeyboardContext = KeyboardContext;
      this.KeyboardAddLayoutsPanel = KeyboardAddLayoutsPanel;
      this.MockSettingsPanel = MockSettingsPanel;
      this.MockSettingsPanel.mInnerFunction = function(options) {
        return {
          init: options.onInit,
          beforeShow: options.onBeforeShow,
          beforeHide: options.onBeforeHide,
          hide: options.onHide
        };
      };
      done();
    }).bind(this));
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    this.MockSettingsPanel.mTeardown();
  });

  suite('KeyboardAddLayoutsPanel', function() {
    var keyboards;

    setup(function(done) {
      this.root = document.createElement('div');
      this.root.id = 'keyboard-selection-addMore';
      this.container = document.createElement('div');
      this.container.className = 'keyboardAppContainer';
      this.root.appendChild(this.container);
      document.body.appendChild(this.root);
      this.KeyboardContext.init();
      this.KeyboardContext.keyboards(function(_keyboards) {
        keyboards = _keyboards;
        done();
      });
    });

    teardown(function() {
      document.body.removeChild(this.root);
    });

    suite('Shows all Keyboards and Layouts', function() {
      setup(function() {
        this.KeyboardAddLayoutsPanel().init(this.root);
      });

      function checkDom(container) {
        var elements = Array.prototype.slice.apply(container.children);
        assert.equal(elements.length, keyboards.length);

        elements.forEach(function(element, index) {
          var keyboard = keyboards.get(index);
          assert.equal(
            element.querySelector('h2').textContent,
            keyboard.name,
            'keyboards[' + index + '] name correct'
          );

          var ul = element.querySelector('ul');
          var children = Array.prototype.slice.apply(ul.children);
          children.forEach(function(li, index2) {
            assert.equal(
              li.querySelector('label').textContent,
              keyboard.layouts[index2].name,
              'keyboards[' + index + '].layouts[' + index2 + '] name correct'
            );
          });
        });
      }

      test('creates a div for each keyboard', function() {
        checkDom(this.container);
      });
      test('removing and adding keyboards creates dom', function() {
        var temp = keyboards.get(1);
        keyboards.splice(1, 1);
        checkDom(this.container);

        keyboards.splice(1, 0, temp);
        checkDom(this.container);
      });
      test('keyboards properly observe', function() {
        var keyboard = keyboards.get(1);
        var keyboardContainer = this.container.children[1];

        keyboard.name = 'test';
        assert.equal(
          keyboardContainer.querySelector('h2').textContent,
          'test'
        );

        keyboard.layouts[0].name = 'test';
        assert.equal(keyboardContainer
          .querySelector('li:nth-child(1) gaia-checkbox').textContent,
          'test'
        );

        var enabled = !keyboard.layouts[0].enabled;
        keyboard.layouts[0].enabled = enabled;
        assert.equal(
          keyboardContainer.querySelector(
            'li:nth-child(1) gaia-checkbox').checked,
          enabled
        );
      });
      test('click event on checkbox changes enabled', function() {
        var layout = keyboards.get(0).layouts[0];
        var checkbox = this.container.children[1]
                          .querySelector('li:nth-child(1) gaia-checkbox');
        checkbox.checked = !checkbox.checked;
        // might want to fire this as a custom event some day
        checkbox.dispatchEvent(new CustomEvent('change'));
        assert.equal(layout.enabled, checkbox.checked);
      });
    });
  });
});
