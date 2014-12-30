/* global Application */

(function(exports) {
  'use strict';

  function AppBookmark(options) {
    Application.prototype.constructor.call(this, options);
    this.thumbnail = options.thumbnail;
    this.launchURL = options.launchURL;
  };

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

  exports.AppBookmark = AppBookmark;
}(window));
