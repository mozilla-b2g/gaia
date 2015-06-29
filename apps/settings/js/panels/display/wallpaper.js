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
  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');
  var WALLPAPER_KEY = 'wallpaper.image';

  /**
   * @requires module:modules/mvvm/observable
   * @returns {Wallpaper}
   */
  var Wallpaper = Module.create(function Wallpaper() {
    this.super(Observable).call(this);
    this._init();
  }).extend(Observable);

  /**
   * Source path of wallpaper.
   *
   * @access public
   * @memberOf Wallpaper
   * @type {String}
   */
  Observable.defineObservableProperty(Wallpaper.prototype, 'wallpaperSrc', {
    readonly: true,
    value: ''
  });

  /**
   * Init Wallpaper module.
   *
   * @access private
   * @memberOf Wallpaper
   */
  Wallpaper.prototype._init = function() {
    this.WALLPAPER_KEY = WALLPAPER_KEY;
    this.wallpaperURL = new SettingsURL();
    this._watchWallpaperChange();
  };
  
  /**
   * Watch the value of wallpaper.image from settings and change wallpaperSrc.
   *
   * @access private
   * @memberOf Wallpaper
   */
  Wallpaper.prototype._watchWallpaperChange = function() {
    SettingsListener.observe(this.WALLPAPER_KEY, '', (value) => {
        this._wallpaperSrc = this.wallpaperURL.set(value);
    });
  };

  /**
   * Switch to wallpaper or gallery app to pick wallpaper.
   *
   * @access private
   * @memberOf Wallpaper
   * @param {String} secret
   */
  Wallpaper.prototype._triggerActivity = function(secret) {
    var mozActivity = new MozActivity({
      name: 'pick',
      data: {
        type: ['wallpaper', 'image/*'],
        includeLocked: (secret !== null),
        // XXX: This will not work with Desktop Fx / Simulator.
        width: Math.ceil(window.screen.width * window.devicePixelRatio),
        height: Math.ceil(window.screen.height * window.devicePixelRatio)
      }
    });
    mozActivity.onsuccess = () => {
      this._onPickSuccess(mozActivity.result.blob, secret);
    };

    mozActivity.onerror = this._onPickError;
  };

  /**
   * Call back when picking success.
   *
   * @access private
   * @memberOf Wallpaper
   * @param {String} blob
   * @param {String} secret
   */
  Wallpaper.prototype._onPickSuccess = function(blob, secret) {
    if (!blob) {
      return;
    }
    if (blob.type.split('/')[1] === ForwardLock.mimeSubtype) {
      // If this is a locked image from the locked content app, unlock it
      ForwardLock.unlockBlob(secret, blob, (unlocked) => {
        this._setWallpaper(unlocked);
      });
    } else {
      this._setWallpaper(blob);
    }
  };

  /**
   * Update the value of wallpaper.image from settings.
   *
   * @access private
   * @param {String} value
   * @memberOf Wallpaper
   */
  Wallpaper.prototype._setWallpaper = function(value) {
    var config = {};
    config[this.WALLPAPER_KEY] = value;
    SettingsListener.getSettingsLock().set(config);
  };

  /**
   * Call back when picking fail.
   *
   * @access private
   * @memberOf Wallpaper
   */
  Wallpaper.prototype._onPickError = function() {
    console.warn('pick failed!');
  };

  /**
   * Start to select wallpaper.
   *
   * @access public
   * @memberOf Wallpaper
   */
  Wallpaper.prototype.selectWallpaper = function() {
    ForwardLock.getKey(this._triggerActivity.bind(this));
  };

  return Wallpaper;
});
