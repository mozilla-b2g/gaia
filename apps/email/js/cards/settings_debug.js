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

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onClose.bind(this), false);

  // - hookup buttons
  domNode.getElementsByClassName('tng-dbg-reset')[0]
    .addEventListener('click', window.location.reload.bind(window.location),
                      false);

  domNode.getElementsByClassName('tng-dbg-dump-storage')[0]
    .addEventListener('click', this.dumpLog.bind(this, 'storage'), false);

  this.loggingSelect = domNode.getElementsByClassName('tng-dbg-logging')[0];
  this.loggingSelect.addEventListener(
    'change',
    this.onChangeLogging.bind(this),
    false);
  this.loggingSelect.value = MailAPI.config.debugLogging || '';

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

  onChangeLogging: function() {
    // coerce the falsey empty string to false.
    var value = this.loggingSelect.value || false;
    MailAPI.debugSupport('setLogging', value);
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
