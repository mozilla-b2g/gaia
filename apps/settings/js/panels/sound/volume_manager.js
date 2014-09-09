/**
 * Setup the sliders for previewing the tones.
 * @module VolumeManager
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsCache = require('modules/settings_cache');

  var channelTypes = ['content', 'notification', 'alarm'];

  var VolumeManager = function() {
    this._sliders = null;
  };

  VolumeManager.prototype = {
    /**
     * initialization
     *
     * @access public
     * @memberOf VolumeManager.prototype
     */
    init: function vm_init(element) {
      this._sliders = element;

      Array.prototype.forEach.call(this._sliders, this._sliderHandler);
    },

    /**
     * Handle each slider's functionality
     *
     * @access public
     * @memberOf VolumeManager.prototype
     */
    _sliderHandler: function vm_sliderHandler(slider, index) {
      var channelType = channelTypes[index];
      var channelKey = 'audio.volume.' + channelType;
      // The default volume is 15(MAX).
      var previous = 15;
      var isTouching = false;
      var isFirstInput = false;
      var interval = 500;
      var intervalID = null;
      var delay = 800;
      var player = new Audio();

      // Get the volume value for the slider, also observe the value change.
      SettingsListener.observe(channelKey, '', _setSliderValue);

      // The sliders listen to input, touchstart and touchend events to fit
      // the ux requirements, and when the user tap or drag the sliders, the
      // sequence of the events is:
      // touchstart -> input -> input(more if dragging) -> touchend -> input
      slider.addEventListener('touchstart', _touchStartHandler);
      slider.addEventListener('input', _inputHandler);
      slider.addEventListener('touchend', _touchEndHandler);

      function _touchStartHandler(event) {
        isTouching = true;
        isFirstInput = true;
        var toneKey;
        // Stop the tone previewing from the last touchstart if the delayed
        // stopTone() is not called yet.
        _stopTone(player);
        // Stop observing when the user is adjusting the slider, this is to
        // get better ux that the slider won't be updated by both the observer
        // and the ui.
        SettingsListener.unobserve(channelKey, _setSliderValue);

        switch (channelType) {
          case 'content':
            toneKey = 'media.ringtone';
            break;
          case 'notification':
            toneKey = 'dialer.ringtone';
            break;
          case 'alarm':
            toneKey = 'alarm.ringtone';
            break;
        }

        _getToneBlob(channelType, toneKey, function(blob) {
          _playTone(player, channelType, blob);
        });
      }

      function _inputHandler(event) {
        // The mozSettings api is not designed to call rapidly, but ux want the
        // new volume to be applied immediately while previewing the tone, so
        // here we use setInterval() as a timer to ease the number of calling,
        // or we will see the queued callbacks try to update the slider's value
        // which we are unable to avoid and make bad ux for the users.
        if (isFirstInput) {
          isFirstInput = false;
          _setVolume();
          intervalID = setInterval(_setVolume, interval);
        }
      }

      function _touchEndHandler(event) {
        isTouching = false;
        // Clear the interval setVolume() and set it directly when the user's
        // finger leaves the panel.
        clearInterval(intervalID);
        _setVolume();
        // Re-observe the value change after the user finished tapping/dragging
        // on the slider and the preview is ended.
        SettingsListener.observe(channelKey, '', _setSliderValue);
        // If the user tap the slider very quickly, like the click event, then
        // we try to stop the player after a constant duration so that the user
        // is able to hear the tone's preview with the adjusted volume.
        setTimeout(function() {
          if (!isTouching) {
            _stopTone(player);
          }
        }, delay);
      }

      function _setSliderValue(value) {
        slider.value = value;
        // The slider is transparent if the value is not set yet, display it
        // once the value is set.
        if (slider.style.opacity !== 1) {
          slider.style.opacity = 1;
        }
      }

      function _setVolume() {
        var value = parseInt(slider.value);
        var settingObject = {};
        settingObject[channelKey] = value;

        // Only set the new value if it does not equal to the previous one.
        if (value !== previous) {
          navigator.mozSettings.createLock().set(settingObject);
          previous = value;
        }
      }

      function _getToneBlob(type, toneKey, callback) {
        SettingsCache.getSettings(function(results) {
          if (results[toneKey]) {
            callback(results[toneKey]);
          } else {
            // Fall back to the predefined tone if the value does not exist
            // in the mozSettings.
            _getDefaultTone(type, toneKey, function(blob) {
              // Save the default tone to mozSettings so that next time we
              // don't have to fall back to it from the system files.
              var settingObject = {};
              settingObject[toneKey] = blob;
              navigator.mozSettings.createLock().set(settingObject);

              callback(blob);
            });
          }
        });
      }

      function _getDefaultTone(type, toneKey, callback) {
        var mediaToneURL = '/shared/resources/media/notifications/' +
          'notifier_firefox.opus';
        var ringerToneURL = '/shared/resources/media/ringtones/' +
          'ringer_firefox.opus';
        var alarmToneURL = '/shared/resources/media/alarms/' +
          'ac_awake.opus';

        var toneURLs = {
          'content' : mediaToneURL,
          'notification' : ringerToneURL,
          'alarm' : alarmToneURL
        };

        var xhr = new XMLHttpRequest();
        xhr.open('GET', toneURLs[type]);
        xhr.overrideMimeType('audio/ogg');
        xhr.responseType = 'blob';
        xhr.send();
        xhr.onload = function() {
          callback(xhr.response);
        };
      }

      /**
       * Play the tone
       *
       * @access private
       * @memberOf VolumeManager.prototype
       * @param  {Object} player sound player object
       * @param  {String} type tone type
       * @param  {Blob} blob tone blob
       */
      function _playTone(player, type, blob) {
        // Don't set the audio channel type to content or it will interrupt the
        // background music and won't resume after the user previewed the tone.
        if (type !== 'content') {
          player.mozAudioChannelType = type;
        }
        player.src = URL.createObjectURL(blob);
        player.load();
        player.loop = true;
        player.play();
      }

      /**
       * Stop the tone
       *
       * @access public
       * @memberOf VolumeManager.prototype
       * @param  {[type]} player sound player object
       */
      function _stopTone(player) {
        player.pause();
        player.removeAttribute('src');
        player.load();
      }
    }
  };

  return function ctor_volumeManager() {
    return new VolumeManager();
  };
});
