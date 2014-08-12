/*global define*/
define(function(require) {

var templateNode = require('tmpl!./setup_account_prefs.html'),
    prefsMixin = require('./account_prefs_mixins'),
    mix = require('mix'),
    evt = require('evt'),
    mozL10n = require('l10n!'),
    common = require('mail_common'),
    Cards = common.Cards;

/**
 * Setup is done; add another account?
 */
function SetupAccountPrefsCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.identity = this.account.identities[0];

  // Establish defaults specifically for our email app.
  this.identity.modifyIdentity({ signatureEnabled: true,
    signature: mozL10n.get('settings-default-signature') });

  this.nextButton = this.nodeFromClass('sup-info-next-btn');
  this.nextButton.addEventListener('click', this.onNext.bind(this), false);

  this._bindPrefs('tng-account-check-interval',
                  'tng-notify-mail',
                  'tng-sound-onsend',
                  'tng-signature-input',
                  'signature-button');
}

SetupAccountPrefsCard.prototype = {
  onNext: function(event) {
    Cards.pushCard(
      'setup_done', 'default', 'animate',
      {});
  },

  onCardVisible: function() {
    this.updateSignatureButton();
  },

  die: function() {
  }
};

// Wire up some common pref handlers.
mix(SetupAccountPrefsCard.prototype, prefsMixin);

Cards.defineCardWithDefaultMode(
    'setup_account_prefs',
    { tray: false },
    SetupAccountPrefsCard,
    templateNode
);

return SetupAccountPrefsCard;

});
