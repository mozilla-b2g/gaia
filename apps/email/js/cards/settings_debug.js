/*global define*/
var _secretDebug;
define(function(require) {

var templateNode = require('tmpl!./settings_debug.html'),
    common = require('mail_common'),
    MailAPI = require('api'),
    Cards = common.Cards;

if (!_secretDebug)
  _secretDebug = {};

/**
 * Quasi-secret card for troubleshooting/debugging support.  Not part of the
 * standard UX flow, potentially not to be localized, and potentially not to
 * be shipped after initial dogfooding.
 */
function SettingsDebugCard(domNode, mode, args) {
  this.domNode = domNode;

  domNode.getElementsByClassName('tng-close-btn')[0]
    .addEventListener('click', this.onClose.bind(this), false);

  // - hookup buttons
  domNode.getElementsByClassName('tng-dbg-reset')[0]
    .addEventListener('click', window.location.reload.bind(window.location),
                      false);

  domNode.getElementsByClassName('tng-dbg-dump-storage')[0]
    .addEventListener('click', this.dumpLog.bind(this, 'storage'), false);

  this.loggingButton = domNode.getElementsByClassName('tng-dbg-logging')[0];
  this.dangerousLoggingButton =
    domNode.getElementsByClassName('tng-dbg-dangerous-logging')[0];

  this.loggingButton.addEventListener(
    'click', this.cycleLogging.bind(this, true, true), false);
  this.dangerousLoggingButton.addEventListener(
    'click', this.cycleLogging.bind(this, true, 'dangerous'), false);
  this.cycleLogging(false);

  domNode.querySelector('.tng-dbg-fastsync')
         .addEventListener('click', this.fastSync.bind(this), true);

  // - hookup
}
SettingsDebugCard.prototype = {
  onClose: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  dumpLog: function(target) {
    MailAPI.debugSupport('dumpLog', target);
  },

  cycleLogging: function(doChange, changeValue) {
    var value = MailAPI.config.debugLogging;
    if (doChange) {
      if (changeValue === true)
        value = !value;
      // only upgrade to dangerous from enabled...
      else if (changeValue === 'dangerous' && value === true)
        value = 'dangerous';
      else if (changeValue === 'dangerous' && value === 'dangerous')
        value = true;
      // (ignore dangerous button if not enabled)
      else
        return;
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
};
Cards.defineCardWithDefaultMode(
    'settings_debug',
    { tray: false },
    SettingsDebugCard,
    templateNode
);

return SettingsDebugCard;
});
