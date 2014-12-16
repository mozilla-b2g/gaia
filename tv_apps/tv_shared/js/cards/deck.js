/* global Card */

(function(exports) {
  'use strict';

  var Deck = function Deck(options) {
    this.nativeApp = options.nativeApp;
    this.name = options.name;
    this.cachedIconURL = options.cachedIconURL;
    Card.prototype.constructor.call(this);
  };

  Deck.deserialize = function deck_deserialize(cardEntry, installedApps) {
    var cardInstance;
    if (cardEntry && installedApps && cardEntry.type === 'Deck') {
      cardInstance = new Deck({
        name: cardEntry.name,
        nativeApp: cardEntry.manifestURL &&
          installedApps[cardEntry.manifestURL],
        cachedIconURL: cardEntry.cachedIconURL
      });
    }
    return cardInstance;
  };

  Deck.prototype = Object.create(Card.prototype);

  Deck.prototype.constructor = Deck;

  // expose getter of property of nativeApp
  var exposedPropertyNames = ['manifest', 'updateManifest'];
  exposedPropertyNames.forEach(function(propertyName) {
    Object.defineProperty(Deck.prototype, propertyName, {
      get: function() {
        return this.nativeApp && this.nativeApp[propertyName];
      }
    });
  });

  Deck.prototype.launch = function deck_launch(args) {
    if (this.nativeApp && this.nativeApp.launch) {
      this.nativeApp.launch(args);
    }
  };

  Deck.prototype.serialize = function deck_serialize() {
    // A deck doesn't need background color because it is always full-sized
    // icon. If not, it is an issue from visual's image.
    return {
      name: this.name,
      cachedIconURL: this.cachedIconURL,
      manifestURL: this.nativeApp && this.nativeApp.manifestURL,
      type: 'Deck'
    };
  };

  exports.Deck = Deck;
}(window));
