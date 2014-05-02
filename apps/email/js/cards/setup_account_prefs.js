/**
 * Setup is done; add another account?
 */
'use strict';
define(function(require) {

var cards = require('cards');

return [
  require('./base')(require('template!./setup_account_prefs.html')),
  require('./account_prefs_mixins'),
  {
    onArgs: function(args) {
      this.account = args.account;
      this._bindPrefs('tng-account-check-interval', 'tng-notify-mail');
    },

    onNext: function(event) {
      cards.pushCard('setup_done', 'animate');
    },

    die: function() {
    }
  }
];
});
