/*global define*/
define(function(require) {

var templateNode = require('tmpl!./setup_progress.html'),
    common = require('mail_common'),
    model = require('model'),
    MailAPI = require('api'),
    Cards = common.Cards;

/**
 * Show a spinner until the tryToCreateAccount returns; on success we
 * transition to 'setup-done', on failure we pop ourselves off and return the
 * error information to the card that invoked us.
 */
function SetupProgressCard(domNode, mode, args) {
  this.domNode = domNode;
  this.callingCard = args.callingCard;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  var self = this;
  this.creationInProcess = true;
  MailAPI.tryToCreateAccount(
    {
      displayName: args.displayName,
      emailAddress: args.emailAddress,
      password: args.password
    },
    args.domainInfo || null,
    function(err, errDetails, account) {
      self.creationInProcess = false;
      if (err)
        self.onCreationError(err, errDetails);
      else
        self.onCreationSuccess(account);
    });
}
SetupProgressCard.prototype = {
  cancelCreation: function() {
    if (!this.creationInProcess)
      return;
    // XXX implement cancellation
  },

  onBack: function(e) {
    e.preventDefault();
    this.cancelCreation();
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onCreationError: function(err, errDetails) {
    this.callingCard.showError(err, errDetails);
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onCreationSuccess: function(account) {
    Cards.pushCard('setup_account_prefs', 'default', 'animate',
    {
      account: account
    });
  },

  die: function() {
    this.cancelCreation();
  }
};
Cards.defineCardWithDefaultMode(
    'setup_progress',
    { tray: false },
    SetupProgressCard,
    templateNode
);

return SetupProgressCard;
});
