/* global evt */

(function(exports) {
  'use strict';

  var _counter = 0;

  // Card is the base class for Application, Deck, and Folder
  var Card = function Card() {
    this.generateCardId();
  };

  Card.prototype = evt({
    get cardId() {
      return this._id;
    },
    generateCardId: function() {
      // XXX: use constructor.name + name + incremental counter
      // as cardId for now
      this._id = this.constructor.name + '-' +
        this.name + '-' + (_counter);
      _counter += 1;
      return this._id;
    },
    constructor: Card
  });

  exports.Card = Card;

}(window));
