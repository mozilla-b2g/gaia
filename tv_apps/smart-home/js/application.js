/* global Card */

(function(exports) {
  'use strict';

  var Application = function Application(options) {
    this.nativeApp = options.nativeApp;
    this.name = options.name;
    this.cachedIconBlob = undefined;
    this.cachedIconURL = options.cachedIconURL;
    Card.prototype.constructor.call(this);
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

  exports.Application = Application;
}(window));
