/**
 * Show a spinner until the tryToCreateAccount returns; on success we
 * transition to 'setup-done', on failure we pop ourselves off and return the
 * error information to the card that invoked us.
 */
'use strict';
define(function(require) {

var MailAPI = require('api'),
    cards = require('cards');

return [
  require('./base')(require('template!./setup_progress.html')),
  {
    onArgs: function(args) {
      this.callingCard = args.callingCard;
      this.creationInProcess = true;

      MailAPI.tryToCreateAccount(
        {
          displayName: args.displayName,
          emailAddress: args.emailAddress,
          password: args.password
        },
        args.domainInfo || null,
        function(err, errDetails, account) {
          this.creationInProcess = false;
          if (err) {
            this.onCreationError(err, errDetails);
          } else {
            this.onCreationSuccess(account);
          }
        }.bind(this));
    },

    extraClasses: ['anim-fade', 'anim-overlay'],

    cancelCreation: function() {
      if (!this.creationInProcess) {
        return;
      }
      // XXX implement cancellation
    },

    onBack: function(e) {
      e.preventDefault();
      this.cancelCreation();
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    onCreationError: function(err, errDetails) {
      this.callingCard.showError(err, errDetails);
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    onCreationSuccess: function(account) {
      cards.pushCard('setup_account_prefs', 'animate',
      {
        account: account
      });
    },

    die: function() {
      this.cancelCreation();
    }
  }
];
});
