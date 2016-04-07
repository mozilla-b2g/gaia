/**
 * Setup is done; add another account?
 */
'use strict';
define(function(require) {

var evt = require('evt');

return [
  require('./base_card')(require('template!./setup_done.html')),
  {
    onAddAnother: function() {
      evt.emit('addAccount');
    },
    onShowMail: function() {
      // Nuke this card
      evt.emit('showLatestAccount');
    },

    die: function() {
    }
  }
];

});
