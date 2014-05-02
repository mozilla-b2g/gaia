'use strict';
var _secretDebug;

/**
 * Quasi-secret card for troubleshooting/debugging support.  Not part of the
 * standard UX flow, potentially not to be localized, and potentially not to
 * be shipped after initial dogfooding.
 */
define(function(require) {

var MailAPI = require('api'),
    cards = require('cards');

if (!_secretDebug) {
  _secretDebug = {};
}

return [
  require('./base')(require('template!./settings_debug.html')),
  {
    createdCallback: function() {
      this.cycleLogging(false);
    },

    onClose: function() {
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    resetApp: function() {
      window.location.reload.bind(window.location);
    },

    dumpLog: function(target) {
      MailAPI.debugSupport('dumpLog', target);
    },

    dumpLogStorage: function() {
      this.dumpLog('storage');
    },

    onLoggingClick: function() {
      this.cycleLogging(true, true);
    },

    onDangerousLoggingClick: function() {
      this.cycleLogging(true, 'dangerous');
    },

    cycleLogging: function(doChange, changeValue) {
      var value = MailAPI.config.debugLogging;
      if (doChange) {
        if (changeValue === true) {
          value = !value;
        } else if (changeValue === 'dangerous' && value === true) {
          // only upgrade to dangerous from enabled...
          value = 'dangerous';
        } else if (changeValue === 'dangerous' && value === 'dangerous') {
          value = true;
        // (ignore dangerous button if not enabled)
        } else {
          return;
        }
        MailAPI.debugSupport('setLogging', value);
      }
      var label, dangerLabel;
      if (value === true) {
        label = 'Logging is ENABLED; toggle';
        dangerLabel = 'Logging is SAFE; toggle';
      }
      else if (value === 'dangerous') {
        label = 'Logging is ENABLED; toggle';
        dangerLabel = 'Logging DANGEROUSLY ENTRAINS USER DATA; toggle';
      }
      else {
        label = 'Logging is DISABLED; toggle';
        dangerLabel = '(enable logging to access this secret button)';
      }
      this.loggingButton.textContent = label;
      this.dangerousLoggingButton.textContent = dangerLabel;
    },

    fastSync: function() {
      _secretDebug.fastSync = [20000, 60000];
    },

    die: function() {
    }
  }
];
});
