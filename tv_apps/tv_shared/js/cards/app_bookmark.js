/* global Application */

(function(exports) {
  'use strict';

  function AppBookmark(options) {
    Application.prototype.constructor.call(this, options);
    this.thumbnail = options.thumbnail;
    this.launchURL = options.launchURL;
  }

  AppBookmark.deserialize = function ab_deserialize(cardEntry, installedApps) {
    var cardInstance;
    if (cardEntry && installedApps && cardEntry.type === 'AppBookmark') {
      cardInstance = new AppBookmark({
        nativeApp: installedApps[cardEntry.manifestURL],
        name: cardEntry.name,
        thumbnail: cardEntry.thumbnail,
        launchURL: cardEntry.launchURL
      });
    }
    return cardInstance;
  };

  AppBookmark.prototype = Object.create(Application.prototype);

  AppBookmark.prototype.constructor = AppBookmark;

  AppBookmark.prototype.serialize = function ab_serialize() {
    return {
      manifestURL: this.nativeApp.manifestURL,
      name: this.name,
      thumbnail: this.thumbnail,
      launchURL: this.launchURL,
      type: 'AppBookmark'
    };
  };

  AppBookmark.prototype.launch = function app_launch(args) {
    if (!AppBookmark._iacPort) {
      console.error('no iacPort found, we cannot launch AppBookmark');
      return;
    }

    AppBookmark._iacPort.postMessage({
      'manifestURL': this.nativeApp.manifestURL,
      'timestamp': (new Date()).getTime(),
      'url': this.launchURL
    });
  };


  window.addEventListener('load', function _retrieveIACPort() {
    window.removeEventListener('load', _retrieveIACPort);

    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      app.connect('customlaunchpath').then(function onAccepted(ports) {
        AppBookmark._iacPort = ports[0];
      });
    };
  });

  exports.AppBookmark = AppBookmark;
}(window));
