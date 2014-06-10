/* global getSupportedNetworkInfo, ForwardLock, URL,
          MozActivity */
/**
 * Handle sound panel functionality
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsCache = require('modules/settings_cache');

  var Sound = function() {
    this.elements = null;
    this.toneTypes = null;
  };

  Sound.prototype = {
    init: function s_init(elements) {
      this.elements = elements;

      if (window.navigator.mozMobileConnections) {
        var mobileConnections = window.navigator.mozMobileConnections;
        // Show the touch tone selector if and only if we're on a CDMA network
        var toneSelector = elements.toneSelector;
        Array.prototype.forEach.call(mobileConnections,
          function(mobileConnection) {
            getSupportedNetworkInfo(mobileConnection, function(result) {
              toneSelector.hidden = toneSelector.hidden && !result.cdma;
            });
        });
      }
      // Now initialize the ring tone and alert tone menus.

      // This array has one element for each selectable tone that appears in the
      // "Tones" section of  ../elements/sound.html.
      this.toneTypes = [
        {
          pickType: 'alerttone',
          settingsKey: 'notification.ringtone',
          allowNone: true, // Allow "None" as a choice for alert tones.
          button: this.elements.alertTone
        }
      ];

      // If we're a telephone, then show the section for ringtones, too.
      if (navigator.mozTelephony) {
        this.toneTypes.push({
          pickType: 'ringtone',
          settingsKey: 'dialer.ringtone',
          allowNone: false, // The ringer must always have an actual sound.
          button: this.elements.ringTone
        });
        this.elements.ringer.hidden = false;
      }

      var _ = navigator.mozL10n.get;
      // For each kind of tone, hook up the button that will allow the user
      // to select a sound for that kind of tone.
      this.toneTypes.forEach(function(toneType) {
        var blobkey = toneType.settingsKey;
        var namekey = toneType.settingsKey + '.name';
        var idkey = toneType.settingsKey + '.id';

        // The button looks like a select element and holds the name of the
        // currently-selected tone. Sometimes the name is an l10n ID,
        // and sometimes it is just text.
        SettingsListener.observe(namekey, '', function(tonename) {
          var name = tonename && tonename.l10nID ?
            _(tonename.l10nID) : tonename;
          toneType.button.textContent = name || _('change');
        });

        // When the user clicks the button, we launch an activity that lets
        // the user select new ringtone.
        toneType.button.onclick = function() {

          // First, get the ID of the currently-selected tone.
          SettingsCache.getSettings(function(results) {
            var currentToneID = results[idkey];

            // Before we can start the Pick activity, we need to know if there
            // is locked content on the phone because we don't want the user to
            // see "Purchased Media" as a choice if there isn't any purchased
            // media on the phone. The ForwardLock secret key is not generated
            // until it is needed, so we can use its existance to determine
            // whether to show the Purchased Media app.
            ForwardLock.getKey(function(secret) {
              var activity = new MozActivity({
                name: 'pick',
                data: {
                  type: toneType.pickType,
                  allowNone: toneType.allowNone,
                  currentToneID: currentToneID,
                  // If we have a secret then there is locked content on the
                  // phone so include it as a choice for the user
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
                if (result.blob.type.split('/')[1] ===
                  ForwardLock.mimeSubtype) {
                  ForwardLock.unlockBlob(secret, result.blob,
                    function(unlocked) {
                    result.blob = unlocked;
                    checkRingtone(result);
                  });
                } else {  // Otherwise we can just use the blob directly.
                  checkRingtone(result);
                }

                // Make sure that the blob we got from the activity is actually
                // a playable audio file. It would be very bad to set an corrupt
                // blob as a ringtone because then the phone wouldn't ring!
                function checkRingtone(blob) {
                  var oldRingtoneName = toneType.button.textContent;
                  toneType.button.textContent = _('savingringtone');

                  var player = new Audio();
                  player.preload = 'metadata';
                  player.src = URL.createObjectURL(result.blob);
                  player.oncanplay = function() {
                    release();
                    setRingtone(result);  // this will update the button text
                  };
                  player.onerror = function() {
                    release();
                    toneType.button.textContent = oldRingtoneName;
                    alert(_('unplayable-ringtone'));
                  };

                  function release() {
                    URL.revokeObjectURL(player.src);
                    player.removeAttribute('src');
                    player.load();
                  }
                }

                // Save the sound in the settings db so that other apps can use
                // it.
                // Also save the sound name in the db so we can display it in
                // the future.  And update the button text to the new name now.
                function setRingtone(tone) {
                  // Update the settings database. This will cause the button
                  // text to change as well because of the SettingsListener
                  // above.
                  var values = {};
                  var name = tone.l10nID ? {l10nID : tone.l10nID} : tone.name;

                  values[blobkey] = tone.blob;
                  values[namekey] = name || '';
                  values[idkey] = tone.id;
                  navigator.mozSettings.createLock().set(values);
                }
              };
            });
          });
        };
      });
      
      var manageRingtones = document.getElementById('manage-ringtones-button');
      manageRingtones.onclick = function() {
        var key = 'ringtones.manifestURL';
        SettingsCache.getSettings(function(results) {
          var ringtonesManifestURL = results[key];

          // fallback if no settings present
          if (!ringtonesManifestURL) {
            ringtonesManifestURL = document.location.protocol +
              '//ringtones.gaiamobile.org' +
              (location.port ? (':' + location.port) : '') +
              '/manifest.webapp';
          }

          navigator.mozApps.mgmt.getAll().onsuccess = function(evt) {
            var apps = evt.target.result;
            var ringtonesApp = apps.find(function(app) {
              return app.manifestURL === ringtonesManifestURL;
            });

            if (ringtonesApp) {
              ringtonesApp.launch();
            } else {
              // This should *probably* never happen.
              alert(_('no-ringtone-app'));
            }
          };
        });
      };
    }
  };

  return function ctor_sound() {
    return new Sound();
  };
});
