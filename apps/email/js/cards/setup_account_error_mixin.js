'use strict';
define(function(require) {
  var SETUP_ERROR_L10N_ID_MAP = require('./setup_l10n_map'),
      mozL10n = require('l10n!');

  return {
    // note: this method is reused by setup_account_info and
    // setup_manual_config.
    showError: function(errName, errDetails) {
      this.errorRegionNode.classList.remove('collapsed');

      // Attempt to get a user-friendly string for the error we got. If we can't
      // find a match, just show the "unknown" error string.
      var errorStr = SETUP_ERROR_L10N_ID_MAP.hasOwnProperty(errName) ?
          SETUP_ERROR_L10N_ID_MAP[errName] :
          SETUP_ERROR_L10N_ID_MAP.unknown;
      mozL10n.setAttributes(this.errorMessageNode, errorStr, errDetails);

      // Make sure we are scrolled to the top of the scroll region so that the
      // error message is visible.
      this.scrollBelowNode.scrollTop = 0;
    },

  };
});
