/**
 * The accessibility screen reader panel
 */

define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsPanel = require('modules/settings_panel');
  var SettingsCache = require('modules/settings_cache');
  var ConfirmDialog = require(
    'panels/accessibility_screenreader/confirm_dialog');

  var kEnabledKey = 'accessibility.screenreader';

  return function ctor_accessibility_screenreader_panel() {
    var _screenreaderSwitch;
    return SettingsPanel({
      onInit: function asr_onInit(rootElement) {
        _screenreaderSwitch =
          rootElement.querySelector('#screenreader-enable gaia-switch');
        var dialogContainer = rootElement.querySelector(
          '#screenreader-confirm-dialog');

        ConfirmDialog.init({
          container: dialogContainer,
          confirmButton: dialogContainer.querySelector('button.danger'),
          heading: dialogContainer.querySelector('h1'),
          text: dialogContainer.querySelector('p')});

        _screenreaderSwitch.addEventListener('click', event => {
          event.preventDefault();
          SettingsCache.getSettings(function(results) {
            ConfirmDialog.show(!results[kEnabledKey]);
          });
        });

        SettingsListener.observe(kEnabledKey, false, function(value) {
          _screenreaderSwitch.checked = value;
        });
      }
    });
  };
});
