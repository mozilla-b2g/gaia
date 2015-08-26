'use strict';
define(function(require) {

var oauthFetch = require('./oauth2/fetch'),
    cards = require('cards');

return [
  require('./base_card')(require('template!./setup_fix_oauth2.html')),
  {
    extraClasses: ['anim-fade', 'anim-overlay'],

    onArgs: function(args) {
      this.account = args.account;
      this.restoreCard = args.restoreCard;

      // The account name is not translatable; set it verbatim.
      this.oauth2Name.textContent = this.account.name;
    },

    die: function() {
      // no special cleanup required
    },

    onReauth: function(event) {
      event.stopPropagation();
      event.preventDefault();

      var oauth2 = this.account._wireRep.credentials.oauth2;
      oauthFetch(oauth2, {
        login_hint: this.account.username
      })
      .then(function(response) {
        // Cancellation means hide this UI.
        if (response.status === 'cancel') {
          this.delayedClose();
        // Success means victory.
        } else if (response.status === 'success') {
          this.account.modifyAccount({ oauthTokens: response.tokens });
          this.account.clearProblems();
          this.delayedClose();

        // Anything else means a failure and it's also time to close.
        } else {
          console.error('Unknown oauthFetch status: ' + response.status);
          this.delayedClose();
        }
      }.bind(this));
    },

    delayedClose: function() {
      // The setTimeout is a hack. See the comment in setup_progress, in
      // onCardVisible, similar issue here, but for the close of the oauth
      // card.
      setTimeout(this.close.bind(this), 100);
    },

    close: function(event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      cards.removeCardAndSuccessors(this, 'animate', 1,
                                    this.restoreCard);
    }
  }
];
});
