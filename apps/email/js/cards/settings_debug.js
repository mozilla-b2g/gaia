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
  require('./base')(require('template!./settings_debug.html')),
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
      _secretDebug.fastSync = [100000, 200000];
    },

    showSyncs: function() {
      var navSync = navigator.sync;
      if (!navSync) {
        console.error('navigator.sync not available');
        return;
      }

      navSync.registrations().then(function(regs) {
        console.log('navigator.sync registrations count: ', regs.length);
        regs.forEach(function(reg) {
          console.log('Registered task: ' + reg.task);
          Object.keys(reg).forEach(function(key) {
            if (key === 'data') {
              console.log(key + ': ' + JSON.stringify(reg[key]));
            } else {
              console.log(key + ': ' + reg[key]);
            }
          });
          console.log('-----------');
        });
      }, function(err) {
        console.error('navigator.sync.registrations failed: ', err);
      });
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
