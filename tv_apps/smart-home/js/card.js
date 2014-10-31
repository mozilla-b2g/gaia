/* global evt */

(function(exports) {
  'use strict';

  // Card is the base class for Application, Deck, and Folder
  var Card = function(options) {
    this.name = 'Unknown';
    this.cachedIconURL = options.cachedIconURL;
  };

  Card.prototype = evt(Card.prototype);

  exports.Card = Card;

}(window));
