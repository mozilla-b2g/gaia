/* global Customizer */
'use strict';

var KeyboardSettingsCustomizer = (function() {
  Customizer.call(this, 'keyboard_settings', 'json');

  this.set = function(keybrdParams) {
    if (!this.simPresentOnFirstBoot) {
      console.log('KeyboardSettingsCustomizer. ' +
                  'Skipping configuration since there was no SIM at first run');
      return;
    }

    var settings = navigator.mozSettings;
    if (!settings) {
      console.error('KeyboardSettingsCustomizer. Settings is not available');
      return;
    }

    function setKeyboard() {
      try {
        var settingsValue = {};
        for (var key in keybrdParams.values) {
          // we don't want falsy/truely values. We only accept explicit values
          // for keyboard settings. Any other value is considered a
          // configuration error.
          if (typeof keybrdParams.values[key] == 'boolean') {
            settingsValue[key] = keybrdParams.values[key];
          }
        }
        settings.createLock().set(settingsValue);
      } catch (e) {
        console.log('KeyboardSettingsCustomizer. Error recovering datas. ' + e);
      }
    }

    // First of all, we should verify the parameters
    if (!keybrdParams || !keybrdParams.values) {
      console.error('KeyboardCustomizer -> Configuration error: ' +
                    'Defaults parameters or new values have not been received');
      return;
    }

    // If we have not new values to set we have already done
    var numNewValues = Object.keys(keybrdParams.values).length;
    if (numNewValues === 0) {
      console.log('KeyboardCustomizer -> New values has not received');
      return;
    }

    setKeyboard();
  };
});

var keyboardSettingsCustomizer = new KeyboardSettingsCustomizer();
keyboardSettingsCustomizer.init();
