/**
 * Used to show Personalization/Sound panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Sound = require('panels/sound/sound');

  return function ctor_sound_panel() {
    var sound = Sound();

    return SettingsPanel({
      onInit: function(panel) {
        var elements = {
          toneSelector: panel.querySelector('#touch-tone-selector'),
          alertTone: panel.querySelector('#alert-tone-selection'),
          ringTone: panel.querySelector('#ring-tone-selection'),
          ringer: panel.querySelector('#ringer')
        };

        sound.init(elements);
      },
      onUninit: function() {
        sound.uninit();
      }
    });
  };
});
