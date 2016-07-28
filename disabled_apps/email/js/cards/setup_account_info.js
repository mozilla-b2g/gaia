/**
 * Enter basic account info card (name, e-mail address) to try and
 * autoconfigure an account.
 */
'use strict';
define(function(require, exports, module) {

var evt = require('evt'),
    mozL10n = require('l10n!'),
    cards = require('cards'),
    htmlCache = require('html_cache'),
    FormNavigation = require('form_navigation');

return [
  require('./base_card')(require('template!./setup_account_info.html')),
  require('./setup_account_error_mixin'),
  {
    createdCallback: function() {
      htmlCache.cloneAndSave(module.id, this);

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

      if (args.launchedFromActivity) {
        this.errorRegionNode.classList.remove('collapsed');
        mozL10n.setAttributes(this.errorMessageNode,
                                   'setup-empty-account-message');
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
      evt.emit('setupAccountCanceled', this);
    },

    onNext: function(event) {
      event.preventDefault(); // Prevent FormNavigation from taking over.

      // Clear HTML cache since the outcome of the setup will change it, and if
      // the user bails mid-setup, the app will not show the older incorrect
      // state.
      htmlCache.reset();

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
