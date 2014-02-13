define(function(require, exports) {
  'use strict';
  
  var _ = require('l10n').get;

  // Sadly, this is needed because when sound l10n ids change, they no
  // longer match up with the sound filename.
  var SOUND_FILE_TO_L10N_ID = {
    '0': 'noSound',
    'ac_classic_clock_alarm.opus': 'ac_classic_clock_alarm_opus',
    'ac_classic_clock_alarm_prog.opus': 'ac_classic_clock_alarm_prog_opus2',
    'ac_classic_clock_radio.opus': 'ac_classic_clock_radio_opus',
    'ac_normal_gem_echoes.opus': 'ac_normal_gem_echoes_opus',
    'ac_normal_ringing_strings.opus': 'ac_normal_ringing_strings_opus',
    'ac_soft_humming_waves.opus': 'ac_soft_humming_waves_opus',
    'ac_soft_into_the_void.opus': 'ac_soft_into_the_void_opus',
    'ac_soft_smooth_strings.opus': 'ac_soft_smooth_strings_opus'
  };

  /**
   * Given a sound ID, return the label to be displayed, for instance,
   * on a FormButton.
   */
  exports.formatLabel = function(sound) {
    return (sound === null || sound === '0') ?
      _('noSound') : _(SOUND_FILE_TO_L10N_ID[sound]);
  };
});
