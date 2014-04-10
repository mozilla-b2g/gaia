/* global Customizer */
'use strict';

var KeyboardSettingsCustomizer = (function() {
  Customizer.call(this, 'keyboard_settings', 'json');

  this.set = function(keybrdParams) {
    const KEYBRD_SETTINGS = ['keyboard.vibration', 'keyboard.autocorrect',
                             'keyboard.clicksound', 'keyboard.wordsuggestion'];

    var actualValues = {};
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

    function saveActualValue(key, req) {
      actualValues[key] = req.result[key];
      var numKeybrdSettings = KEYBRD_SETTINGS.length;
      if (Object.keys(actualValues).length === numKeybrdSettings) {
        // Verify that the user has changed any setting before we
        // change the configuration
        var hasChanged = false;
        for (var i = 0; i < numKeybrdSettings && !hasChanged; i++) {
          hasChanged = (keybrdParams.defaults[KEYBRD_SETTINGS[i]] !==
                        actualValues[KEYBRD_SETTINGS[i]]);
        }
        !hasChanged && setKeyboard();
      }
    }

    // First of all, we should verify the parameters
    if (!keybrdParams || !keybrdParams.defaults || !keybrdParams.values) {
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

    // If there are not default values for all keyboard settings
    // we can't continue. We must verify if the user has changed any value
    for (var i = 0, l = KEYBRD_SETTINGS.length; i < l; i++) {
      if (!(KEYBRD_SETTINGS[i] in keybrdParams.defaults)) {
        console.log('KeyboardCustomizer -> Configuration error: Not all the ' +
                    'default settings values were set. Missing value ' +
                    KEYBRD_SETTINGS[i]);
        return;
      }
    }

    var onErrorMessage = function(settingName, req) {
      console.error('Error requesting ' + settingName + '. ' + req.error.name);
    };

    var keyboardLock = settings.createLock();
    for (var param in keybrdParams.defaults) {
      var keyboardReq = keyboardLock.get(param);
      keyboardReq.onsuccess = saveActualValue.bind(this, param, keyboardReq);
      keyboardReq.onerror = onErrorMessage.bind(this, param, keyboardReq);
    }
  };
});

var keyboardSettingsCustomizer = new KeyboardSettingsCustomizer();
keyboardSettingsCustomizer.init();
