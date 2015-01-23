/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global ImageUtils, LazyLoader, OrientationManager */

'use strict';

(function(exports) {

  const WALLPAPER_KEY = 'wallpaper.image';
  const WALLPAPER_VALID_KEY = 'wallpaper.image.valid';
  const DEFAULT_WALLPAPER_URL = 'resources/images/backgrounds/default.png';

  /**
   * This system module reads the system wallpaper setting on startup
   * and monitors changes to that setting, broadcasting a
   * 'wallpaperchange' event with a blob: URL to tell the system and
   * lockscreen about the new wallpaper.
   *
   * If the wallpaper value read from the settings DB is a URL this
   * module converts it to a blob. If the wallpaper image does not
   * exactly match the size of the screen, this module resizes it
   * (lazy-loading shared/js/image_utils.js when needed). If the
   * wallpaper value is converted to a blob or resized, the modified
   * value is saved back to the settings DB so that it will not need
   * to be modified the next time it is read.
   *
   * start(), stop(), and getBlobURL() are the only public methods,
   * and stop() is only exposed for the benefit of unit
   * tests. _setWallpaper() is called on startup and whenever the
   * wallpaper.image setting changes. Each call to _setWallpaper()
   * eventually causes a call to _publish() which broadcasts the new
   * wallpaper event to the lockscreen and the rest of the system
   * app. The call to _publish() does not always happen directly,
   * however: _setWallpaper() may call _checkSize(), which calls
   * _publish(), or it may call _toBlob() which calls _checkSize().
   * Unless the build is mis-configured and the wallpaper in the
   * settings db and the fallback default wallpaper is broken, every
   * call to _setWallpaper() ends up broadcasting a 'wallpaperchange'
   * event with a valid blob: url for a wallpaper image that has the
   * same size as the screen.
   *
   * @class WallpaperManager
   */
  function WallpaperManager() {
    this._started = false;
    this._blobURL = null;
  }

  WallpaperManager.prototype = {
    /**
     * Bootstrap the module. Read the current wallpaper from the
     * settings db and pass it to _setWallpaper(). Also listen for
     * changes to the wallpaper and invoke _setWallpaper() for each
     * one.
     */
    start: function() {
      if (this._started) {
        throw 'Instance should not be start()\'ed twice.';
      }
      this._started = true;
      debug('started');

      // Query the wallpaper
      var lock = navigator.mozSettings.createLock();
      var query = lock.get(WALLPAPER_KEY);
      query.onsuccess = function() {
        var wallpaper = query.result[WALLPAPER_KEY];
        if (!wallpaper) {
          debug('no wallpaper found at startup; using default');
          this._setWallpaper(DEFAULT_WALLPAPER_URL);
        }
        else if (wallpaper instanceof Blob) {
          // If the wallpaper is a blob, first go see if we have already
          // validated it size. Because if we have, we don't have to check
          // the size again or even load the code to check its size.
          var query2 = lock.get(WALLPAPER_VALID_KEY);
          query2.onsuccess = function() {
            var valid = query2.result[WALLPAPER_VALID_KEY];
            this._setWallpaper(wallpaper, valid);
          }.bind(this);
        }
        else {
          // If the wallpaper is not a blob, just pass it to _setWallpaper
          // and try to convert it to a blob there.
          this._setWallpaper(wallpaper);
        }
      }.bind(this);

      // And register a listener so we'll be notified of future changes
      // to the wallpaper
      this.observer = function(e) {
        this._setWallpaper(e.settingValue);
      }.bind(this);
      navigator.mozSettings.addObserver(WALLPAPER_KEY, this.observer);
    },

    /**
     * Stop the module an stop listening for changes to the wallpaper setting.
     * This method is only used by unit tests.
     */
    stop: function() {
      if (!this._started) { return; }
      navigator.mozSettings.removeObserver(WALLPAPER_KEY, this.observer);
      this._started = false;
    },

    /**
     * Return the blob URL saved from earlier wallpaper change event
     * The lockscreen may miss the event and needs to look the URL up here.
     * @returns {String} the blob URL
     */
    getBlobURL: function() {
      if (!this._started) { return; }
      return this._blobURL;
    },

    //
    // This method is called on startup and when the wallpaper
    // changes. It always causes _publish() to be invoked and a
    // "wallpaperchange" event to be broadcast to interested
    // listeners. If the new value is a blob that is already
    // validated, then _publish() is called directly. Otherwise, it is
    // called indirectly by _toBlob() or _checkSize().
    //
    _setWallpaper: function(value, valid) {
      if (!this._started) { return; }

      // If we are called because we just saved a resized blob back
      // to the settings db, then ignore the call.
      if (value instanceof Blob && value.size === this.savedBlobSize) {
        this.savedBlobSize = false;
        return;
      }

      debug('new wallpaper', valid ? 'size already validated' : '');

      if (typeof value === 'string') {
        this._toBlob(value);
      }
      else if (value instanceof Blob) {
        // If this blob has already been validated, we can just display it.
        // Otherwise we need to check its size first
        if (valid) {
          this._publish(value);
        }
        else {
          this._checkSize(value);
        }
      }
      else {
        // The value in the settings database is invalid, so
        // use the default image. Note that this will update the
        // settings db with a valid value.
        debug('Invalid wallpaper value in settings;',
              'reverting to default wallpaper.');
        this._toBlob(DEFAULT_WALLPAPER_URL);
      }
    },

    //
    // This method expects a wallpaper URL (possibly a data: URL) and
    // uses XHR to convert it to a blob. If it succeeds, it passes the
    // blob to _checkSize() which resizes it if needed and calls
    // _publish() to broadcast the new wallpaper.
    //
    _toBlob: function(url) {
      if (!this._started) { return; }
      debug('converting wallpaper url to blob');

      // If we trying to convert the default wallpaper url to a blob
      // note that because there is some error recovery code that behaves
      // differently in that last resort case.
      this.tryingDefaultWallpaper = (url === DEFAULT_WALLPAPER_URL);

      // If the settings db had a string in it we assume it is a
      // relative url or data: url and try to read it with XHR.
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.send();
      xhr.onload = function() {
        // Once we've loaded the wallpaper as a blob, verify its size.
        // We pass true as the second argument to force it to be saved
        // back to the db (as a blob) even if the size is okay.
        this._checkSize(xhr.response, true);
      }.bind(this);
      xhr.onerror = function() {
        // If we couldn't load the url and if it was something other
        // than the default wallpaper url, then try again with the default.
        if (!this.tryingDefaultWallpaper) {
          debug('corrupt wallpaper url in settings;',
                'reverting to default wallpaper');
          this._toBlob(DEFAULT_WALLPAPER_URL);
        }
        else {
          // This was our last resort, and it failed, so no wallpaper
          // image is available.
          console.error('Cannot load wallpaper from', url);
        }
      }.bind(this);
    },

    //
    // This method checks the dimensions of the image blob and crops
    // and resizes the image if necessary so that it is exactly the
    // same size as the screen. If the image was resized, or if it was
    // read from a URL, then this method saves the new blob back to
    // the settings db and marks it as valid. If the image was not
    // resized, then the image is marked as valid so that the check
    // does not need to be performed when the phone is rebooted. In
    // either case, after the image is saved and/or validated, this
    // method calls _publish() to broadcast the new wallpaper.
    //
    // If the blob does not hold a valid image, that will be
    // discovered while attempting to check its size and in that case,
    // this method falls back on the default wallpaper by calling
    // _toBlob() with the default wallpaper URL.
    //
    // This method lazy-loads ImageUtils from shared/js/image_utils.js.
    // Once a wallpaper has had its size checked once, it is marked as
    // valid in the settings db, so these image utilities will not
    // need to be loaded into the system app on subsequent reboots.
    //
    _checkSize: function(blob, needsToBeSaved) {
      if (!this._started) { return; }
      debug('resizing wallpaper if needed');

      // How big (in device pixels) is the screen in its default orientation?
      var screenWidth, screenHeight;
      if (OrientationManager && !OrientationManager.isDefaultPortrait()) {
        // The screen.width and screen.height values depend on how the
        // user is holding the device. If this is a tablet or other
        // device with a screen that defaults to landscape mode, then
        // with width is the bigger dimension
        screenWidth = Math.max(screen.width, screen.height);
        screenHeight = Math.min(screen.width, screen.height);
      } else {
        // Otherwise, the width is the smaller dimension
        screenWidth = Math.min(screen.width, screen.height);
        screenHeight = Math.max(screen.width, screen.height);
      }

      // Use device pixels, not CSS pixels
      screenWidth = Math.ceil(screenWidth * window.devicePixelRatio);
      screenHeight = Math.ceil(screenHeight * window.devicePixelRatio);

      // For performance we need to guarantee that the size of the wallpaper
      // is exactly the same as the size of the screen. LazyLoad the
      // ImageUtils module, and call its resizeAndCropToCover() method to
      // resize and crop the image as needed so that it is the right size.
      // Note that this utility funtion can determine the size of an image
      // without decoding it and if the image is already the right size
      // it will not modify it.
      LazyLoader.load('shared/js/image_utils.js', function() {
        ImageUtils
          .resizeAndCropToCover(blob, screenWidth, screenHeight, ImageUtils.PNG)
          .then(
            function resolve(resizedBlob) {
              // If the blob changed or if the second argument was true
              // then we need to save the blob back to the settings db
              if (resizedBlob !== blob || needsToBeSaved) {
                this._save(resizedBlob);
              }
              else {
                // If the blob didn't change we don't have to save it,
                // but we do need to mark it as valid
                this._validate();
              }

              // Display the wallpaper
              this._publish(resizedBlob);
            }.bind(this),
            function reject(error) {
              // This will only happen if the settings db contains a blob that
              // is not actually an image. If that happens for some reason,
              // fall back on the default wallpaper.
              if (!this.tryingDefaultWallpaper) {
                debug('Corrupt wallpaper image in settings;',
                      'reverting to default wallpaper.');
                this._toBlob(DEFAULT_WALLPAPER_URL);
              }
              else {
                // We were already trying the default wallpaper and it failed.
                // So we just give up in this case.
                console.error('Default wallpaper image is invalid');
              }
            }.bind(this)
          );
      }.bind(this));
    },

    //
    // This method sets a property in the settings db to indicate that
    // the current wallpaper is the same size as the screen. Setting
    // this property is an optimization that allows us to skip the
    // call to _checkSize() on subsequent startups. This method
    // returns synchronously and does not wait for the settings db
    // operation to complete.
    //
    _validate: function() {
      if (!this._started) { return; }
      debug('marking wallpaper as valid');
      var settings = {};
      settings[WALLPAPER_VALID_KEY] = true; // We've checked its size
      navigator.mozSettings.createLock().set(settings);
    },

    //
    // This method saves the wallpaper blob to the settings db and
    // also marks it as valid so that we know on subsequent startups
    // that its size has already been checked. This method returns
    // synchronously and does not wait for the settings db operation
    // to complete.
    //
    _save: function(blob) {
      if (!this._started) { return; }
      debug('saving converted or resized wallpaper to settings');

      // Set a flag so that we don't repeat this whole process when
      // we're notified about this save. The flag contains the size of
      // the blob we're saving so it is very unlikely that we'll have
      // a race condition.
      this.savedBlobSize = blob.size;

      // Now save the blob to the settings db, and also save a flag
      // that indicates that we've already checked the size of the image.
      // This allows us to skip the check at boot time.
      var settings = {};
      settings[WALLPAPER_KEY] = blob;
      settings[WALLPAPER_VALID_KEY] = true; // We've checked its size
      navigator.mozSettings.createLock().set(settings);
    },

    //
    // This method creates a blob: URL for the specfied blob and publishes
    // the URL via a 'wallpaperchange' event. If there was a previous
    // wallpaper, its blob: URL is revoked. This method is synchronous.
    //
    _publish: function(blob) {
      if (!this._started) { return; }
      debug('publishing wallpaperchange event');

      // If we have a blob:// url for previous wallpaper, release it now
      if (this._blobURL) {
        URL.revokeObjectURL(this._blobURL);
      }

      // Create a new blob:// url for this blob
      this._blobURL = URL.createObjectURL(blob);

      // And tell the system about it.
      var evt = new CustomEvent('wallpaperchange', {
        bubbles: true,
        cancelable: false,
        detail: { url: this._blobURL }
      });
      window.dispatchEvent(evt);
    }
  };

  // Log debug messages
  function debug(...args) {
    if (WallpaperManager.DEBUG) {
      args.unshift('[WallpaperManager]');
      console.log.apply(console, args);
    }
  }
  WallpaperManager.DEBUG = false; // Set to true to enable debug output

  /** @exports WallpaperManager */
  exports.WallpaperManager = WallpaperManager;
}(window));
