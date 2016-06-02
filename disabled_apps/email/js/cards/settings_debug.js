'use strict';
var _secretDebug;

/**
 * Quasi-secret card for troubleshooting/debugging support.  Not part of the
 * standard UX flow, potentially not to be localized, and potentially not to
 * be shipped after initial dogfooding.
 */
define(function(require) {

var MailAPI = require('api'),
    cards = require('cards'),
    htmlCache = require('html_cache');

if (!_secretDebug) {
  _secretDebug = {};
}

return [
  require('./base_card')
         (require('template!./settings_debug.html')),
  {
    createdCallback: function() {
      this.loggingSelect.value = MailAPI.config.debugLogging || '';
    },

    onClose: function() {
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    resetApp: function() {
      window.location.reload();
    },

    dumpLog: function(target) {
      MailAPI.debugSupport('dumpLog', target);
    },

    onChangeLogging: function() {
      // coerce the falsey empty string to false.
      var value = this.loggingSelect.value || false;
      MailAPI.debugSupport('setLogging', value);
    },

    fastSync: function() {
      _secretDebug.fastSync = [20000, 60000];
    },

    resetStartupCache: function() {
      htmlCache.reset();
      console.log('htmlCache.reset done');
    },

    die: function() {
    }
  }
];
});
