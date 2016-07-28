/**
 * Setup is done; add another account?
 */
'use strict';
define(function(require) {

var cards = require('cards'),
    mozL10n = require('l10n!');

return [
  require('./base_card')(require('template!./setup_account_prefs.html')),
  require('./account_prefs_mixins'),
  {
    onArgs: function(args) {
      this.account = args.account;
      this.identity = this.account.identities[0];

      // Establish defaults specifically for our email app.
      this.identity.modifyIdentity({
        signatureEnabled: true,
        signature: mozL10n.get('settings-default-signature-2')
      });

      this._bindPrefs('tng-account-check-interval',
                      'tng-notify-mail',
                      'tng-sound-onsend',
                      'tng-signature-input',
                      'signature-button');
    },

    onNext: function(event) {
      cards.pushCard('setup_done', 'animate');
    },

    onCardVisible: function() {
      this.updateSignatureButton();
    },

    die: function() {
    }
  }
];
});
