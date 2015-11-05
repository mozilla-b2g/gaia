'use strict';
define(function(require) {

var mozL10n = require('l10n!'),
    cards = require('cards'),
    oauthFetch = require('./oauth2/fetch');

return [
  require('./base_card')
         (require('template!./settings_account_credentials.html')),
  {
    onArgs: function(args) {
      this.account = args.account;
      this.headerLabel.textContent = this.account.name;

      // If we're not using password auth, then hide the password box and the
      // save UI for it.
      if (this.account.authMechanism !== 'password') {
        this.querySelector('.tng-account-server-password')
            .classList.add('collapsed');
        this.saveButton.classList.add('collapsed');
      }

      // If the account is explicitly an oauth2 type, then show the reauthorize
      // button.
      if (this.account.authMechanism === 'oauth2') {
        this.reauthButton.classList.remove('collapsed');
      }

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

    onClickReauth: function() {
      var oauth2 = this.account._wireRep.credentials.oauth2;
      oauthFetch(oauth2, {
        login_hint: this.account.username
      })
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
  }
];
});
