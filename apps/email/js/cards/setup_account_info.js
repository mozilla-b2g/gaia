/**
 * Enter basic account info card (name, e-mail address) to try and
 * autoconfigure an account.
 */
'use strict';
define(function(require) {

var evt = require('evt'),
    model = require('model'),
    cards = require('cards'),
    FormNavigation = require('form_navigation');

return [
  require('./base')(require('template!./setup_account_info.html')),
  require('./setup_account_error_mixin'),
  {
    createdCallback: function() {
      this.formNavigation = new FormNavigation({
        formElem: this.formNode,
        onLast: this.onNext.bind(this)
      });

      this.needsFocus = true;
    },

    onArgs: function(args) {
      // The back button should only be enabled if there is at least one other
      // account already in existence.
      if (args.allowBack) {
        this.backButton.classList.remove('collapsed');
      }
    },

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
        cards.removeCardAndSuccessors(this, 'animate', 1);
      }
    },
    onNext: function(event) {
      event.preventDefault(); // Prevent FormNavigation from taking over.

      // The progress card is the dude that actually tries to create the
      // account.
      cards.pushCard(
        'setup_progress', 'animate',
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
      cards.pushCard(
        'setup_manual_config', 'animate',
        {
          displayName: this.nameNode.value,
          emailAddress: this.emailNode.value
        },
        'right');
    },

    die: function() {
      this.formNavigation = null;
    }
  }
];
});
