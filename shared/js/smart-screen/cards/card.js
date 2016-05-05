/* global evt, uuid */

(function(exports) {
  'use strict';

  // Card is the base class for Application, Deck, AppBookmark, and Folder
  var Card = function Card(options) {
    if (options && options.id) {
      this._id = options.id;
    } else {
      this._id = uuid.v4();
    }
  };

  Card.deserialize = function c_deserialize(cardEntry) {
    // just to prevent undefined error
  };

  Card.prototype = evt({
    get cardId() {
      return this._id;
    },
    serialize: function c_serialize() {
      // just to prevent undefined error
    },

    constructor: Card
  });

  exports.Card = Card;

}(window));
