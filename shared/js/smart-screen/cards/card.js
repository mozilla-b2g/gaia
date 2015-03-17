/* global evt */

(function(exports) {
  'use strict';

  var _counter = 0;

  // Card is the base class for Application, Deck, and Folder
  var Card = function Card() {
    this.generateCardId();
  };

  Card.deserialize = function c_deserialize(cardEntry) {
    // just to prevent undefined error
  };

  Card.prototype = evt({
    get cardId() {
      return this._id;
    },
    generateCardId: function c_generateCardId() {
      // XXX: use constructor.name + name + incremental counter
      // as cardId for now. Notice that cardId is only meaningful for
      // Smart-Home app. Because only Smart-Home app has 'write' privilege.
      var name = (this.nativeApp && this.nativeApp.manifest) ?
        this.nativeApp.manifest.name : 'card';
      this._id = this.constructor.name + '-' + name + '-' + (_counter);
      _counter += 1;
      return this._id;
    },
    serialize: function c_serialize() {
      // just to prevent undefined error
    },

    constructor: Card
  });

  exports.Card = Card;

}(window));
