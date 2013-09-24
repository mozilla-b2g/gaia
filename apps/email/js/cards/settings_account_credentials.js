/*global define*/
define(function(require) {

var templateNode = require('tmpl!./settings_account_credentials.html'),
    common = require('mail_common'),
    mozL10n = require('l10n!'),
    Cards = common.Cards;

/**
 * Per-account credentials settings, it can be activesync, imap+smtp,
 * or pop3+smtp
 */
function SettingsAccountCredentialsCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;

  var connInfoContainer =
    domNode.getElementsByClassName('tng-account-connInfo-container')[0];

  domNode.getElementsByClassName('tng-account-header-label')[0]
    .textContent = this.account.name;

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-account-save')[0]
    .addEventListener('click', this.onClickSave.bind(this), false);

  var usernameNodeInput =
    this.domNode.getElementsByClassName('tng-server-username-input')[0];
  this.passwordNodeInput =
    this.domNode.getElementsByClassName('tng-server-password-input')[0];

  usernameNodeInput.value = this.account.username;
}
SettingsAccountCredentialsCard.prototype = {
  onBack: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onClickSave: function() {
    var password = this.passwordNodeInput.value;

    if (password) {
      this.account.modifyAccount({password: password});
      this.account.clearProblems();
    } else {
      alert(mozL10n.get('settings-password-empty'));
    }

    this.onBack();
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'settings_account_credentials',
    { tray: false },
    SettingsAccountCredentialsCard,
    templateNode
);

return SettingsAccountCredentialsCard;
});
