/* global AsyncSemaphore, CustomDialog, FtuLauncher, ScreenManager,
          SettingsListener, Service, HeadphoneIcon, PlayingIcon, MuteIcon,
          LazyLoader */

(function(exports) {
  'use strict';
  /**
   * SoundManager handles hardware volume key events, bluetooth volume changes,
   * and volume/channel change events.
   * @class SoundManager
   * @requires AsyncSemaphore
   * @requires FtuLauncher
   * @requires ScreenManager
   */
  function SoundManager() {
  }

  /**
   * settings key for vibration
   * @memberOf SoundManager
   */
  SoundManager.VIBRATION_SETTINGS_KEY = 'vibration.enabled';
  /**
   * user preference key for vibration which is used at async storage.
   * @memberOf SoundManager
   */
  SoundManager.VIBRATION_USER_PREF_KEY = 'preference.vibration.enabled';
  /**
   * reset time span for volume warning dialog.
   * @memberOf SoundManager
   */
  SoundManager.CE_RESET_TIME = 72000000;
  /**
   * constant for CE counter interval.
   * @memberOf SoundManager
   */
  SoundManager.TIME_ONE_MINUTE = 60000;
  /**
   * elapsed time from last volume warning dialog which is used at async
   * storage.
   * @memberOf SoundManager
   */
  SoundManager.CACHE_CETIMES = 'CE_ACCTIME';
  // volume cache
  // Platform doesn't provide the maximum value of each channel
  // therefore, hard code here.
  SoundManager.MAX_VOLUME = {
    'alarm': 15,
    'notification': 15,
    'telephony': 5,
    'content': 15,
    'bt_sco': 15
  };

  SoundManager.prototype.name = 'SoundManager';

  SoundManager.prototype.publish = function(evtName, detail) {
    window.dispatchEvent(new CustomEvent(evtName), {
      detail: detail || this
    });
  };

  SoundManager.prototype.setHeadsetState = function(enabled) {
    if (this.isHeadsetConnected === enabled) {
      return;
    }
    this.isHeadsetConnected = enabled;
    if (this.headphoneIcon) {
      this.headphoneIcon.update();
    }
    this.publish('headphones-status-changed', this.isHeadsetConnected);
  };

  SoundManager.prototype.setAudioChannel = function(channel) {
    if (this.currentChannel === channel) {
      return;
    }
    this.currentChannel = channel;
    if (this.playingIcon) {
      this.playingIcon.update();
    }
    this.publish('audio-channel-changed', this.currentChannel);
  };

  /**
   * Store the current active channel;
   * change with 'audio-channel-changed' mozChromeEvent
   * All candidates and definitions can be found at AudioChannels link.
   *
   * @see {link https://wiki.mozilla.org/WebAPI/AudioChannels|AudioChannels}
   * @memberOf SoundManager.prototype
   * @type {String}
   */
  SoundManager.prototype.currentChannel = 'none';

  /**
   * Tell if vibration is enabled currently.
   *
   * @memberOf SoundManager.prototype
   * @type {Boolean}
   */
  SoundManager.prototype.vibrationEnabled = true;

  /**
   * Default volume control channel
   * Possible values:
   *   normal
   *   content
   *   notification
   *   alarm
   *   telephony
   *   ringer
   *   publicnotification
   *   unknown
   * @memberOf SoundManager.prototype
   * @type {String}
   */
  SoundManager.prototype.defaultVolumeControlChannel = 'unknown';

  /**
   * is headset connected.
   * @memberOf SoundManager.prototype
   * @type {Boolean}
   */
  SoundManager.prototype.isHeadsetConnected = false;

  /**
   * We have three virtual states here:
   * OFF -> VIBRATION -> MUTE
   * @memberOf SoundManager.prototype
   * @type {String}
   */
  SoundManager.prototype.muteState = 'OFF';

  /**
   * User preference to tell if vibration is enabled. The value is read from
   * 'preference.vibration.enabled' key.
   * @memberOf SoundManager.prototype
   * @type {Boolean}
   */
  SoundManager.prototype.vibrationUserPrefEnabled = true;

  /**
   * Cache the volume when entering silent mode.
   * Currently only two channel would be used for mute.
   * @memberOf SoundManager.prototype
   * @type {Object}
   */
  SoundManager.prototype.cachedVolume = {
    'content': -1,
    'notification': -1
  };

  /**
   * The keys of cachedVolume.
   * @memberOf SoundManager.prototype
   * @type {Array}
   * @see cachedVolume
   */
  SoundManager.prototype.cachedChannels = ['content', 'notification'];

  /**
   * The interval ID of CE accumulator.
   * @memberOf SoundManager.prototype
   * @type {Number}
   */
  SoundManager.prototype.CEAccumulatorID = null;
  /**
   * The minimum warning volume level.
   * @memberOf SoundManager.prototype
   * @type {Number}
   * @default 11
   */
  SoundManager.prototype.CEWarningVol = 11;
  /**
   * The accumulated time where the volume is above {@link CEWarningVol} and the
   * channel is "content".
   * @memberOf SoundManager.prototype
   * @type {Number}
   * @see CEWarningVol
   */
  SoundManager.prototype.CEAccumulatorTime = 0;
  /**
   * The start time of accumulator running.
   * @memberOf SoundManager.prototype
   * @type {Number}
   */
  SoundManager.prototype.CETimestamp = 0;

  /**
   * The current volume for all channels: alarm, notification, telephony,
   * content, and bt_sco.
   * @memberOf SoundManager.prototype
   * @type {Object}
   * @see {@link https://wiki.mozilla.org/WebAPI/AudioChannels#Volume_control}
   */
  SoundManager.prototype.currentVolume = {
    'alarm': 15,
    'notification': 15,
    'telephony': 5,
    'content': 15,
    'bt_sco': 15
  };

  /**
   * A semaphore used inside of SoundManager.
   * @memberOf SoundManager.prototype
   * @type {AsyncSemaphore}
   */
  SoundManager.prototype.pendingRequest = new AsyncSemaphore();

  /**
   * To tell if the homescreen is visible.
   *
   * @memberOf SoundManager.prototype
   * @type {Boolean}
   */
  SoundManager.prototype.homescreenVisible = true;

  /**
   * A counter for checking if the vibration settings is made by SoundManager.
   *
   * @memberOf SoundManager.prototype
   * @type {Number}
   */
  SoundManager.prototype.setVibrationEnabledCount = 0;
  /**
   * A flag to tell if the volume is fetched from settings.
   *
   * @memberOf SoundManager.prototype
   * @type {Boolean}
   */
  SoundManager.prototype.volumeFetched = false;
  /**
   * A timer ID for auto hiding volume UI.
   *
   * @memberOf SoundManager.prototype
   * @type {Boolean}
   */
  SoundManager.prototype.activeTimerID = 0;

  /**
   * It adds listeners to window events, observes the change of mozSettings, and
   * loads settings from mozSettings.
   *
   * @memberOf SoundManager.prototype
   * @returns {SoundManager}
   */
  SoundManager.prototype.start = function sm_start() {
    this.element = document.getElementById('volume');
    this.screen = document.getElementById('screen');
    this.overlay = document.getElementById('system-overlay');
    window.addEventListener('volumeup', this);
    window.addEventListener('volumedown', this);
    window.addEventListener('mute', this);
    window.addEventListener('unmute', this);
    window.addEventListener('mozChromeEvent', this);
    window.addEventListener('unload', this);
    window.addEventListener('appopen', this);
    window.addEventListener('ftudone', this);
    window.addEventListener('holdhome', this);
    window.addEventListener('homescreenopening', this);
    window.addEventListener('homescreenopened', this);

    LazyLoader.load(['js/headphone_icon.js',
                     'js/mute_icon.js',
                     'js/playing_icon.js']).then(function() {
      this.playingIcon = new PlayingIcon(this);
      this.playingIcon.start();
      this.headphoneIcon = new HeadphoneIcon(this);
      this.headphoneIcon.start();
      this.muteIcon = new MuteIcon(this);
      this.muteIcon.start();
    }.bind(this)).catch(function(err) {
      console.error(err);
    });

    // mozChromeEvent fired from Gecko is earlier been loaded,
    // so we use mozAudioChannelManager to
    // check the headphone plugged or not when booting up
    var acm = navigator.mozAudioChannelManager;
    if (acm) {
      this.setHeadsetState(acm.headphones);
    }

    this.initVibrationUserPref();
    this.bindVolumeSettingsHandlers();

    var self = this;
    SettingsListener.observe('audio.volume.cemaxvol', 11, function(volume) {
      self.CEWarningVol = volume;
    });

    window.asyncStorage.getItem(SoundManager.CACHE_CETIMES,
                                function getCETime(value) {
      if (!value) {
        return;
      } else {
        self.CEAccumulatorTime = value;
      }
    });

    Service.registerState('isHeadsetConnected', this);
    Service.registerState('currentChannel', this);
  };

  /**
   * It removes listeners from window events
   *
   * @memberOf SoundManager.prototype
   */
  SoundManager.prototype.stop = function sm_stop() {
    window.removeEventListener('volumeup', this);
    window.removeEventListener('volumedown', this);
    window.removeEventListener('mute', this);
    window.removeEventListener('unmute', this);
    window.removeEventListener('mozChromeEvent', this);
    window.removeEventListener('unload', this);
    window.removeEventListener('appopen', this);
    window.removeEventListener('ftudone', this);
    window.removeEventListener('holdhome', this);
    window.removeEventListener('homescreenopening', this);
    window.removeEventListener('homescreenopened', this);

    Service.unregisterState('isHeadsetConnected', this);
    Service.unregisterState('currentChannel', this);
  };

  /**
   * It handles the events from window object, including hardware key events,
   * mozChromeEvent, and custom event made by System app.
   *
   * @memberOf SoundManager.prototype
   * @param {DOMEvent} e
   */
  SoundManager.prototype.handleEvent = function sm_handleEvent(e) {
    switch (e.type) {
      case 'volumeup':
        this.handleVolumeKey(1);
        break;
      case 'volumedown':
        this.handleVolumeKey(-1);
        break;
      case 'mute':
        this.setMute(true);
        break;
      case 'unmute':
        this.setMute(false);
        break;
      case 'mozChromeEvent':
        switch (e.detail.type) {
          case 'bluetooth-volumeset':
            this.changeVolume(e.detail.value - this.currentVolume.bt_sco,
                              'bt_sco');
            break;
          case 'audio-channel-changed':
            this.setAudioChannel(e.detail.channel);
            this.ceAccumulator();
            break;
          case 'headphones-status-changed':
            this.setHeadsetState(e.detail.state !== 'off');
            this.ceAccumulator();
            break;
          case 'default-volume-channel-changed':
            this.defaultVolumeControlChannel = e.detail.channel;
            // Do not accumulate CE time here because this event
            // doesn't mean the content is playing now.
            break;
        }
        break;
      case 'unload':
        this.stopAccumulator();
        break;
      case 'appopen':
        this.homescreenVisible = false;
        break;
      case 'ftudone':
        this.homescreenVisible = true;
        break;
      case 'holdhome':
        CustomDialog.hide();
        break;
      case 'homescreenopening':
      case 'homescreenopened':
        this.homescreenVisible = true;
        CustomDialog.hide();
        break;
    }
  };

  /**
   * This function handles the volume key up/down behavior. When it is under a
   * call and user sues a bluetooth, we need to change the volume of BT SCO.
   * When the headset is connected, we need to activate CE counter. Otherwise,
   * we calls normal changeVolume API.
   *
   * @memberOf SoundManager.prototype
   * @param {Number} offset the offset which will be added to volume value.
   */
  SoundManager.prototype.handleVolumeKey = function sm_handleVolumeKey(offset) {
    if (!ScreenManager.screenEnabled && this.currentChannel === 'none') {
      return;
    }

    if (Service.query('Bluetooth.isSCOProfileConnected') &&
        this.isOnCall()) {
      this.changeVolume(offset, 'bt_sco');
    } else if (this.isHeadsetConnected && offset > 0) {
      this.headsetVolumeup();
    } else {
      this.changeVolume(offset);
    }
  };

  /**
   * The mute/unmute event is dispatched from sleep menu.
   * But if we have a mute/unmute hardware button or virtual button,
   * we could make the button handler to fire this event, too.
   *
   * @memberOf SoundManager.prototype
   * @param {Boolean} mute the state of mute.
   */
  SoundManager.prototype.setMute = function sm_setMute(mute) {
    /**
     */
    if (mute) {
      // Turn off vibration for really silence.
      this.setVibrationEnabled(false);
      this.enterSilentMode('notification');
    } else {
      // Turn on vibration.
      this.setVibrationEnabled(true);
      this.leaveSilentMode('notification');
      this.leaveSilentMode('content');
    }
  };

  /*
   * When hardware volume key is pressed, we need to decide which channel we
   * should toggle.
   * This method returns the string for setting key 'audio.volume.*' represents
   * that.
   * Note: this string does not always equal to currentChannel since some
   * different channels are grouped together to listen to the same setting.
   * @memberOf SoundManager.prototype
   * @returns {String} the volume channel
   */
  SoundManager.prototype.getChannel = function sm_getChannel() {
    if (this.isOnCall()) {
      return 'telephony';
    }

    switch (this.currentChannel) {
      case 'normal':
      case 'content':
        return 'content';
      case 'telephony':
        return 'telephony';
      case 'alarm':
        return 'alarm';
      case 'notification':
      case 'ringer':
          return 'notification';
      default:
        if (this.defaultVolumeControlChannel !== 'unknown') {
          return this.defaultVolumeControlChannel;
        } else {
          return this.homescreenVisible || (Service.locked) ||
            FtuLauncher.isFtuRunning() ? 'notification' : 'content';
        }
    }
  };

  /**
   * It reads vibration user preference from asyncStorage and listen the change
   * from mozSettings.
   *
   * @memberOf SoundManager.prototype
   */
  SoundManager.prototype.initVibrationUserPref = function sm_initVUserPref() {
    var self = this;
    // check asyncStorage
    window.asyncStorage.getItem(SoundManager.VIBRATION_USER_PREF_KEY,
                                function onok(value) {
      if (value === null) {
        // not found, read from settings.
        var r = SettingsListener.getSettingsLock().get(
                                           SoundManager.VIBRATION_SETTINGS_KEY);
        r.onsuccess = function get_onsuccess() {
          // write back to asyncStorage.
          self.writeVibrationUserPref(
                                 r.result[SoundManager.VIBRATION_SETTINGS_KEY]);
        };
        r.onerror = function get_onerror() {
          // initial value to true
          self.writeVibrationUserPref(true);
        };
      } else {
        self.vibrationUserPrefEnabled = value;
      }
    });
    // observe settings
    SettingsListener.observe(SoundManager.VIBRATION_SETTINGS_KEY,
                             true, function(vibration) {
      var setBySelf = false;
      var toggleVibrationEnabled = function toggle_vibration_enabled() {
        // XXX: If the value does not set by sound manager,
        //      we assume it comes from
        //      the settings app and consider it as user preference.
        if (!setBySelf) {
          self.writeVibrationUserPref(vibration);
        }
        self.vibrationEnabled = vibration;
        self.muteIcon && self.muteIcon.update();
      };

      if (self.setVibrationEnabledCount > 0) {
        self.setVibrationEnabledCount--;
        setBySelf = true;
      }
      self.pendingRequest.wait(toggleVibrationEnabled, self);
    });
  };

  /**
   * It saves the user perference of vibration to asyncStorage.
   *
   * @memberOf SoundManager.prototype
   * @param {Boolean} value vibration preference
   */
  SoundManager.prototype.writeVibrationUserPref = function sm_writeUP(value) {
    if (this.vibrationUserPrefEnabled === value) {
      return;
    }
    // if value is null or undefined, we view it as initial value which is true.
    if (value === null || typeof(value) === 'undefined') {
      value = true;
    }

    var self = this;
    window.asyncStorage.setItem(SoundManager.VIBRATION_USER_PREF_KEY, value,
      function set_onsuccess() {
        self.vibrationUserPrefEnabled = value;
    });
  };

  /**
   * It checks the state to start/stop the CE accumulator.
   *
   * @memberOf SoundManager.prototype
   */
  SoundManager.prototype.ceAccumulator = function sm_ceAccumulator() {
    if (this.isHeadsetConnected && this.getChannel() === 'content' &&
      this.currentVolume[this.currentChannel] >= this.CEWarningVol) {
      if (this.CEAccumulatorTime === 0) {
        this.showCEWarningDialog();
      } else {
        this.startAccumulator();
      }
    } else {
      this.stopAccumulator();
    }
  };

  /**
   * It handles the case of pressing volumeup hardware key when headset is
   * connected. This function mainly checks the state to start the CE
   * accumulator and change the volume.
   *
   * @memberOf SoundManager.prototype
   */
  SoundManager.prototype.headsetVolumeup = function sm_headsetVolumeup() {
    if ((this.currentVolume[this.getChannel()] + 1) >= this.CEWarningVol &&
        this.getChannel() === 'content') {
      if (this.CEAccumulatorTime === 0) {
        var self = this;
        var okfn = function() {
          self.changeVolume(1);
          self.startAccumulator();
        };
        this.showCEWarningDialog(okfn);
      } else {
        this.startAccumulator();
        this.changeVolume(1);
      }
    } else {
      this.changeVolume(1);
    }
  };

  /**
   * It shows a warning dialog to tell user that the volume may hurt his/her
   * ear.
   *
   * @memberOf SoundManager.prototype
   * @param {Function} okfun the callback function when user press ok.
   */
  SoundManager.prototype.showCEWarningDialog = function sm_showCEDialog(okfn) {
    // Show dialog.

    var ceTitle = {
      'icon': '/style/sound_manager/images/icon_Volumewarning.png',
      'id': 'ceWarningtitle'
    };
    var ceMsg = 'ceWarningcontent';

    var cancel = {
      'title': 'ok'
    };

    var self = this;
    var screen = this.screen;

    if (okfn instanceof Function) {
      cancel.callback = function onCancel() {
        okfn();
        CustomDialog.hide();
      };
    } else {
      cancel.callback = function onCancel() {
        self.startAccumulator();
        CustomDialog.hide();
      };
    }

    CustomDialog
      .show(ceTitle, ceMsg, cancel, null, screen)
      .setAttribute('data-z-index-level', 'system-dialog');
  };

  /**
   * It starts the CE accumulator.
   *
   * @memberOf SoundManager.prototype
   */
  SoundManager.prototype.startAccumulator = function sm_startAccumulator() {
    if (this.CEAccumulatorID === null) {
      if (this.CEAccumulatorTime === 0) {
        this.CEAccumulatorTime = 1;
        this.CETimestamp = parseInt(new Date().getTime(), 10);
      }
      var self = this;
      this.CEAccumulatorID = window.setInterval(function ceCounter() {
        self.CEAccumulatorTime += SoundManager.TIME_ONE_MINUTE;
        self.CETimestamp = parseInt(new Date().getTime(), 10);
        if (self.CEAccumulatorTime > SoundManager.CE_RESET_TIME) {
          self.CEAccumulatorTime = 0; // reset time
          self.CETimestamp = 0; // reset timestamp
          self.stopAccumulator();
          self.showCEWarningDialog();
        }
      }, SoundManager.TIME_ONE_MINUTE);
    }
  };

  /**
   * It stops the CE accumulator.
   *
   * @memberOf SoundManager.prototype
   */
  SoundManager.prototype.stopAccumulator = function sm_stopAccumulator() {
    if (this.CEAccumulatorID !== null) {
      window.clearInterval(this.CEAccumulatorID);
      this.CEAccumulatorID = null;
      if (this.CETimestamp !== 0) {
         this.CEAccumulatorTime = this.CEAccumulatorTime +
                       (parseInt(new Date().getTime(), 10) - this.CETimestamp);
      }
      window.asyncStorage.setItem(SoundManager.CACHE_CETIMES,
                                  this.CEAccumulatorTime);
    }
  };

  /**
   * It tells if it is currently on a call.
   *
   * @memberOf SoundManager.prototype
   */
  SoundManager.prototype.isOnCall = function sm_isOnCall() {
    if (this.currentChannel == 'telephony') {
      return true;
    }

    // XXX: This work should be removed
    // once we could get telephony channel change event
    // https://bugzilla.mozilla.org/show_bug.cgi?id=819858
    var telephony = window.navigator.mozTelephony;
    if (!telephony) {
      return false;
    }

    return telephony.calls.some(function callIterator(call) {
        return (call.state == 'connected');
    });
  };

  /**
   * Bind setting handlers for each channel's volume change.
   * @memberOf SoundManager.prototype
   * @param {Function} callback Callback being called after each setting handler
   *                            has been invoked once.
   */
  SoundManager.prototype.bindVolumeSettingsHandlers = function sm_bindHdlers() {
    var callsMade = 0;
    var callbacksReceived = 0;
    var self = this;

    function observeSettingsVolumeChange(channel) {
      var setting = 'audio.volume.' + channel;
      SettingsListener.observe(setting, 5, function onChange(volume) {
        var settingsChange = function settings_change() {
          var max = SoundManager.MAX_VOLUME[channel];
          self.currentVolume[channel] =
            parseInt(Math.max(0, Math.min(max, volume)), 10);

          if (channel === 'content' && self.volumeFetched && volume > 0) {
            self.leaveSilentMode('content',
                            /* skip volume restore */ true);
          } else if (channel === 'notification' && volume > 0) {
            self.leaveSilentMode('notification',
                            /* skip volume restore */ true);
            self.muteIcon && self.muteIcon.update();
          } else if (channel === 'notification' && volume === 0) {
            // Enter silent mode when notification volume is 0
            // no matter who sets this value.
            self.enterSilentMode('notification');
            self.muteIcon && self.muteIcon.update();
          }

          if (!self.volumeFetched && ++callbacksReceived === callsMade) {
            self.fetchCachedVolume();
          }
        };

        // Initial loaded setting should always pass through
        // (one per channel)
        self.pendingRequest.wait(settingsChange, self);
      });
    }

    for (var channel in this.currentVolume) {
      callsMade++;
      observeSettingsVolumeChange(channel);
    }
  };

  /**
   * Fetch stored volume if it exists.
   * We should make sure this happens after settingsDB callback
   * after booting.
   * @memberOf SoundManager.prototype
   */
  SoundManager.prototype.fetchCachedVolume = function sm_fetchCachedVolume() {
    if (this.volumeFetched) {
      return;
    }

    this.volumeFetched = true;
    this.pendingRequest.v(this.cachedChannels.length);
    var self = this;
    this.cachedChannels.forEach(
      function iterator(channel) {
        window.asyncStorage.getItem('content.volume',
          function onGettingCachedVolume(value) {
            if (!value) {
              self.pendingRequest.p();
              return;
            }

            self.cachedVolume[channel] = value;
            self.pendingRequest.p();
          });
      }
    );
  };

  /**
   * It handles the vibration case when changing the volume.
   * @memberOf SoundManager.prototype
   * @param {Number} curVolume the base volume
   * @param {Number} delta the offset of the change
   * @param {String} channel the target channel
   * @returns {Number} the volume value. (-1) is for slient mode and (0) is for
   *                   vibration mode
   */
  SoundManager.prototype.calculateVolume = function sm_calVol(
                                                    curVolume, delta, channel) {
    var volume = curVolume;
    if (channel === 'notification') {
      if (volume === 0 && !this.vibrationEnabled) {
        // This is for voluming up from Silent to Vibrate.
        // Let's take -1 as the silent state and
        // 0 as the vibrate state for easier calculation here.
        volume = -1;
      }
      volume += delta;
    } else {
      volume += delta;
    }
    return volume;
  };

  /**
   * It enables the vibration and returns the mute state.
   * @memberOf SoundManager.prototype
   * @param {Number} delta the offset of the change
   * @param {String} channel the target channel
   * @returns {String} the mute state
   */
  SoundManager.prototype.getVibrationAndMuteState = function sm_getState(
                                                    delta, channel) {
    var curVolume = this.currentVolume[channel];
    if (channel === 'notification') {
      var state;
      var volume = curVolume;
      if (volume === 0 && !this.vibrationEnabled) {
        // This is for voluming up from Silent to Vibrate.
        // Let's take -1 as the silent state and
        // 0 as the vibrate state for easier calculation here.
        volume = -1;
      }
      volume += delta;

      if (volume < 0) {
        state = 'MUTE';
        this.vibrationEnabled = false;
      } else if (volume === 0) {
        state = 'MUTE';
        this.vibrationEnabled = true;
      } else {
        // Restore the vibration setting only when leaving silent mode.
        if (curVolume <= 0) {
          this.vibrationEnabled = this.vibrationUserPrefEnabled;
        }
        state = 'OFF';
      }
      // Notify the user vibration is enabled when volume is 0.
      if (delta !== 0 && volume === 0 && this.vibrationEnabled) {
        this.notifyByVibrating();
      }

      return state;
    } else {
      if (curVolume + delta <= 0) {
        return 'MUTE';
      } else {
        return 'OFF';
      }
    }
  };

  /**
   * Notify the user vibration is on.
   *
   * @memberOf SoundManager.prototype
   */
  SoundManager.prototype.notifyByVibrating = function sm_notifyByVibrating() {
    window.navigator.vibrate(200);
  };

  /**
   * Entering silent mode.
   * @memberOf SoundManager.prototype
   * @param  {String} [channel="content"] Specify the channel name
   *                          which is going to enter silent mode.
   */
  SoundManager.prototype.enterSilentMode = function sm_enterSlient(channel) {
    if (!channel) {
      channel = 'content';
    }

    // Don't need to enter silent mode more than once.
    if (this.currentVolume[channel] === 0) {
      return;
    }

    var isCachedAlready =
      (this.cachedVolume[channel] === this.currentVolume[channel]);
    this.cachedVolume[channel] = this.currentVolume[channel];
    this.pendingRequest.v();

    var settingObject = {};
    settingObject['audio.volume.' + channel] = 0;
    var req = SettingsListener.getSettingsLock().set(settingObject);

    var self = this;
    req.onsuccess = function onSuccess() {
      self.pendingRequest.p();
      // Write to async storage only happens when
      // we haven't stored it before.
      // If the user presses the volume rockers repeatedly down and up,
      // between silent-mode/vibration mode/normal mode,
      // we won't repeatedly write the same value to storage.
      if (!isCachedAlready) {
        window.asyncStorage.setItem(channel + '.volume',
                                    self.cachedVolume[channel]);
      }
    };

    req.onerror = function onError() {
      self.pendingRequest.p();
    };
  };

  /**
   * Leaving silent mode.
   * @memberOf SoundManager.prototype
   * @param  {String} channel Specify the channel name
   *                          which is going to leave silent mode.
   * @param  {Boolean} skip_restore Specify to skip the volume restore or not.
   */
  SoundManager.prototype.leaveSilentMode = function sm_leaveSlient(channel,
                                                                 skip_restore) {
    if (!channel) {
      channel = 'content';
    }

    // We're leaving silent mode.
    if (!skip_restore &&
        (this.cachedVolume[channel] > 0 ||
         this.currentVolume[channel] === 0)) {
      var req;
      var settingObject = {};
      var self = this;

      // At least rollback to 1,
      // otherwise we don't really leave silent mode.
      settingObject['audio.volume.' + channel] =
        (this.cachedVolume[channel] > 0) ? this.cachedVolume[channel] : 1;

      this.pendingRequest.v();
      req = SettingsListener.getSettingsLock().set(settingObject);

      req.onsuccess = function onSuccess() {
        self.pendingRequest.p();
      };

      req.onerror = function onError() {
        self.pendingRequest.p();
      };
    }

    this.cachedVolume[channel] = -1;
  };

  /**
   * It updates the volume, turns on/off slient mode, and updates UI.
   * @memberOf SoundManager.prototype
   * @param  {Number} delta Specify the channel name
   * @param  {String} [channel] Specify the channel name. It uses getChannel()
   *                            when this argument is absent.
   */
  SoundManager.prototype.changeVolume = function sm_changeVolume(delta,
                                                                 channel) {
    channel = channel ? channel : this.getChannel();

    var vibrationEnabledOld = this.vibrationEnabled;
    var volume = this.calculateVolume(this.currentVolume[channel], delta,
                                       channel);
    this.muteState =
      this.getVibrationAndMuteState(delta, channel);

    // Silent mode entry point
    if (volume <= 0 && delta < 0 && channel == 'notification') {
      this.enterSilentMode('content');
    } else if (volume == 1 && delta > 0 && channel == 'notification' &&
               this.cachedVolume.content >= 0) {
      // Now since the active channel is notification channel,
      // we're leaving content silent mode and the same time restoring it.
      this.leaveSilentMode('content');

      // In the notification silent mode, volume rocker priority is higher
      // than stored notification volume value so we skip the restore.
      this.leaveSilentMode('notification', /*skip volume restore*/ true);
    }

    this.currentVolume[channel] = volume =
      Math.max(0, Math.min(SoundManager.MAX_VOLUME[channel], volume));

    var overlay = this.overlay;
    var notification = this.element;
    var overlayClasses = overlay.classList;
    var classes = notification.classList;

    switch (this.muteState) {
      case 'OFF':
        classes.remove('mute');
        break;
      case 'MUTE':
        classes.add('mute');
        break;
    }

    if (this.vibrationEnabled) {
      classes.add('vibration');
    } else {
      classes.remove('vibration');
    }

    if (vibrationEnabledOld != this.vibrationEnabled) {
      this.setVibrationEnabled(this.vibrationEnabled);
    }

    var steps =
      Array.prototype.slice.call(notification.querySelectorAll('div'), 0);

    var maxVolumeStep = (channel == 'telephony' || channel == 'bt_sco') ?
      volume + 1 : volume;

    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (i < maxVolumeStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    }

    overlayClasses.add('volume');
    classes.add('visible');
    window.clearTimeout(this.activeTimerID);
    this.activeTimerID = window.setTimeout(function hideSound() {
      overlayClasses.remove('volume');
      classes.remove('visible');
    }, 1500);

    if (!window.navigator.mozSettings) {
      return;
    }

    this.pendingRequest.v();

    notification.dataset.channel = channel;

    var settingObject = {};
    settingObject['audio.volume.' + channel] = volume;

    var req = SettingsListener.getSettingsLock().set(settingObject);
    var self = this;

    req.onsuccess = function onSuccess() {
      self.pendingRequest.p();
    };

    req.onerror = function onError() {
      self.pendingRequest.p();
    };
  };

  /**
   * It enables the vibration.
   * @memberOf SoundManager.prototype
   * @param  {Boolean} enabled the enable state of vibration.
   */
  SoundManager.prototype.setVibrationEnabled = function sm_enableVib(enabled) {
    this.setVibrationEnabledCount++;
    SettingsListener.getSettingsLock().set({
      'vibration.enabled': enabled
    });
    this.muteIcon && this.muteIcon.update();
  };

  exports.SoundManager = SoundManager;
  // XXX: we shoud move the code to bootstrap but it is so buggy to put there.
  // So, we put here temporary.
  exports.soundManager = new SoundManager();
  if (navigator.mozL10n) {
    // unit tests call start() manually
    navigator.mozL10n.once(function() {
      exports.soundManager.start();
    });
  }
})(window);
