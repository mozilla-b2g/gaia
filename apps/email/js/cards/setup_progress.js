/**
 * Show a spinner in for two possible steps in the setup of an account:
 *
 * 1) During the autoconfig step, when figuring out the capabilities of the
 * server, and possibly needing an oauth jump.
 *
 * 2) During the manual config or password flow when finally connecting to the
 * service to confirm password and settings are correct.
 *
 * So the possible flows are:
 *
 * OAuth: setup_account_info -> setup_progress -> setup_account_prefs
 * autoconfig password: setup_account_info -> setup_progress ->
 *                      setup_password -> setup_progress -> setup_account_prefs
 * manual config: setup_account_info -> setup_manual_config ->
 *                setup_progress -> setup_account_prefs
 */
'use strict';
define(function(require) {

var MailAPI = require('api'),
    cards = require('cards'),
    oauthFetch = require('cards/oauth2/fetch');

return [
  require('./base')(require('template!./setup_progress.html')),
  {
    onArgs: function(args) {
      this.args = args;
      this.callingCard = args.callingCard;
      this.creationInProcess = true;
      this.pushedSecondaryCard = false;
      this.cardHasBeenShown = false;
      this.createCanceled = false;
    },

    extraClasses: ['anim-fade', 'anim-overlay'],

    cancelCreation: function() {
      if (!this.creationInProcess) {
        return;
      }
      // XXX implement cancellation
    },

    onCardVisible: function() {
      if (this.cardHasBeenShown) {
        // If this card was made visible because of a cancel of a secondary
        // config card, just go back one more card. The setTimeout is a hack.
        // Without it, the final card is not actionable because the
        // onTransitionEnd is not fired on this second removeCardAndSuccessors
        // call while done as part of finishing up the previous card's
        // removeCardAndSuccessors. A queue approach as described in 973038 does
        // not help. It seems like the _transitionEnd for the second call does
        // not ever fire. Need some async delay, not sure why yet. Otherwise,
        // _eatingEventsUntilNextCard ends up as true, since the reset logic for
        // it in _onTransitionEnd does not fire. An immediate setTimeout is not
        // enough, bothersome that it needs a time threshold.
        // pushedSecondaryCard is needed besides just a cardHasBeenShown,
        // because this card calls the oauth code, which may show its own cards,
        // but then navigate back to this card for a moment. In that case, the
        // card needs to stay up and visible.
        if (this.pushedSecondaryCard) {
          setTimeout(this.onBack.bind(this), 100);
        }
      } else {
        // First time the card has been shown, can now sort out what card to
        // show next. This logic could be in onArgs, but it is racy, where
        // learnAbout could complete before the animation to this card completes
        // which would lead to a case where think we have pushed a secondary
        // card, but it is really the first time this card is shown, so it would
        // be hard to know if this card was being shown for first time setup
        // reasons, or because a cancel/back had occurred. Ideally, learnAbout()
        // would be called in setup_account_info, but since it could take a
        // moment to complete by waiting for network connections to complete as
        // part of autodiscovery, this card is shown to give the user feedback
        // that something is happening. Instead of using the card visible state
        // as a hack to know the cancel state, switch to a callingCard card
        // passing approach so the next card can give a specific callingCard
        // cancel signal. However, bug 973038 needs to be solved, or some way
        // to remove more than one card at a time. Passing `2` to the
        // removeCardAndSuccessors call from this card if callingCard cancel
        // signal was received would also work, if we get proper expectations
        // around the number of ontransitioned events in that case.
        this.cardHasBeenShown = true;
        if (!this.args.password) {
          this.learnAbout();
        } else {
          // The manual config pathway.
          this.tryCreate();
        }
      }
    },

    onBack: function(e) {
      if (e) {
        e.preventDefault();
      }
      this.cancelCreation();
      this.createCanceled = true;
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    /**
     * Trigger the back-end's autoconfig logic based on just knowing the user's
     * email address to figure out what to do next.
     */
    learnAbout: function() {
      MailAPI.learnAboutAccount({
        emailAddress: this.args.emailAddress
      }, function(details) {
        var args = this.args;
        args.configInfo = details.configInfo;
        var result = details.result;

        // - We can autoconfig and it's time to use oauth!
        if (result === 'need-oauth2') {
          oauthFetch(details.configInfo.oauth2Settings, {
            login_hint: args.emailAddress
          })
          .then(function(response) {
            // Cancellation means lose the progress card and go back to entering
            // the user's email address.
            if (response.status === 'cancel') {
              this.onBack();
            // Successful oauth'ing means time to complete the account creation.
            } else if (response.status === 'success') {
              args.configInfo.oauth2Secrets = response.secrets;
              args.configInfo.oauth2Tokens = response.tokens;
              this.tryCreate();
            // Any other error means things did not work.  Things not working
            // implies things will never work and so let's dump the user into
            // the manual config card.
            } else {
              console.error('Unknown oauthFetch status: ' + response.status);
              this._divertToManualConfig();
            }
          }.bind(this), this.onCreationError.bind(this));
        // We can autoconfig but we need the user's password.
        } else if (result === 'need-password') {
          // Track that a secondary card was added that could lead to a cancel
          // in that case, need to cancel this card too.
          this.pushedSecondaryCard = true;
          cards.pushCard(
            'setup_account_password', 'animate',
            {
              displayName: args.displayName,
              emailAddress: args.emailAddress
            },
            'right');
        // No configuration data available, the user's only option is manual
        // config.
        } else { // must be no-config-info and even if not, we'd want this.
          this._divertToManualConfig();
        }
      }.bind(this));
    },

    /**
     * learnAbout decided the only option for the user is to manually configure
     * their account.  Sorry, user!
     */
    _divertToManualConfig: function() {
      this.pushedSecondaryCard = true;
      cards.pushCard('setup_manual_config', 'animate', {
        displayName: this.args.displayName,
        emailAddress: this.args.emailAddress
      },
      'right');
    },

    tryCreate: function() {
      var args = this.args;
      var options = {
        displayName: args.displayName,
        emailAddress: args.emailAddress,
        password: args.password,
        outgoingPassword: args.outgoingPassword
      };

      MailAPI.tryToCreateAccount(
        options,
        args.configInfo || null,
        function(err, errDetails, account) {
          this.creationInProcess = false;
          if (err) {
            this.onCreationError(err, errDetails);
          } else {
            if (this.createCanceled) {
              account.deleteAccount();
            } else {
              this.onCreationSuccess(account);
            }
          }
        }.bind(this));
    },

    onCreationError: function(err, errDetails) {
      this.callingCard.showError(err, errDetails);
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    onCreationSuccess: function(account) {
      cards.pushCard('setup_account_prefs', 'animate',
      {
        account: account
      });
    },

    die: function() {
      this.cancelCreation();
    }
  }
];
});
