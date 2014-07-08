/* global MozActivity */
/**
 * Wallpaper:
 *   - Select wallpaper by calling wallpaper.selectWallpaper.
 *   - Update wallpaperSrc if wallpaper.image is changed, which is watched
 *     by Observable module.
 * Wallpaper handles only data and does not involve in any UI logic.
 *
 * @module Wallpaper
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsURL = require('shared/settings_url');
  var ForwardLock = require('shared/omadrm/fl');
  var Observable = require('modules/mvvm/observable');
  var WALLPAPER_KEY = 'wallpaper.image';
  /**
   * @alias module:display/wallpaper
   * @requires module:modules/mvvm/observable
   * @returns {wallpaperPrototype}
   */
  var wallpaperPrototype = {
    /**
     * Init Wallpaper module.
     *
     * @access private
     * @memberOf wallpaperPrototype
     */
    _init: function w_init() {
      this.WALLPAPER_KEY = WALLPAPER_KEY;
      this.wallpaperURL = new SettingsURL();
      this._watchWallpaperChange();
    },

    /**
     * Watch the value of wallpaper.image from settings and change wallpaperSrc.
     *
     * @access private
     * @memberOf wallpaperPrototype
     */
    _watchWallpaperChange: function w__watch_wallpaper_change() {
      SettingsListener.observe(this.WALLPAPER_KEY, '',
        function onHomescreenchange(value) {
          this.wallpaperSrc = this.wallpaperURL.set(value);
      }.bind(this));
    },

    /**
     * Switch to wallpaper or gallery app to pick wallpaper.
     *
     * @access private
     * @memberOf wallpaperPrototype
     * @param {String} secret
     */
    _triggerActivity: function w__trigger_activity(secret) {
      var mozActivity = new MozActivity({
        name: 'pick',
        data: {
          type: ['wallpaper', 'image/*'],
          includeLocked: (secret !== null),
          // XXX: This will not work with Desktop Fx / Simulator.
          width: window.screen.width * window.devicePixelRatio,
          height: window.screen.height * window.devicePixelRatio
        }
      });
      mozActivity.onsuccess = function() {
        this._onPickSuccess(mozActivity.result.blob, secret);
      }.bind(this);

      mozActivity.onerror = this._onPickError;
    },

    /**
     * Call back when picking success.
     *
     * @access private
     * @memberOf wallpaperPrototype
     * @param {String} blob
     * @param {String} secret
     */
    _onPickSuccess: function w__on_pick_success(blob, secret) {
      if (!blob) {
        return;
      }
      if (blob.type.split('/')[1] === ForwardLock.mimeSubtype) {
        // If this is a locked image from the locked content app, unlock it
        ForwardLock.unlockBlob(secret, blob, function(unlocked) {
          this._setWallpaper(unlocked);
        }.bind(this));
      } else {
        this._setWallpaper(blob);
      }
    },

    /**
     * Update the value of wallpaper.image from settings.
     *
     * @access private
     * @param {String} value
     * @memberOf wallpaperPrototype
     */
    _setWallpaper: function w__set_wallpaper(value) {
      var config = {};
      config[this.WALLPAPER_KEY] = value;
      SettingsListener.getSettingsLock().set(config);
    },

    /**
     * Call back when picking fail.
     *
     * @access private
     * @memberOf wallpaperPrototype
     */
    _onPickError: function w__on_pick_error() {
      console.warn('pick failed!');
    },

    /**
     * Source path of wallpaper.
     *
     * @access public
     * @memberOf wallpaperPrototype
     * @type {String}
     */
    wallpaperSrc: '',

    /**
     * Start to select wallpaper.
     *
     * @access public
     * @memberOf wallpaperPrototype
     */
    selectWallpaper: function w_select_wallpaper() {
      ForwardLock.getKey(this._triggerActivity.bind(this));
    }
  };

  return function ctor_wallpaper() {
    // Create the observable object using the prototype.
    var wallpaper = Observable(wallpaperPrototype);
    wallpaper._init();
    return wallpaper;
  };
});
