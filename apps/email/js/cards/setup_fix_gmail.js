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

  var accountNode =
    domNode.getElementsByClassName('sup-gmail-account')[0];
  accountNode.textContent = this.account.name;

  var incomingType = (this.account.type === 'imap+smtp' ? 'imap' : 'pop3');
  domNode.getElementsByClassName('sup-account-header-label')[0].textCountent =
      mozL10n.get('setup-gmail-' + incomingType + '-header');
  domNode.getElementsByClassName('sup-enable-label')[0].textCountent =
      mozL10n.get('setup-gmail-' + incomingType + '-message');
  domNode.getElementsByClassName('sup-dismiss-btn')[0].textCountent =
      mozL10n.get('setup-gmail-' + incomingType + '-retry');

  var useButton = domNode.getElementsByClassName('sup-dismiss-btn')[0];
  useButton.addEventListener('click', this.onDismiss.bind(this), false);
}
SetupFixGmail.prototype = {
  die: function() {
    // no special cleanup required
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
