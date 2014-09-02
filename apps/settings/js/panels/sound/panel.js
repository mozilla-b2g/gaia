/**
 * Used to show Personalization/Sound panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Sound = require('panels/sound/sound');

  return function ctor_sound_panel() {
    var sound = new Sound();

    return SettingsPanel({
      onInit: function(panel) {
        var elements = {
          toneSelector: panel.querySelector('.touch-tone-selector'),
          alertToneSelection: panel.querySelector('.alert-tone-selection'),
          ringToneSelection: panel.querySelector('.ring-tone-selection'),
          ringer: panel.querySelector('.ringer'),
          vibrationSetting: panel.querySelector('.vibration-setting'),
          manageTones: panel.querySelector('.manage-tones-button')
        };
        sound.init(elements);
      }
    });
  };
});
