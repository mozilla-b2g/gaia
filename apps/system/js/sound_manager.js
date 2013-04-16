/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {

  var DEBUG = false;

  if (DEBUG)
    var _debug = function(s) {
      console.log('-*- SoundManagerEx -*-: ' + s + '\n');
    };
  else
    var _debug = function(s) {};

  var soundManagerEx = {
    _volComfortLvl: 8, //xx db, the comfortable level of sound via headset
    _volWarningLvl: 10,//85 db, the warning level for sound via headset.
    _totalTicking: 0,
    _intervalId: null,
    _headphonesActive: false,

    TIME_TWENTY_HOURS: 72000000,
    TIME_FIVE_MINUTES: 300000,//For test.
    TIME_ONE_MINUTE: 60000,

    init: function sm_init() {
      var self = this;
      //When the headset  is plugged out ,we will recieve the
      //mozChromeEvent twice.here we save the prev state
      // to avoid change volume twice.
      var prevStates = 'off';
      var headsetActive = false;

      //Now, there is an issue that when we reboot the device with the
      // headset pluged in, we can't get the right status of the earphone.
      //So here we handle the mozChromeEvent and get the the
      // status of earphone instead of navigator.mozAudioChannelManager.
      window.addEventListener('mozChromeEvent', function(e) {
        var type = e.detail.type;
        if (type === 'headphones-status-changed') {
          if (prevStates != e.detail.state) {
            prevStates = e.detail.state;
            //We handle the handset plugged out.
            headsetActive = (e.detail.state != 'off');
            self._headphonesActive = headsetActive;
            self.handleHeadsetStatusChange(headsetActive);
          }
        }
        else if (type == 'audio-channel-changed') {
          self.handleAudioChannelChanged(headsetActive);
        }
      });
    },

    handleHeadsetStatusChange: function sm_handleHeadsetChange(headsetActive) {
      var settings = window.navigator.mozSettings;
      //self._headphonesActive = headsetActive;
      if (headsetActive) {
        var volume = this._volComfortLvl;
        if (currentVolume['content.headset'] < this._volWarningLvl) {
          volume = currentVolume['content.headset'];
        }
        settings.createLock().set({'audio.volume.content': volume});
        settings.createLock().set({'audio.volume.content.headset': volume});
      }else {
        this.stopCumulativeTicking();
        settings.createLock().set(
          {'audio.volume.content': currentVolume['content.loudspeaker']});
      }

      var currentChannel = getChannel();
      if (currentChannel === 'content') {
        changeVolume(0);
      }
    },

    handleAudioChannelChanged: function handleChanged(headsetActive) {
      var currentChannel = getChannel();
      if (currentChannel != 'content') {
        this.stopCumulativeTicking();
      }else {
        if (headsetActive) {
          if (currentVolume['content.headset'] > this._volWarningLvl) {
            this.startCumulativeTicking();
          }
        }
      }
    },

    stopCumulativeTicking: function sm_stopContTicking() {
      if (this._intervalId != 0) {
        window.clearInterval(this._intervalId);
        this._intervalId = 0;
        this._totalTicking = 0;
      }
    },

    //Maybe we can use alarm instead of this.
    startCumulativeTicking: function sm_startCumulativeTicking() {
      var self = this;
      this._intervalId = window.setInterval(function() {
        self._totalTicking += self.TIME_ONE_MINUTE;
        _debug('startCumulativeTicking: ' + self._totalTicking);
        if (self._totalTicking >= self.TIME_TWENTY_HOURS) {
          self.showLongtimeWarning();
        }
      },self.TIME_ONE_MINUTE);
    },

    showWarningConfirm: function sm_showWarningConfirm(delta, volume) {
      if (!this._headphonesActive) {
        changeVolume(delta);
        return;
      }else {
        var cancel = {};
        var confirm = {};
        var self = this;
        cancel.title = navigator.mozL10n.get('cancel');
        cancel.callback = function() {
          CustomDialog.hide();
        };
        confirm.title = navigator.mozL10n.get('ok');
        confirm.callback = function() {
          var settings = window.navigator.mozSettings;
          var value = volume + delta;
          CustomDialog.hide();
          self.startCumulativeTicking();

          settings.createLock().set({'audio.volume.content.headset': value});
          changeVolume(1);
        };
        var msg = navigator.mozL10n.get('incVolumeConfirm');
        CustomDialog.show(
          navigator.mozL10n.get('attention'), msg, cancel, confirm);
      }
    },
    
    showLongtimeWarning: function sm_showConfirm() {

      var value = this._volComfortLvl - currentVolume['content'];
      
      if (!this._headphonesActive) {
        changeVolume(value);
        return;
      }else {
        var cancel = {};
        var confirm = {};
        var self = this;
        var settings = window.navigator.mozSettings;
        cancel.title = navigator.mozL10n.get('cancel');
        cancel.callback = function() {
          CustomDialog.hide();
          self._totalTicking = 0;
        };
        confirm.title = navigator.mozL10n.get('ok');
        confirm.callback = function() {
          //Show the action.
          CustomDialog.hide();
          self._totalTicking = 0;
          changeVolume(value, 'content');
          settings.createLock().set(
            {'audio.volume.content.headset': self._volComfortLvl});
        };
        var msg = _('decVolumeConfirm');
        CustomDialog.show(
          navigator.mozL10n.get('attention'), msg, cancel, confirm);
        window.setTimeout(function() {
          CustomDialog.hide();
          changeVolume(value, 'content');
          settings.createLock().set(
            {'audio.volume.content.headset': self._volComfortLvl});
        },self.TIME_ONE_MINUTE);
      }
    },
    changeVolume: function sm_changeVolume(delta, volume) {
      var channel = getChannel();
      var settings = window.navigator.mozSettings;
      if (this._headphonesActive === true &&
        !LockScreen.locked && //Not to annoy in lockscreen case
        channel === 'content') {
        if (volume === this._volWarningLvl) {
          if (delta > 0) {
            this.showWarningConfirm(delta, volume);
            return;
          }
          CustomDialog.hide();
          this.stopCumulativeTicking();
        }
      }
      if (channel === 'content') {
        var value = volume + delta;
        if (this._headphonesActive) {
          settings.createLock().set({'audio.volume.content.headset': value});
        }else {
          settings.createLock().set(
            {'audio.volume.content.loudspeaker': value});
        }
      }
      changeVolume(delta);
    }
  };



  function handleVolumeChange(delta, channel) {
    var volume = currentVolume['content'];
    soundManagerEx.changeVolume(delta, volume);
  }

 if (navigator.mozL10n.readyState == 'complete' ||
    navigator.mozL10n.readyState == 'interactive') {
    soundManagerEx.init();
  } else {
    window.addEventListener('localized',
      soundManagerEx.init.bind(soundManagerEx));
  }


  window.addEventListener('volumeup', function() {
    if (ScreenManager.screenEnabled || currentChannel !== 'none') {
      if (onBTEarphoneConnected() && onCall()) {
        changeVolume(1, 'bt_sco');
      } else {
        //changeVolume(1);
        handleVolumeChange(1);
      }
    }
  });
  window.addEventListener('volumedown', function() {
    if (ScreenManager.screenEnabled || currentChannel !== 'none') {
      if (onBTEarphoneConnected() && onCall()) {
        changeVolume(-1, 'bt_sco');
      } else {
        //changeVolume(-1);
        handleVolumeChange(-1);
      }
    }
  });

  // Store the current active channel;
  // change with 'audio-channel-changed' mozChromeEvent
  var currentChannel = 'none';

  var vibrationEnabled = true;

  // This event is generated in shell.js in response to bluetooth headset.
  // Bluetooth headset always assign audio volume to a specific value when
  // pressing its volume-up/volume-down buttons.
  window.addEventListener('mozChromeEvent', function(e) {
    var type = e.detail.type;
    if (type == 'bluetooth-volumeset') {
      changeVolume(e.detail.value - currentVolume['bt_sco'], 'bt_sco');
    } else if (type == 'audio-channel-changed') {
      currentChannel = e.detail.channel;
    }
  });

  function onCall() {
    if (currentChannel == 'telephony')
      return true;

    // XXX: This work should be removed
    // once we could get telephony channel change event
    // https://bugzilla.mozilla.org/show_bug.cgi?id=819858
    var telephony = window.navigator.mozTelephony;
    if (!telephony)
      return false;

    return telephony.calls.some(function callIterator(call) {
        return (call.state == 'connected');
    });
  }

  function onBTEarphoneConnected() {
    var bluetooth = navigator.mozBluetooth;
    if (!bluetooth)
      return false;

    // 0x111E is for querying earphone type.
    return navigator.mozBluetooth.isConnected(0x111E);
  };

  // Platform doesn't provide the maximum value of each channel
  // therefore, hard code here.
  var MAX_VOLUME = {
    'alarm': 15,
    'notification': 15,
    'telephony': 5,
    'content': 15,
    'bt_sco': 15,
    'content.headset': 15,
    'content.loudspeaker': 15
  };

  // Please refer https://wiki.mozilla.org/WebAPI/AudioChannels > Settings
  var currentVolume = {
    'alarm': 15,
    'notification': 15,
    'telephony': 5,
    'content': 15,
    'bt_sco': 15,
    'content.headset': 15,
    'content.loudspeaker': 15
  };
  var pendingRequestCount = 0;

  // We have three virtual states here:
  // OFF -> VIBRATION -> MUTE
  var muteState = 'OFF';

  for (var channel in currentVolume) {
    (function(channel) {
      var setting = 'audio.volume.' + channel;
      SettingsListener.observe(setting, 5, function onSettingsChange(volume) {
        if (pendingRequestCount)
          return;

        var max = MAX_VOLUME[channel];
        currentVolume[channel] =
            parseInt(Math.max(0, Math.min(max, volume)), 10);
      });
    })(channel);
  }

  SettingsListener.observe('vibration.enabled', true, function(vibration) {
    if (pendingRequestCount)
      return;

    vibrationEnabled = vibration;
  });

  var activeTimeout = 0;

  // When hardware volume key is pressed, we need to decide which channel we
  // should toggle.
  // This method returns the string for setting key 'audio.volume.*' represents
  // that.
  // Note: this string does not always equal to currentChannel since some
  // different channels are grouped together to listen to the same setting.
  function getChannel() {
    if (onCall())
      return 'telephony';

    switch (currentChannel) {
      case 'normal':
      case 'content':
        return 'content';
      case 'telephony':
        return 'telephony';
      case 'alarm':
        return 'alarm';
      case 'notification':
      case 'ringer':
      default:
        return 'notification';
    }
  }

  function getVolumeState(currentVolume, delta, channel) {
    if (channel == 'notification') {
      if (currentVolume + delta <= 0) {
        if (currentVolume == 0 && vibrationEnabled) {
          vibrationEnabled = false;
        } else if (currentVolume > 0 && !vibrationEnabled) {
          vibrationEnabled = true;
        }
        return 'MUTE';
      } else {
        return 'OFF';
      }
    } else {
      if (currentVolume + delta <= 0) {
        return 'MUTE';
      } else {
        return 'OFF';
      }
    }
  }

  function changeVolume(delta, channel) {
    channel = channel ? channel : getChannel();

    muteState = getVolumeState(currentVolume[channel], delta, channel);

    var volume = currentVolume[channel] + delta;

    currentVolume[channel] = volume =
      Math.max(0, Math.min(MAX_VOLUME[channel], volume));

    var overlay = document.getElementById('system-overlay');
    var notification = document.getElementById('volume');
    var overlayClasses = overlay.classList;
    var classes = notification.classList;

    switch (muteState) {
      case 'OFF':
        classes.remove('mute');
        if (vibrationEnabled) {
          classes.add('vibration');
        } else {
          classes.remove('vibration');
        }
        break;
      case 'MUTE':
        classes.add('mute');
        if (channel == 'notification') {
          if (vibrationEnabled) {
            classes.add('vibration');
            SettingsListener.getSettingsLock().set({
                'vibration.enabled': true
            });
          } else {
            classes.remove('vibration');
            SettingsListener.getSettingsLock().set({
                'vibration.enabled': false
            });
          }
        }
        break;
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
    window.clearTimeout(activeTimeout);
    activeTimeout = window.setTimeout(function hideSound() {
      overlayClasses.remove('volume');
      classes.remove('visible');
    }, 1500);

    if (!window.navigator.mozSettings)
      return;

    pendingRequestCount++;
    var req;

    notification.dataset.channel = channel;

    var settingObject = {};
    settingObject['audio.volume.' + channel] = volume;

    req = SettingsListener.getSettingsLock().set(settingObject);

    req.onsuccess = function onSuccess() {
      pendingRequestCount--;
    };

    req.onerror = function onError() {
      pendingRequestCount--;
    };
  }
})();

