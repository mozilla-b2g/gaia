/**
 * Per-account credentials settings, it can be activesync, imap+smtp,
 * or pop3+smtp
 */
'use strict';
define(function(require) {

var mozL10n = require('l10n!'),
    cards = require('cards');

return [
  require('./base')(require('template!./settings_account_credentials.html')),
  {
    onArgs: function(args) {
      this.account = args.account;
      this.headerLabel.textContent = this.account.name;
      this.usernameNodeInput.value = this.account.username;
    },

    onBack: function() {
      cards.removeCardAndSuccessors(this, 'animate', 1);
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
  }
];
});
