/*global define*/
'use strict';
define(function(require) {

var templateNode = require('tmpl!./settings_account_credentials.html'),
    common = require('mail_common'),
    mozL10n = require('l10n!'),
    oauthFetch = require('./oauth2/fetch'),
    Cards = common.Cards;

/**
 * Per-account credentials settings, it can be activesync, imap+smtp,
 * or pop3+smtp
 */
function SettingsAccountCredentialsCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;

  domNode.getElementsByClassName('tng-account-header-label')[0]
    .textContent = this.account.name;

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  this.saveButton = domNode.getElementsByClassName('tng-account-save')[0];
  this.saveButton.addEventListener('click', this.onClickSave.bind(this), false);

  this.reauthButton = domNode.getElementsByClassName('tng-account-reauth')[0];
  this.reauthButton
      .addEventListener('click', this.onClickReauth.bind(this), false);

  var usernameNodeInput =
    this.domNode.getElementsByClassName('tng-server-username-input')[0];
  this.passwordNodeInput =
    this.domNode.getElementsByClassName('tng-server-password-input')[0];


  // If we're not using password auth, then hide the password box and the
  // save UI for it.
  if (this.account.authMechanism !== 'password') {
    this.domNode.querySelector('.tng-account-server-password')
      .classList.add('collapsed');
    this.saveButton.classList.add('collapsed');
  }

  // If the account is explicitly an oauth2 type, then show the reauthorize
  // button.
  if (this.account.authMechanism === 'oauth2') {
    this.reauthButton.classList.remove('collapsed');
  }

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

  onClickReauth: function() {
    var oauth2 = this.account._wireRep.credentials.oauth2;
    oauthFetch(oauth2)
    .then(function(response) {
      if (response.status === 'success') {
        this.account.modifyAccount({ oauthTokens: response.tokens });

        // The user may have reauthed because they canceled an onbadlogin
        // card but came here to try to fix the problem, so ask to clear
        // problems if possible.
        this.account.clearProblems();

        // Successfully reauthed, nothing else to do on this card.
        this.onBack();
      }
    }.bind(this));
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
