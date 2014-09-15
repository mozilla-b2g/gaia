/*global define*/
'use strict';
define(function(require) {

var templateNode = require('tmpl!./setup_progress.html'),
    common = require('mail_common'),
    MailAPI = require('api'),
    oauthFetch = require('cards/oauth2/fetch'),
    Cards = common.Cards;

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
function SetupProgressCard(domNode, mode, args) {
  this.domNode = domNode;
  this.callingCard = args.callingCard;
  this.args = args;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  this.onBack = this.onBack.bind(this);
  backButton.addEventListener('click', this.onBack, false);

  this.creationInProcess = true;

  if (!args.password) {
    this.learnAbout();
  } else {
    // The manual config pathway.
    this.tryCreate();
  }
}

SetupProgressCard.prototype = {
  cancelCreation: function() {
    if (!this.creationInProcess) {
      return;
    }
    // XXX implement cancellation
  },

  onCardVisible: function() {
    // If this card was made visible because of a cancel of a secondary config
    // card, just go back one more card. The setTimeout is a hack. Without it,
    // the final card is not actionable because the onTransitionEnd is not
    // fired on this second removeCardAndSuccessors call while done as part
    // of finishing up the previous card's removeCardAndSuccessors. A queue
    // approach as described in 973038 does not help. It seems like the
    // _transitionEnd for the second call does not ever fire. Need some async
    // delay, not sure why yet. Otherwise, _eatingEventsUntilNextCard ends up
    // as true, since the reset logic for it in _onTransitionEnd does not fire.
    if (this.pushedSecondaryCard) {
      // Doing an immediate setTimeout is not enough, bothersome that it
      // needs a time threshold
      setTimeout(this.onBack, 100);
    }
  },

  onBack: function(e) {
    if (e) {
      e.preventDefault();
    }
    this.cancelCreation();
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
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
        Cards.pushCard(
          'setup_account_password', 'default', 'animate',
          {
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
    Cards.pushCard(
      'setup_manual_config', 'default', 'animate',
      {
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
          this.onCreationSuccess(account);
        }
      }.bind(this));
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
