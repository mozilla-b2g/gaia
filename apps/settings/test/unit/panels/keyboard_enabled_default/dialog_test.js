/* globals MockL10n */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');

suite('KeyboardEnabledDefaultDialog', function() {
  var realL10n;
  var map = {
    'panels/keyboard_enabled_default/dialog': {
      'modules/settings_panel': 'unit/mock_settings_panel',
      'modules/settings_service': 'unit/mock_settings_service'
    }
  };

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  setup(function(done) {
    testRequire([
      'panels/keyboard_enabled_default/dialog',
      'unit/mock_settings_service',
      'unit/mock_settings_panel'
    ], map,
    (function(KeyboardEnabledDefaultDialog, MockSettingsService,
      MockSettingsPanel) {
        this.KeyboardEnabledDefaultDialog = KeyboardEnabledDefaultDialog;
        this.MockSettingsPanel = MockSettingsPanel;
        this.MockSettingsPanel.mInnerFunction = function(options) {
          return {
            beforeShow: options.onBeforeShow
          };
        };

        this.mockOptions = {
          layout: {
            manifest: { name: 'appName' },
            inputManifest: {
              types: ['url', 'text'],
              name: 'layoutName'
            }
          },
          missingType: 'text',
          origin: 'mock_origin'
        };

        this.title = document.createElement('h1');
        this.title.className = 'keyboard-default-title';
        document.body.appendChild(this.title);

        this.text = document.createElement('p');
        this.text.className = 'keyboard-default-text';
        document.body.appendChild(this.text);

        this.submit = document.createElement('button');
        this.submit.setAttribute('type', 'submit');
        document.body.appendChild(this.submit);

        this.get = this.sinon.spy(navigator.mozL10n, 'get');
        this.setAttributes = this.sinon.stub(navigator.mozL10n,
                                             'setAttributes');

        this.MockSettingsService = MockSettingsService;
        sinon.spy(this.MockSettingsService, 'navigate');
        this.KeyboardEnabledDefaultDialog()
          .beforeShow(document.body, this.mockOptions);

        done();
    }).bind(this));
  });

  teardown(function() {
    this.MockSettingsService.navigate.restore();

    document.body.removeChild(this.title);
    document.body.removeChild(this.text);
    document.body.removeChild(this.submit);
  });

  suite('onBeforeShow(layout)', function() {
    test('localizes title with type', function() {
      // gets localized string for type
      assert.isTrue(this.get.calledWith('keyboardType-text'));
      // localizes element
      assert.deepEqual(this.setAttributes.args[0], [
        this.title,
        'mustHaveOneKeyboard',
        { type: 'keyboardType-text' }
      ]);
    });

    test('localizes text with layout details', function() {
      // gets localized string for type
      assert.isTrue(this.get.calledWith('keyboardType-text'));
      // localizes element
      assert.deepEqual(this.setAttributes.args[1], [
        this.title,
        'defaultKeyboardEnabled',
        { appName: 'appName', layoutName: 'layoutName' }
      ]);
    });

    test('should navigate back to the origin when submitted', function() {
      this.submit.onclick();
      sinon.assert.calledWith(this.MockSettingsService.navigate,
        this.mockOptions.origin);
    });
  });
});
