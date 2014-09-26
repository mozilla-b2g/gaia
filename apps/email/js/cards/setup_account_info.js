/*global define*/
'use strict';
define(function(require) {

var templateNode = require('tmpl!./setup_account_info.html'),
    common = require('mail_common'),
    SETUP_ERROR_L10N_ID_MAP = require('./setup_l10n_map'),
    evt = require('evt'),
    mozL10n = require('l10n!'),
    model = require('model'),
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
 * Enter basic account info card (name, e-mail address) to try and
 * autoconfigure an account.
 */
function SetupAccountInfoCard(domNode, mode, args) {
  this.domNode = domNode;

  // The back button should only be enabled if there is at least one other
  // account already in existence.
  if (args.allowBack) {
    var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
    backButton.addEventListener('click', this.onBack.bind(this), false);
    backButton.classList.remove('collapsed');
  }

  this.nextButton = domNode.getElementsByClassName('sup-info-next-btn')[0];
  this.onNext = this.onNext.bind(this);
  this.nextButton.addEventListener('click', this.onNext, false);

  this.formNode = domNode.getElementsByClassName('sup-account-form')[0];

  this.nameNode = this.domNode.getElementsByClassName('sup-info-name')[0];
  this.emailNode = this.domNode.getElementsByClassName('sup-info-email')[0];

  // Add input event handler to prevent user submit empty name.
  this.emailNode.addEventListener('input', this.onInfoInput.bind(this));
  this.nameNode.addEventListener('input', this.onInfoInput.bind(this));

  this.manualConfig =
    domNode.getElementsByClassName('sup-manual-config-btn')[0];
  this.manualConfig.addEventListener('click',
                                     this.onClickManualConfig.bind(this));

  this.needsFocus = true;

  bindFormNavigation(this);
}

SetupAccountInfoCard.prototype = {
  onCardVisible: function() {
    // Only focus in the form fields if this is the first time the card is
    // being shown.
    if (this.needsFocus) {
      this.nameNode.focus();
      this.needsFocus = false;
    }
  },

  onBack: function(event) {
    if (!model.foldersSlice) {
      // No account has been formally initialized, but one
      // likely exists given that this back button should
      // only be available for cases that have accounts.
      // Likely just need the app to reset to load model.
      evt.emit('resetApp');
    } else {
      Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
    }
  },
  onNext: function(event) {
    event.preventDefault(); // Prevent FormNavigation from taking over.

    // The progress card is the dude that actually tries to create the account.
    Cards.pushCard(
      'setup_progress', 'default', 'animate',
      {
        displayName: this.nameNode.value,
        emailAddress: this.emailNode.value,
        callingCard: this
      },
      'right');
  },

  onInfoInput: function(event) {
    this.nextButton.disabled = this.manualConfig.disabled =
      !this.formNode.checkValidity();
  },

  onClickManualConfig: function(event) {
    event.preventDefault(); // Prevent FormNavigation from taking over.
    Cards.pushCard(
      'setup_manual_config', 'default', 'animate',
      {
        displayName: this.nameNode.value,
        emailAddress: this.emailNode.value
      },
      'right');
  },

  // note: this method is also reused by the manual config and password cards
  showError: function(errName, errDetails) {
    this.domNode.getElementsByClassName('sup-error-region')[0]
        .classList.remove('collapsed');
    var errorMessageNode =
      this.domNode.getElementsByClassName('sup-error-message')[0];

    // Attempt to get a user-friendly string for the error we got. If we can't
    // find a match, just show the "unknown" error string.
    var errorStr = SETUP_ERROR_L10N_ID_MAP.hasOwnProperty(errName) ?
        SETUP_ERROR_L10N_ID_MAP[errName] :
        SETUP_ERROR_L10N_ID_MAP.unknown;
    mozL10n.setAttributes(errorMessageNode, errorStr, errDetails);

    // Make sure we are scrolled to the top of the scroll region so that the
    // error message is visible.
    this.domNode.getElementsByClassName('scrollregion-below-header')[0]
      .scrollTop = 0;
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'setup_account_info',
    { tray: false },
    SetupAccountInfoCard,
    templateNode
);

return SetupAccountInfoCard;
});
