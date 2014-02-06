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
            alert('Well, crap.');
          }
        };
      };
    };
  });
}());
