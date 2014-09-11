/**
 * Used to show Personalization/Sound panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var VolumeManager = require('panels/sound/volume_manager');
  var ToneManager = require('panels/sound/tone_manager');

  return function ctor_sound_panel() {
    var volumeManager = VolumeManager();
    var toneManager = ToneManager();

    return SettingsPanel({
      onInit: function(panel) {
        var sliders_element = panel.querySelectorAll('.volume input');
        volumeManager.init(sliders_element);

        var tm_elements = {
          toneSelector: panel.querySelector('.touch-tone-selector'),
          alertToneSelection: panel.querySelector('.alert-tone-selection'),
          ringToneSelection: panel.querySelector('.ring-tone-selection'),
          ringer: panel.querySelector('.ringer'),
          vibrationSetting: panel.querySelector('.vibration-setting'),
          manageTones: panel.querySelector('.manage-tones-button')
        };
        toneManager.init(tm_elements);
      }
    });
  };
});
