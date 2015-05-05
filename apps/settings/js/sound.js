/* global getSupportedNetworkInfo, SettingsListener, ForwardLock, URL,
          MozActivity, loadJSON */
/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function() {
  'use strict';

  // Bug 964776 - [Flatfish][Settings] No vibrating alert motor, "Vibrate"
  // option should be removed from Settings
  // https://bugzilla.mozilla.org/show_bug.cgi?id=964776
  //
  // Show/Hide 'Virate' checkbox according to device-features.json
  (function() {
    loadJSON(['/resources/device-features.json'], function(data) {
      var vibrationSetting = document.getElementById('vibration-setting');
      vibrationSetting.hidden = !data.vibration;
    });
  })();

  // Setup the sliders for previewing the tones.
  (function() {
    var channelTypes = ['content', 'notification', 'alarm'];
    var sliders = document.querySelectorAll('#sound .volume input');

    Array.prototype.forEach.call(sliders, function(slider, index) {
      var channelType = channelTypes[index];
      var channelKey = 'audio.volume.' + channelType;
      var previous = null;
      var isTouching = false;
      var isFirstInput = false;
      var interval = 500;
      var intervalID = null;
      var timeoutID = null;
      var delay = 800;
      var player = new Audio();

      // Get the volume value for the slider, also observe the value change.
      SettingsListener.observe(channelKey, '', setSliderValue);

      function setSliderValue(value) {
        slider.value = value;
        // The slider is transparent if the value is not set yet, display it
        // once the value is set.
        if (slider.style.opacity !== 1) {
          slider.style.opacity = 1;
        }

        if (previous === null) {
          previous = value;
        }
      }

      // The sliders listen to input, touchstart and touchend events to fit
      // the ux requirements, and when the user tap or drag the sliders, the
      // sequence of the events is:
      // touchstart -> input -> input(more if dragging) -> touchend -> input
      slider.addEventListener('touchstart', function(event) {
        isTouching = true;
        isFirstInput = true;
        var toneKey;
        // Stop the tone previewing from the last touchstart if the delayed
        // stopTone() is not called yet.
        stopTone();
        // Stop observing when the user is adjusting the slider, this is to
        // get better ux that the slider won't be updated by both the observer
        // and the ui.
        SettingsListener.unobserve(channelKey, setSliderValue);

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

        getToneBlob(channelType, toneKey, function(blob) {
          playTone(channelType, blob);
        });
      });

      slider.addEventListener('input', function(event) {
        // The mozSettings api is not designed to call rapidly, but ux want the
        // new volume to be applied immediately while previewing the tone, so
        // here we use setInterval() as a timer to ease the number of calling,
        // or we will see the queued callbacks try to update the slider's value
        // which we are unable to avoid and make bad ux for the users.
        if (isFirstInput) {
          isFirstInput = false;
          setVolume();
          intervalID = setInterval(setVolume, interval);
        }

        // Clear the timeout to re-observe the value if user change it quickly.
        clearTimeout(timeoutID);
        // If the user tap the slider very quickly, like the click event, then
        // we try to stop the player after a constant duration so that the user
        // is able to hear the tone's preview with the adjusted volume.
        timeoutID = setTimeout(function() {
          if (!isTouching) {
            // Re-observe the value change after the user finished
            // tapping/dragging on the slider and the preview is ended.
            SettingsListener.observe(channelKey, '', setSliderValue);
            stopTone();
          }
        }, delay);
      });

      slider.addEventListener('touchend', function(event) {
        isTouching = false;
        // Clear the interval setVolume() and set it directly when the user's
        // finger leaves the panel.
        clearInterval(intervalID);
        setVolume();
      });

      function setVolume() {
        var value = parseInt(slider.value);
        var settingObject = {};
        settingObject[channelKey] = value;

        // Only set the new value if it does not equal to the previous one.
        if (value !== previous) {
          navigator.mozSettings.createLock().set(settingObject);
          previous = value;
        }
      }

      function getToneBlob(type, toneKey, callback) {
        navigator.mozSettings.createLock().get(toneKey).onsuccess =
          function(e) {
            if (e.target.result[toneKey]) {
              callback(e.target.result[toneKey]);
            } else {
              // Fall back to the predefined tone if the value does not exist
              // in the mozSettings.
              getDefaultTone(type, toneKey, function(blob) {
                // Save the default tone to mozSettings so that next time we
                // don't have to fall back to it from the system files.
                var settingObject = {};
                settingObject[toneKey] = blob;
                navigator.mozSettings.createLock().set(settingObject);

                callback(blob);
              });
            }
          };
      }

      function getDefaultTone(type, toneKey, callback) {
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

      function playTone(type, blob) {
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

      function stopTone() {
        player.pause();
        player.removeAttribute('src');
        player.load();
      }
    });
  })();

  var _ = navigator.mozL10n.get;
  (function() {
    var mobileConnections = window.navigator.mozMobileConnections;
    if (!mobileConnections) {
      return;
    }
    // Show the touch tone selector if and only if we're on a CDMA network
    var toneSelector = document.getElementById('touch-tone-selector');
    Array.prototype.forEach.call(mobileConnections, function(mobileConnection) {
      getSupportedNetworkInfo(mobileConnection, function(result) {
        toneSelector.hidden = toneSelector.hidden && !result.cdma;
      });
    });
  })();
  // Now initialize the ring tone and alert tone menus.

  // This array has one element for each selectable tone that appears in the
  // "Tones" section of  ../elements/sound.html.
  var toneTypes = [
    {
      pickType: 'alerttone',
      settingsKey: 'notification.ringtone',
      allowNone: true, // Allow "None" as a choice for alert tones.
      button: document.getElementById('alert-tone-selection')
    }
  ];

  // If we're a telephone, then show the section for ringtones, too.
  if (navigator.mozTelephony) {
    toneTypes.push({
      pickType: 'ringtone',
      settingsKey: 'dialer.ringtone',
      allowNone: false, // The ringer must always have an actual sound.
      button: document.getElementById('ring-tone-selection')
    });
    document.getElementById('ringer').hidden = false;
  }

  // For each kind of tone, hook up the button that will allow the user
  // to select a sound for that kind of tone.
  toneTypes.forEach(function(toneType) {
    var blobkey = toneType.settingsKey;
    var namekey = toneType.settingsKey + '.name';
    var idkey = toneType.settingsKey + '.id';

    // The button looks like a select element and holds the name of the
    // currently-selected tone. Sometimes the name is an l10n ID, and sometimes
    // it is just text.
    SettingsListener.observe(namekey, '', function(tonename) {
      var l10nID = tonename && tonename.l10nID;

      if (l10nID) {
        toneType.button.setAttribute('data-l10n-id', l10nID);
      } else {
        toneType.button.removeAttribute('data-l10n-id');
        toneType.button.textContent = tonename;
      }
    });

    // When the user clicks the button, we launch an activity that lets
    // the user select new ringtone.
    toneType.button.onclick = function() {

      // First, get the ID of the currently-selected tone.
      var setting = navigator.mozSettings.createLock().get(idkey);
      setting.onsuccess = function() {
        var currentToneID = setting.result[idkey];

        // Before we can start the Pick activity, we need to know if there
        // is locked content on the phone because we don't want the user to
        // see "Purchased Media" as a choice if there isn't any purchased
        // media on the phone. The ForwardLock secret key is not generated
        // until it is needed, so we can use its existance to determine whether
        // to show the Purchased Media app.
        ForwardLock.getKey(function(secret) {
          var activity = new MozActivity({
            name: 'pick',
            data: {
              type: toneType.pickType,
              allowNone: toneType.allowNone,
              currentToneID: currentToneID,
              // If we have a secret then there is locked content on the phone
              // so include it as a choice for the user
              includeLocked: (secret !== null)
            }
          });

          activity.onsuccess = function() {
            var result = activity.result;

            if (!result.blob) {
              if (toneType.allowNone) {
                // If we allow a null blob, then everything is okay
                setRingtone(result);
              }
              else {
                // Otherwise this is an error and we should not change the
                // current setting. (The ringtones app should never return
                // a null blob if allowNone is false, but other apps might.)
                alert(_('unplayable-ringtone'));
              }
              return;
            }

            // If we got a locked ringtone, we have to unlock it first
            if (result.blob.type.split('/')[1] === ForwardLock.mimeSubtype) {
              ForwardLock.unlockBlob(secret, result.blob, function(unlocked) {
                result.blob = unlocked;
                checkRingtone(result);
              });
            } else {  // Otherwise we can just use the blob directly.
              checkRingtone(result);
            }

            // Make sure that the blob we got from the activity is actually
            // a playable audio file. It would be very bad to set an corrupt
            // blob as a ringtone because then the phone wouldn't ring!
            function checkRingtone(result) {
              var oldRingtoneName = null;

              var l10nId = toneType.button.getAttribute('data-l10n-id');

              if (!l10nId) {
                oldRingtoneName = toneType.button.textContent;
              }
              toneType.button.setAttribute('data-l10n-id', 'saving-tone');

              var player = new Audio();
              player.preload = 'metadata';
              player.src = URL.createObjectURL(result.blob);
              player.oncanplay = function() {
                release();
                setRingtone(result);  // this will update the button text
              };
              player.onerror = function() {
                release();
                if (l10nId) {
                  toneType.button.setAttribute('data-l10n-id', l10nId);
                } else {
                  toneType.button.textContent = oldRingtoneName;
                }
                alert(_('unplayable-ringtone'));
              };

              function release() {
                URL.revokeObjectURL(player.src);
                player.removeAttribute('src');
                player.load();
              }
            }

            // Save the sound in the settings db so that other apps can use it.
            // Also save the sound name in the db so we can display it in the
            // future.  And update the button text to the new name now.
            function setRingtone(tone) {
              // Update the settings database. This will cause the button
              // text to change as well because of the SettingsListener above.
              var values = {};
              var name = tone.l10nID ? {l10nID : tone.l10nID} : tone.name;

              values[blobkey] = tone.blob;
              values[namekey] = name || '';
              values[idkey] = tone.id;
              navigator.mozSettings.createLock().set(values);
            }
          };
        });
      };
    };
  });

  var manageTones = document.getElementById('manage-tones-button');
  manageTones.onclick = function() {
    var activity = new MozActivity({
      name: 'configure',
      data: {
        target: 'ringtone'
      }
    });

    // We should hopefully never encounter this error, but if we do, it means
    // we couldn't find the ringtone app. It also has the happy side effect of
    // quieting jshint about not using the `activity` variable.
    activity.onerror = function() {
      console.log(this.error);
      if (this.error.name === 'NO_PROVIDER') {
        alert(_('no-ringtone-app'));
      }
    };
  };

}());
