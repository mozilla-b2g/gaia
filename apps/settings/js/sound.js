/* global getSupportedNetworkInfo, SettingsListener, ForwardLock, URL,
          MozActivity */
/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function() {
  'use strict';

  // Setup the sliders for previewing the tones.
  (function() {
    var channelTypes = ['content', 'notification', 'alarm'];
    var sliders = document.querySelectorAll('#sound .volume input');

    Array.prototype.forEach.call(sliders, function(slider, index) {
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
      SettingsListener.observe(channelKey, '', setSliderValue);

      function setSliderValue(value) {
        slider.value = value;
        // The slider is transparent if the value is not set yet, display it
        // once the value is set.
        if (slider.style.opacity !== 1) {
          slider.style.opacity = 1;
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
      });

      slider.addEventListener('touchend', function(event) {
        isTouching = false;
        // Clear the interval setVolume() and set it directly when the user's
        // finger leaves the panel.
        clearInterval(intervalID);
        setVolume();
        // Re-observe the value change after the user finished tapping/dragging
        // on the slider and the preview is ended.
        SettingsListener.observe(channelKey, '', setSliderValue);
        // If the user tap the slider very quickly, like the click event, then
        // we try to stop the player after a constant duration so that the user
        // is able to hear the tone's preview with the adjusted volume.
        setTimeout(function() {
          if (!isTouching) {
            stopTone();
          }
        }, delay);
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
          'notifier_bop.opus';
        var ringerToneURL = '/shared/resources/media/ringtones/' +
          'ringer_classic_courier.opus';
        var alarmToneURL = '/shared/resources/media/alarms/' +
          'ac_classic_clock_alarm.opus';

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
  var tones = [
    {
      pickType: 'alerttone',
      settingsKey: 'notification.ringtone',
      allowNone: true,  // Allow "None" as a choice for alert tones.
      button: document.getElementById('alert-tone-selection')
    }
  ];

  // If we're a telephone, then show the section for ringtones, too.
  if (navigator.mozTelephony) {
    tones.push({
      pickType: 'ringtone',
      settingsKey: 'dialer.ringtone',
      allowNone: false, // The ringer must always have an actual sound.
      button: document.getElementById('ring-tone-selection')
    });
    document.getElementById('ringer').hidden = false;
  }

  // For each kind of tone, hook up the button that will allow the user
  // to select a sound for that kind of tone.
  tones.forEach(function(tone) {
    var namekey = tone.settingsKey + '.name';

    // The button looks like a select element. By default it just reads
    // "change". But we want it to display the name of the current tone.
    // So we look up that name in the settings database.
    SettingsListener.observe(namekey, '', function(tonename) {
      tone.button.textContent = tonename || _('change');
    });

    // When the user clicks the button, we launch an activity that lets
    // the user select new ringtone.
    tone.button.onclick = function() {

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
            type: tone.pickType,
            allowNone: tone.allowNone,
            // If we have a secret then there is locked content on the phone
            // so include it as a choice for the user
            includeLocked: (secret !== null)
          }
        });

        activity.onsuccess = function() {
          var blob = activity.result.blob;  // The returned ringtone sound
          var name = activity.result.name;  // The name of this ringtone

          if (!blob) {
            if (tone.allowNone) {
              // If we allow a null blob, then everything is okay
              setRingtone(blob, name);
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
          if (blob.type.split('/')[1] === ForwardLock.mimeSubtype) {
            ForwardLock.unlockBlob(secret, blob, function(unlocked) {
              checkRingtone(unlocked, name);
            });
          } else {  // Otherwise we can just use the blob directly.
            checkRingtone(blob, name);
          }

          // Make sure that the blob we got from the activity is actually
          // a playable audio file. It would be very bad to set an corrupt
          // blob as a ringtone because then the phone wouldn't ring!
          function checkRingtone(blob, name) {
            var oldRingtoneName = tone.button.textContent;
            tone.button.textContent = _('savingringtone');

            var player = new Audio();
            player.preload = 'metadata';
            player.src = URL.createObjectURL(blob);
            player.oncanplay = function() {
              release();
              setRingtone(blob, name);  // this will update the button text
            };
            player.onerror = function() {
              release();
              tone.button.textContent = oldRingtoneName;
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
          function setRingtone(blob, name) {
            // Update the settings database. This will cause the button
            // text to change as well because of the SettingsListener above.
            var values = {};
            values[tone.settingsKey] = blob;
            values[namekey] = name || '';
            navigator.mozSettings.createLock().set(values);
          }
        };
      });
    };
  });
}());
