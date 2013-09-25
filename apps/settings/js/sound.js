/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function() {
  'use strict';

  // Show the touch tone selector if and only if we're on a CDMA network
  getSupportedNetworkInfo(function(result) {
    var toneSelector = document.getElementById('touch-tone-selector');
    toneSelector.hidden = !result.cdma;
  });

  // Now initialize the ring tone and alert tone menus.

  // This array has one element for each selectable tone that appears in the
  // "Tones" section of  ../elements/sound.html.
  var tones = [
    {
      pickType: 'alerttone',
      settingsKey: 'notification.ringtone',
      button: document.getElementById('alert-tone-selection')
    }
  ];

  // If we're a telephone, then show the section for ringtones, too.
  if (navigator.mozTelephony) {
    tones.push({
      pickType: 'ringtone',
      settingsKey: 'dialer.ringtone',
      button: document.getElementById('ring-tone-selection')
    });
    document.getElementById('ringer').hidden = false;
  }

  // For each kind of tone, hook up the button that will allow the user
  // to select a sound for that kind of tone.
  tones.forEach(function(tone) {

    // The button looks like a select element. By default it just reads
    // "change". But we want it to display the name of the current tone.
    // So we look up that name in the settings database.
    var namekey = tone.settingsKey + '.name';
    navigator.mozSettings.createLock().get(namekey).onsuccess = function(e) {
      if (e.target.result[namekey]) {
        tone.button.textContent = e.target.result[namekey];
      } else {
        tone.button.textContent = navigator.mozL10n.get('change');
      }
    };

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
            // If we have a secret then there is locked content on the phone
            // so include it as a choice for the user
            includeLocked: (secret !== null)
          }
        });

        activity.onsuccess = function() {
          var blob = activity.result.blob;  // The returned ringtone sound
          var name = activity.result.name;  // The name of this ringtone

          if (!blob) {
            console.warn('pick activity empty result');
            return;
          }

          // If we got a locked ringtone, we have to unlock it first
          if (blob.type.split('/')[1] === ForwardLock.mimeSubtype) {
            ForwardLock.unlockBlob(secret, blob, function(unlocked) {
              setRingtone(unlocked, name);
            });
          } else {  // Otherwise we just set the ringtone directly.
            setRingtone(blob, name);
          }

          // Save the sound in the settings db so that other apps can use it.
          // Also save the sound name in the db so we can display it in the
          // future.  And update the button text to the new name now.
          function setRingtone(blob, name) {
            // First update the button text
            tone.button.textContent = name || navigator.mozL10n.get('change');

            // Then update the settings database
            var values = {};
            values[tone.settingsKey] = blob;
            values[namekey] = name || '';
            var request = navigator.mozSettings.createLock().set(values);
            /*
             * This is a workaround for bug 914404.
             * XXX When that bug is fixed, clean up like this:
             *  remove the onsuccess handler below and the request variable
             *  switch back to readonly permission for music in the manifest
             */
            request.onsuccess = function() {
              if (activity.result.deleteMe) {
                console.log('Bug 914404: deleting', activity.result.deleteMe);
                var storage = navigator.getDeviceStorage('music');
                storage.delete(activity.result.deleteMe);
              }
            };
          }
        };
      });
    };
  });
}());
