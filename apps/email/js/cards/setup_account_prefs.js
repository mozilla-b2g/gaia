/*global define*/
define(function(require) {

var templateNode = require('tmpl!./setup_account_prefs.html'),
    prefsMixin = require('./account_prefs_mixins'),
    mix = require('mix'),
    common = require('mail_common'),
    Cards = common.Cards;

/**
 * Setup is done; add another account?
 */
function SetupAccountPrefsCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;

  this.nextButton = this.nodeFromClass('sup-info-next-btn');
  this.nextButton.addEventListener('click', this.onNext.bind(this), false);

  this._bindPrefs('tng-account-check-interval', 'tng-notify-mail');
}

SetupAccountPrefsCard.prototype = {
  onNext: function(event) {
    Cards.pushCard(
      'setup_done', 'default', 'animate',
      {});
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
