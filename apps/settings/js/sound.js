/* global getSupportedNetworkInfo, SettingsListener, ForwardLock, URL,
          MozActivity */
/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function() {
  'use strict';

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
