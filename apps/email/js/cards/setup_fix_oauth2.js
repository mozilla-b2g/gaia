/*global define*/
'use strict';
define(function(require) {

var templateNode = require('tmpl!./setup_fix_oauth2.html'),
    common = require('mail_common'),
    oauthFetch = require('./oauth2/fetch'),
    Cards = common.Cards;

/**
 * Tells the user how to enable IMAP/POP3 for Gmail
 */
function SetupFixOAuth2(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.restoreCard = args.restoreCard;

  // The account name is not translatable; set it verbatim.
  this.getElement('sup-oauth2-name').textContent = this.account.name;

  this.getElement('sup-reauth-btn').addEventListener(
    'click', this.onReauth.bind(this), false);
}

SetupFixOAuth2.prototype = {
  die: function() {
    // no special cleanup required
  },

  getElement: function(className) {
    return this.domNode.getElementsByClassName(className)[0];
  },

  onReauth: function(event) {
    event.stopPropagation();
    event.preventDefault();

    var oauth2 = this.account._wireRep.credentials.oauth2;
    oauthFetch(oauth2)
    .then(function(response) {
      // Cancellation means hide this UI.
      if (response.status === 'cancel') {
        this.close();
      // Success means victory.
      } else if (response.status === 'success') {
        this.account.modifyAccount({ oauthTokens: response.tokens });
        this.account.clearProblems();
        this.close();
      // Anything else means a failure and it's also time to close.
      } else {
        console.error('Unknown oauthFetch status: ' + response.status);
        this.close();
      }
    }.bind(this));
  },

  close: function(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1,
                                  this.restoreCard);
  }
};
Cards.defineCardWithDefaultMode(
    'setup_fix_oauth2',
    { tray: false },
    SetupFixOAuth2,
    templateNode
);

return SetupFixOAuth2;
});
