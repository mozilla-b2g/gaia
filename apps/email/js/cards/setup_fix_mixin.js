/**
 * Mixin for the setup_fix_* cases.
 */
'use strict';
define(function(require) {

  var mozL10n = require('l10n!'),
      cards = require('cards');

  return  {
    extraClasses: ['anim-fade', 'anim-overlay'],

    onArgs: function(args) {
      this.account = args.account;
      this.whichSide = args.whichSide; // incoming or outgoing
      this.restoreCard = args.restoreCard;

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
        mozL10n.setAttributes(this.accountNode, l10nString,
                         { 'account-name': this.account.name });
      }
    },

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
      cards.removeCardAndSuccessors(this, 'animate', 1, this.restoreCard);
    },

    die: function() {
      // no special cleanup required
    }
  };
});
