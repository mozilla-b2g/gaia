/* global Customizer */

'use strict';

var KeyboardSettingsCustomizer = (function() {
  Customizer.call(this, 'keyboardSettings', 'json');

  this.set = function(aDatas) {
    var KEYBOARD_PREFIX = 'keyboard.';
    try {
      if (!aDatas) {
        return;
      }
      var settingsValue = {};
      for (var key in aDatas) {
        // we don't want falsy/truely values. We only accept explicit values for
        // keyboard settings. Any other value is considered a configuration
        // error.
        if (typeof aDatas[key] == 'boolean') {
          settingsValue[KEYBOARD_PREFIX + key] = aDatas[key];
        }
      }

      if (Object.keys(settingsValue).length) {
        navigator.mozSettings.createLock().set(settingsValue);
      }
    } catch (e) {
      console.log('Error recovering datas. ' + e);
    }
  };
});

var keyboardSettingsCustomizer = new KeyboardSettingsCustomizer();
keyboardSettingsCustomizer.init();
