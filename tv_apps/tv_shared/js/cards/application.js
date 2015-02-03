/* global Card */

(function(exports) {
  'use strict';

  var Application = function Application(options) {
    this.nativeApp = options.nativeApp;
    this.name = options.name;
    this.cachedIconBlob = undefined;
    this.cachedIconURL = options.cachedIconURL;
    this.group = options.group;
    Card.prototype.constructor.call(this);
  };

  Application.deserialize = function app_deserialize(cardEntry, installedApps) {
    var cardInstance;
    if (cardEntry && installedApps && cardEntry.type === 'Application') {
      cardInstance = new Application({
        nativeApp: installedApps[cardEntry.manifestURL],
        name: cardEntry.name,
        group: cardEntry.group
      });
    }
    return cardInstance;
  };

  Application.prototype = Object.create(Card.prototype);

  Application.prototype.constructor = Application;

  // expose getter of property of nativeApp
  var exposedPropertyNames = ['manifest', 'updateManifest'];
  exposedPropertyNames.forEach(function(propertyName) {
    Object.defineProperty(Application.prototype, propertyName, {
      get: function() {
        return this.nativeApp && this.nativeApp[propertyName];
      }
    });
  });

  Application.prototype.launch = function app_launch(args) {
    if (this.nativeApp && this.nativeApp.launch) {
      this.nativeApp.launch(args);
    }
  };

  Application.prototype.serialize = function app_serialize() {
    return {
      manifestURL: this.nativeApp.manifestURL,
      name: this.name,
      type: 'Application',
      group: this.group
    };
  };

  exports.Application = Application;
}(window));
