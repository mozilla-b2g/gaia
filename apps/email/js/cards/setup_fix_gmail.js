/**
 * Tells the user how to enable IMAP/POP3 for Gmail
 */
'use strict';
define(function(require) {

var mozL10n = require('l10n!'),
    cards = require('cards');

return [
  require('./base')(require('template!./setup_fix_gmail.html')),
  {
    onArgs: function(args) {
      this.account = args.account;
      this.restoreCard = args.restoreCard;

      // The account name is not translatable; set it verbatim.
      this.accountNode.textContent = this.account.name;

      // Localize the common elements. Since the text of these may differ
      // depending on the account type, we must translate them here rather
      // than through data-l10n-id.
      var translations = {
        'sup-account-header-label': 'setup-gmail-{ACCOUNT_TYPE}-header',
        'sup-enable-label': 'setup-gmail-{ACCOUNT_TYPE}-message',
        'sup-dismiss-btn': 'setup-gmail-{ACCOUNT_TYPE}-retry'
      };
      var accountType = (this.account.type === 'imap+smtp' ? 'imap' : 'pop3');
      for (var className in translations) {
        var l10nId = translations[className]
                     .replace('{ACCOUNT_TYPE}', accountType);
        mozL10n.localize(this.getElement(className), l10nId);
      }
    },

    die: function() {
      // no special cleanup required
    },

    getElement: function(className) {
      return this.getElementsByClassName(className)[0];
    },

    onDismiss: function() {
      this.account.clearProblems();
      cards.removeCardAndSuccessors(this, 'animate', 1, this.restoreCard);
    }
  }
];
});
