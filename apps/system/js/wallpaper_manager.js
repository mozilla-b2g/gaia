/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global SettingsURL, SettingsListener */

'use strict';

(function(exports) {

  /**
  * This system module monitors settings change of wallpaper,
  * gets a blob URL from that wallpaper image source,
  * and broadcasts the URL for related modules to change
  * their (for example) background image.
  *
  * @class WallpaperManager
  *
  */

  function WallpaperManager() {
    this._started = false;
    this._blobURL = null;
  }

  WallpaperManager.prototype = {
    /**
     * Bootstrap the module, begin listening to wallpaper events
     */
    start: function() {
      if (this._started) {
        throw 'Instance should not be start()\'ed twice.';
      }
      this._started = true;

      var wallpaperURL = new SettingsURL();

      SettingsListener.observe(
        'wallpaper.image',
        'resources/images/backgrounds/default.png',
        (function(value) {
          this._blobURL = wallpaperURL.set(value);
          var evt = new CustomEvent('wallpaperchange',
            { bubbles: true, cancelable: false,
              detail: { url: wallpaperURL.set(value) } });
          window.dispatchEvent(evt);
        }).bind(this)
      );
    },

    /**
     * Return the blob URL saved from earlier wallpaper change event
     * @return {String} the blob URL
     */
    getBlobURL: function() {
      return this._blobURL;
    }
  };

  exports.WallpaperManager = WallpaperManager;
}(window));
