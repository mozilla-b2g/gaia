define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SettingsService = require('modules/settings_service');

  var onBeforeShow = function ked_onBeforeShow(rootElement, options) {
    var layout = options.layout;
    var l10n = navigator.mozL10n;
    l10n.setAttributes(
      rootElement.querySelector('.keyboard-default-title'),
      'mustHaveOneKeyboard',
      {
        type: l10n.get('keyboardType-' + options.missingType)
      }
    );
    l10n.setAttributes(
      rootElement.querySelector('.keyboard-default-text'),
      'defaultKeyboardEnabled',
      {
        layoutName: layout.inputManifest.name,
        appName: layout.manifest.name
      }
    );

    rootElement.querySelector('button[type="submit"]').onclick =
      function onsubmit() {
        SettingsService.navigate(options.origin);
    };
  };

  return function ctor_keyboardEnabledDefaultDialog() {
    return SettingsPanel({
      onBeforeShow: onBeforeShow
    });
  };
});
