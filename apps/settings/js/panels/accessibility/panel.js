/**
 * The accessibility panel
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsPanel = require('modules/settings_panel');

  return function ctor_accessibilityPanel() {
    var _screenReaderDesc;
    var _colorFilterDesc;
    var _audioDesc;

    return SettingsPanel({
      onInit: function accessibilityPanel_onInit(rootElement) {
        _screenReaderDesc = rootElement.querySelector('#screenReader-desc');
        _colorFilterDesc = rootElement.querySelector('#colorFilter-desc');
        _audioDesc = rootElement.querySelector('#audio-desc');

        SettingsListener.observe('accessibility.screenreader', false,
          function(enabled) {
            _screenReaderDesc.setAttribute('data-l10n-id',
              enabled ? 'enabled' : 'disabled');
        });

        SettingsListener.observe('accessibility.colors.enable', false,
          function(enabled) {
            _colorFilterDesc.setAttribute('data-l10n-id',
              enabled ? 'enabled' : 'disabled');
        });

        SettingsListener.observe('accessibility.monoaudio.enable', false,
          function(enabled) {
            _audioDesc.setAttribute('data-l10n-id',
              enabled ? 'mono-enabled' : 'mono-disabled');
        });
      }
    });
  };
});
