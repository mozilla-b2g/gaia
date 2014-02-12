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
      button: document.getElementById('alert-tone-selection')
    }
  ];

  // If we're a telephone, then show the section for ringtones, too.
  if (navigator.mozTelephony) {
    tones.push({
      pickType: 'ringtone',
      settingsKey: 'dialer.ringtone',
      button: document.getElementById('ring-tone-selection'),
      flButton: document.getElementById('ring-tone-locked-selection')
    });
    document.getElementById('ringer').hidden = false;
  }

  // We need to know if there is locked content on the device because we don't
  // want the user to see "Set Purchased Media" as a choice if there isn't any
  // purchased media on the device. The ForwardLock secret key is not generated
  // until it is needed, so we can use its existence to determine whether to
  // show the Purchased Media button.
  ForwardLock.getKey(function(secret) {
    // For each kind of tone, hook up the button that will allow the user
    // to select a sound for that kind of tone.
    tones.forEach(function(tone) {
      var namekey = tone.settingsKey + '.name';
      var idkey = tone.settingsKey + '.id';

      // The button looks like a select element. By default it just reads
      // "change". But we want it to display the name of the current tone.
      // So we look up that name in the settings database.
      SettingsListener.observe(namekey, '', function(tonename) {
        tone.button.textContent = tonename || _('change');
      });

      tone.button.onclick = function() {
        var key = 'ringtones.manifestURL';
        var req = navigator.mozSettings.createLock().get(key);
        req.onsuccess = function() {
          var ringtonesManifestURL = req.result[key];

          // fallback if no settings present
          if (!ringtonesManifestURL) {
            ringtonesManifestURL = document.location.protocol +
              '//ringtones.gaiamobile.org' +
              (location.port ? (':' + location.port) : '') +
              '/manifest.webapp';
          }

          var ringtonesApp = null;
          navigator.mozApps.mgmt.getAll().onsuccess = function(evt) {
            var apps = evt.target.result;
            var ringtonesApp = apps.find(function(app) {
              return app.manifestURL === ringtonesManifestURL;
            });

            if (ringtonesApp) {
              ringtonesApp.launch(tone.pickType);
            } else {
              // This should *probably* never happen.
              alert(_('no-ringtone-app'));
            }
          };
        };
      };

      if (secret !== null && tone.flButton) {
        tone.flButton.hidden = false;
        tone.flButton.onclick = function() {
          var activity = new MozActivity({
            name: 'pick-locked',
            data: {
              type: tone.pickType
            }
          });

          activity.onsuccess = function() {
            var blob = activity.result.blob;  // The returned ringtone sound
            var name = activity.result.name;  // The name of this ringtone

            if (!blob) {
              alert(_('unplayable-ringtone'));
              return;
            }

            ForwardLock.unlockBlob(secret, blob, function(unlocked) {
              // Make sure that the blob we got from the activity is actually
              // a playable audio file. It would be very bad to set an corrupt
              // blob as a ringtone because then the phone wouldn't ring!
              var oldRingtoneName = tone.button.textContent;
              tone.button.textContent = _('savingringtone');

              var player = new Audio();
              player.preload = 'metadata';
              player.src = URL.createObjectURL(unlocked);
              player.oncanplay = function() {
                release();
                setRingtone(unlocked, name); // this will update the button text
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
            });

            // Save the sound in the settings db so that other apps can use it.
            // Also save the sound name in the db so we can display it in the
            // future.  And update the button text to the new name now.
            function setRingtone(blob, name) {
              // Update the settings database. This will cause the button
              // text to change as well because of the SettingsListener above.
              var values = {};
              values[tone.settingsKey] = blob;
              values[namekey] = name || '';
              values[idkey] = null;
              navigator.mozSettings.createLock().set(values);
            }
          };
        };
      }
    });
  });
}());
