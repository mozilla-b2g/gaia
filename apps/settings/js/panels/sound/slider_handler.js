/**
 * Handle each slider's functionality.
 * Get correspondent tone, make sure the tone is playable,
 * set volume based on slider position.
 *
 * @module SliderHandler
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsCache = require('modules/settings_cache');

  var INTERVAL = 500;
  var DELAY = 800;
  var BASESHAREURL = '/shared/resources/media/';
  var TONEURLS = {
    'content': BASESHAREURL + 'notifications/notifier_firefox.opus',
    'notification': BASESHAREURL + 'ringtones/ringer_firefox.opus',
    'alarm': BASESHAREURL + 'alarms/ac_awake.opus'
  };
  var TONEKEYS = {
    'content': 'media.ringtone',
    'notification': 'dialer.ringtone',
    'alarm': 'alarm.ringtone'
  };

  var SliderHandler = function() {
    this._element = null;
    this._channelType = '';
    this._channelKey = '';
    this._toneURL = '';
    this._toneKey = '';
    this._previous = null;
    this._isTouching = false;
    this._isFirstInput = false;
    this._intervalID = null;
    this._timeoutID = null;
    this._player = new Audio();
  };

  SliderHandler.prototype = {
    /**
     * initialization
     *
     * The sliders listen to input, touchstart and touchend events to fit
     * the ux requirements, and when the user tap or drag the sliders, the
     * sequence of the events is:
     * touchstart -> input -> input(more if dragging) -> touchend -> input
     *
     * @access public
     * @memberOf SliderHandler.prototype
     * @param  {Object} element html elements
     * @param  {String} channelType type of sound channel
     */
    init: function sh_init(element, channelType) {
      this._element = element;
      this._channelType = channelType;
      this._channelKey = 'audio.volume.' + channelType;
      this._toneURL = TONEURLS[channelType];
      this._toneKey = TONEKEYS[channelType];

      this._boundSetSliderValue = function(value) {
        this._setSliderValue(value);
      }.bind(this);

      // Get the volume value for the slider, also observe the value change.
      SettingsListener.observe(this._channelKey, '', this._boundSetSliderValue);

      this._element.addEventListener('touchstart',
        this._touchStartHandler.bind(this));
      this._element.addEventListener('input',
        this._inputHandler.bind(this));
      this._element.addEventListener('touchend',
        this._touchEndHandler.bind(this));
    },

    /**
     * Stop the tone
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _stopTone: function vm_stopTone() {
      this._player.pause();
      this._player.removeAttribute('src');
      this._player.load();
    },

    /**
     * Play the tone
     *
     * @access private
     * @memberOf SliderHandler.prototype
     * @param  {Blob} blob tone blob
     */
    _playTone: function vm_playTone(blob) {
      // Don't set the audio channel type to content or it will interrupt the
      // background music and won't resume after the user previewed the tone.
      if (this._channelType !== 'content') {
        this._player.mozAudioChannelType = this._channelType;
      }
      this._player.src = URL.createObjectURL(blob);
      this._player.load();
      this._player.loop = true;
      this._player.play();
    },

    /**
     * Change slider's value
     *
     * @access private
     * @memberOf SliderHandler.prototype
     * @param {Number} value slider value
     */
    _setSliderValue: function vm_setSliderValue(value) {
      this._element.value = value;
      // The slider is transparent if the value is not set yet, display it
      // once the value is set.
      if (this._element.style.opacity !== 1) {
        this._element.style.opacity = 1;
      }

      // If it is the first time we set the slider value, we must update the
      // previous value of this channel type
      if (this._previous === null) {
        this._previous = value;
      }
    },

    /**
     * get default tone
     *
     * @access private
     * @memberOf SliderHandler.prototype
     * @param  {Function} callback callback function
     */
    _getDefaultTone: function vm_getDefaultTone(callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', this._toneURL);
      xhr.overrideMimeType('audio/ogg');
      xhr.responseType = 'blob';
      xhr.send();
      xhr.onload = function() {
        callback(xhr.response);
      };
    },

    /**
     * get tone's blob object
     *
     * @access private
     * @memberOf SliderHandler.prototype
     * @param  {Function} callback callback function
     */
    _getToneBlob: function vm_getToneBlob(callback) {
      SettingsCache.getSettings(function(results) {
        if (results[this._toneKey]) {
          callback(results[this._toneKey]);
        } else {
          // Fall back to the predefined tone if the value does not exist
          // in the mozSettings.
          this._getDefaultTone(function(blob) {
            // Save the default tone to mozSettings so that next time we
            // don't have to fall back to it from the system files.
            var settingObject = {};
            settingObject[this._toneKey] = blob;
            navigator.mozSettings.createLock().set(settingObject);

            callback(blob);
          });
        }
      }.bind(this));
    },

    /**
     * Handle touchstart event
     *
     * It stop the tone previewing from the last touchstart if the delayed
     * stopTone() is not called yet.
     *
     * It stop observing when the user is adjusting the slider, this is to
     * get better ux that the slider won't be updated by both the observer
     * and the ui.
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _touchStartHandler: function sh_touchStartHandler(event) {
      this._isTouching = true;
      this._isFirstInput = true;
      this._stopTone();
      SettingsListener.unobserve(this._channelKey, this._boundSetSliderValue);

      this._getToneBlob(function(blob) {
        this._playTone(blob);
      }.bind(this));
    },

    /**
     * Change volume
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _setVolume: function sh_setVolume() {
      var value = parseInt(this._element.value);
      var settingObject = {};
      settingObject[this._channelKey] = value;

      // Only set the new value if it does not equal to the previous one.
      if (value !== this._previous) {
        navigator.mozSettings.createLock().set(settingObject);
        this._previous = value;
      }
    },

    /**
     * Handle input event
     *
     * The mozSettings api is not designed to call rapidly, but ux want the
     * new volume to be applied immediately while previewing the tone, so
     * here we use setInterval() as a timer to ease the number of calling,
     * or we will see the queued callbacks try to update the slider's value
     * which we are unable to avoid and make bad ux for the users.
     *
     * It uses setTimeout to re-observe the value change after the user finished
     * tapping/dragging on the slider and the preview is ended.
     *
     * If the user tap the slider very quickly, like the click event, then
     * we try to stop the player after a constant duration so that the user
     * is able to hear the tone's preview with the adjusted volume.
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _inputHandler: function sh_inputHandler(event) {
      if (this._isFirstInput) {
        this._isFirstInput = false;
        this._setVolume();
        this._intervalID = setInterval(this._setVolume.bind(this), INTERVAL);
      }

      clearTimeout(this._timeoutID);
      this._timeoutID = setTimeout(function() {
        if (!this._isTouching) {
          SettingsListener.observe(this._channelKey, '',
                                   this._boundSetSliderValue);
          this._stopTone();
        }
      }.bind(this), DELAY);
    },

    /**
     * Handle touchend event
     *
     * It Clear the interval setVolume() and set it directly when the
     * user's finger leaves the panel.
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _touchEndHandler: function sh_touchEndHandler(event) {
      this._isTouching = false;
      clearInterval(this._intervalID);
      this._setVolume();
    }
  };

  return function ctor_sliderHandler() {
    return new SliderHandler();
  };
});
