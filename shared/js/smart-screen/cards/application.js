/* global Card */

(function(exports) {
  'use strict';

  var Application = function Application(options) {
    this.nativeApp = options.nativeApp;
    this.name = options.name;
    this.cachedIconBlob = undefined;
    this.thumbnail = options.thumbnail;
    this.launchURL = options.launchURL;
    this.group = options.group;
    Card.prototype.constructor.call(this);
  };

  Application.deserialize = function app_deserialize(cardEntry, installedApps) {
    var cardInstance;
    if (cardEntry && installedApps && cardEntry.type === 'Application') {
      cardInstance = new Application({
        nativeApp: installedApps[cardEntry.manifestURL],
        name: cardEntry.name,
        thumbnail: cardEntry.thumbnail,
        launchURL: cardEntry.launchURL,
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

  Application.prototype.serialize = function app_serialize() {
    return {
      manifestURL: this.nativeApp.manifestURL,
      name: this.name,
      type: 'Application',
      thumbnail: this.thumbnail,
      launchURL: this.launchURL,
      group: this.group
    };
  };

  Application.prototype.launch = function app_launch(args) {
    if (this.nativeApp && this.nativeApp.launch && !this.launchURL) {
      this.nativeApp.launch(args);
    } else {
      if (!Application._iacPort) {
        console.error('no iacPort found, we cannot launch Application');
        return;
      }

      Application._iacPort.postMessage({
        'manifestURL': this.nativeApp.manifestURL,
        'timestamp': (new Date()).getTime(),
        'url': this.launchURL
      });
    }
  };

  window.addEventListener('load', function _retrieveIACPort() {
    window.removeEventListener('load', _retrieveIACPort);

    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      if (app) {
        app.connect('customlaunchpath').then(function onAccepted(ports) {
          Application._iacPort = ports[0];
        });
      }
    };
  });

  exports.Application = Application;
}(window));
