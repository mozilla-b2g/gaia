define(function(require, exports) {
  'use strict';

  var _ = require('l10n').get;

  // Sadly, this is needed because when sound l10n ids change, they no
  // longer match up with the sound filename.
  var SOUND_FILE_TO_L10N_ID = {
    '0': 'noSound',
    'ac_awake.ogg': 'ac_awake_ogg',
    'ac_crystalize.ogg': 'ac_crystalize_ogg',
    'ac_cycle.ogg': 'ac_cycle_ogg',
    'ac_digicloud.ogg': 'ac_digicloud_ogg',
    'ac_humming_waves.opus': 'ac_humming_waves_opus',
    'ac_into_the_void.opus': 'ac_into_the_void_opus',
    'ac_lightly.ogg': 'ac_lightly_ogg',
    'ac_mobile.ogg': 'ac_mobile_ogg',
    'ac_pinger.ogg': 'ac_pinger_ogg',
    'ac_skip.ogg': 'ac_skip_ogg',
    'ac_tri.ogg': 'ac_tri_ogg',
    'ac_universal.ogg': 'ac_universal_ogg'
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
