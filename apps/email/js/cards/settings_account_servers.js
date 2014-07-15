/*global define*/
define(function(require) {

var templateNode = require('tmpl!./settings_account_servers.html'),
    common = require('mail_common'),
    mozL10n = require('l10n!'),
    Cards = common.Cards;

/**
 * Per-account server settings, it can be activesync, imap+smtp, or
 * pop3+smtp
 */
function SettingsAccountServerCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.server = args.account.servers[args.index];

  var connInfoContainer =
    domNode.getElementsByClassName('tng-account-connInfo-container')[0];

  domNode.getElementsByClassName('tng-account-header-label')[0]
    .textContent = this.account.name;

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-account-save')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-account-server-label')[0]
    .textContent = mozL10n.get('settings-' + this.server.type + '-label');

  var hostnameNodeInput =
    this.domNode.getElementsByClassName('tng-server-hostname-input')[0];
  var portNodeInput =
    this.domNode.getElementsByClassName('tng-server-port-input')[0];

  // activesync stores its data in 'server'
  hostnameNodeInput.value = this.server.connInfo.hostname ||
                            this.server.connInfo.server;
  // port is meaningless for activesync; display empty value
  portNodeInput.value = this.server.connInfo.port || '';
}
SettingsAccountServerCard.prototype = {
  onBack: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'settings_account_servers',
    { tray: false },
    SettingsAccountServerCard,
    templateNode
);

return SettingsAccountServerCard;
});
