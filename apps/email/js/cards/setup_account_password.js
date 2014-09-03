/*global define*/
'use strict';
define(function(require) {

var templateNode = require('tmpl!./setup_account_password.html'),
    common = require('mail_common'),
    SetupAccountInfoCard = require('./setup_account_info'),
    mix = require('mix'),
    Cards = common.Cards,
    FormNavigation = common.FormNavigation;

// Function to avoid jshint error about "Do not use 'new' for side effects"
function bindFormNavigation(instance) {
  return new FormNavigation({
    formElem: instance.formNode,
    onLast: instance.onNext
  });
}

/**
 * Enter basic account info card (name, e-mail address, password) to try and
 * autoconfigure an account.
 */
function SetupAccountPasswordCard(domNode, mode, args) {
  this.domNode = domNode;
  this.args = args;

  this.emailAddress = args.emailAddress;

  this.domNode = domNode;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  this.nextButton = domNode.getElementsByClassName('sup-info-next-btn')[0];
  this.onNext = this.onNext.bind(this);
  this.nextButton.addEventListener('click', this.onNext, false);

  this.formNode = domNode.getElementsByClassName('sup-account-form')[0];

  this.emailNode = this.domNode.getElementsByClassName('sup-email-display')[0];
  this.emailNode.textContent = this.emailAddress;

  this.passwordNode =
    this.domNode.getElementsByClassName('sup-info-password')[0];

  // Add input event handler to prevent user submit empty name or password.
  this.passwordNode.addEventListener('input', this.onInfoInput.bind(this));

  this.needsFocus = true;

  bindFormNavigation(this);
}

SetupAccountPasswordCard.prototype = {
  onCardVisible: function() {
    // Only focus in the form fields if this is the first time the card is
    // being shown.
    if (this.needsFocus) {
      this.passwordNode.focus();
      this.needsFocus = false;
    }
  },

  onBack: function(event) {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },
  onNext: function(event) {
    event.preventDefault(); // Prevent FormNavigation from taking over.

    this.args.password = this.passwordNode.value;

    // The progress card is the dude that actually tries to create the account.
    Cards.pushCard(
      'setup_progress', 'default', 'animate',
      // Send a new object for sanitation, avoid state modifications downstream.
      mix({
        callingCard: this
      }, this.args),
      'right');
  },

  onInfoInput: function(event) {
    this.nextButton.disabled = !this.formNode.checkValidity();
  },

  showError: SetupAccountInfoCard.prototype.showError,

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'setup_account_password',
    { tray: false },
    SetupAccountPasswordCard,
    templateNode
);

return SetupAccountPasswordCard;
});
