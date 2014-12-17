/* global Card */

(function(exports) {
  'use strict';

  var Deck = function Deck(options) {
    this.nativeApp = options.nativeApp;
    this.name = options.name;
    this.cachedIconURL = options.cachedIconURL;
    Card.prototype.constructor.call(this);
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

  Deck.prototype.launch = function app_launch(args) {
    if (this.nativeApp && this.nativeApp.launch) {
      this.nativeApp.launch(args);
    }
  };

  exports.Deck = Deck;
}(window));
