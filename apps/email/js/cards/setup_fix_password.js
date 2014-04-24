/*global define*/
define(function(require) {

var templateNode = require('tmpl!./setup_fix_password.html'),
    common = require('mail_common'),
    mozL10n = require('l10n!'),
    Cards = common.Cards;

/**
 * Asks the user to re-enter their password for the account
 */
function SetupFixPassword(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.whichSide = args.whichSide; // incoming or outgoing
  this.restoreCard = args.restoreCard;

  var accountNode =
    domNode.getElementsByClassName('sup-bad-password-account')[0];

  var type = this.account.type;
  // In the case of IMAP/POP3, they _might_ have two different
  // passwords, one for IMAP/POP3 and one for SMTP. We need to clarify
  // which one we're asking for. (It does not need l10n because it's a
  // protocol.)
  if (type === 'imap+smtp' || type === 'pop3+smtp') {
    var l10nString = null;
    if (this.whichSide === 'incoming') {
      if (type === 'imap+smtp') {
        l10nString = 'settings-account-clarify-imap';
      } else {
        l10nString = 'settings-account-clarify-pop3';
      }
    } else {
      l10nString = 'settings-account-clarify-smtp';
    }
    mozL10n.localize(accountNode, l10nString,
                     { 'account-name': this.account.name });
  }

  var useButton = domNode.getElementsByClassName('sup-use-password-btn')[0];
  useButton.addEventListener('click', this.onUsePassword.bind(this), false);

  this.passwordNode =
    this.domNode.getElementsByClassName('sup-info-password')[0];
}
SetupFixPassword.prototype = {
  /**
   * Assume we will be successful; update the password, trigger a reauth
   * attempt, then close the card.
   */
  onUsePassword: function() {
    var password = this.passwordNode.value;
    if (password) {
      this.account.modifyAccount(this.whichSide === 'incoming' ?
                                 { password: password } :
                                 { outgoingPassword: password },
                                 this.proceed.bind(this));
    } else {
      this.proceed();
    }
  },

  /**
   * After potentially modifying the account, continue onward.
   */
  proceed: function() {
    this.account.clearProblems();
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1,
                                  this.restoreCard);
  },

  die: function() {
    // no special cleanup required
  }
};
Cards.defineCardWithDefaultMode(
    'setup_fix_password',
    { tray: false },
    SetupFixPassword,
    templateNode
);

return SetupFixPassword;
});
