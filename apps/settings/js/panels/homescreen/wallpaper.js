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
define(require => {
  'use strict';

  const WALLPAPER_KEY = 'wallpaper.image';

  var SettingsListener = require('shared/settings_listener');
  var SettingsURL = require('shared/settings_url');
  var ForwardLock = require('shared/omadrm/fl');
  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  var Wallpaper = Module.create(function Wallpaper() {
    this.super(Observable).call(this);
    this._init();
  }).extend(Observable);

  /**
   * Source path of wallpaper.
   *
   * @memberOf Wallpaper
   * @type {String}
   * @public
   */
  Observable.defineObservableProperty(Wallpaper.prototype, 'wallpaperSrc', {
    readonly: true,
    value: ''
  });

  /**
   * Init Wallpaper module.
   *
   * @private
   */
  Wallpaper.prototype._init = function w_init() {
    this.wallpaperURL = new SettingsURL();
    this._watchWallpaperChange();
  };

  /**
   * Watch the value of wallpaper.image from settings and change wallpaperSrc.
   *
   * @private
   */
  Wallpaper.prototype._watchWallpaperChange = function w_watchWallpaper() {
    SettingsListener.observe(WALLPAPER_KEY, '', value => {
      this._wallpaperSrc = this.wallpaperURL.set(value);
    });
  };

  /**
   * Switch to wallpaper or gallery app to pick wallpaper.
   *
   * @param {String} secret
   * @private
   */
  Wallpaper.prototype._triggerActivity = function w_triggerActivity(secret) {
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
   * @param {String} blob
   * @param {String} secret
   * @private
   */
  Wallpaper.prototype._onPickSuccess = function w_onPickSuccess(blob, secret) {
    if (!blob) {
      return;
    }
    if (blob.type.split('/')[1] === ForwardLock.mimeSubtype) {
      // If this is a locked image from the locked content app, unlock it.
      ForwardLock.unlockBlob(secret, blob, unlocked => {
        this._setWallpaper(unlocked);
      });
    } else {
      this._setWallpaper(blob);
    }
  };

  /**
   * Update the value of wallpaper.image from settings.
   *
   * @param {String} value
   * @private
   */
  Wallpaper.prototype._setWallpaper = function w_setWallpaper(value) {
    var config = {};
    config[WALLPAPER_KEY] = value;
    SettingsListener.getSettingsLock().set(config);
  };

  /**
   * Call back when picking fail.
   *
   * @private
   */
  Wallpaper.prototype._onPickError = function w_onPickError() {
    console.warn('pick failed!');
  };

  /**
   * Start to select wallpaper.
   *
   * @public
   */
  Wallpaper.prototype.selectWallpaper = function w_selectWallpaper() {
    ForwardLock.getKey(this._triggerActivity.bind(this));
  };

  return Wallpaper;
});
