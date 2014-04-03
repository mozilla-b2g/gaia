/*global define*/
define(function(require) {

var templateNode = require('tmpl!./setup_fix_gmail.html'),
    common = require('mail_common'),
    mozL10n = require('l10n!'),
    Cards = common.Cards;

/**
 * Tells the user how to enable IMAP/POP3 for Gmail
 */
function SetupFixGmail(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.restoreCard = args.restoreCard;

  // The account name is not translatable; set it verbatim.
  this.getElement('sup-gmail-account').textContent = this.account.name;

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
    var l10nId = translations[className].replace('{ACCOUNT_TYPE}', accountType);
    mozL10n.localize(this.getElement(className), l10nId);
  }

  this.getElement('sup-dismiss-btn').addEventListener(
    'click', this.onDismiss.bind(this), false);
}

SetupFixGmail.prototype = {
  die: function() {
    // no special cleanup required
  },

  getElement: function(className) {
    return this.domNode.getElementsByClassName(className)[0];
  },

  onDismiss: function() {
    this.account.clearProblems();
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1,
                                  this.restoreCard);
  }
};
Cards.defineCardWithDefaultMode(
    'setup_fix_gmail',
    { tray: false },
    SetupFixGmail,
    templateNode
);

return SetupFixGmail;
});
