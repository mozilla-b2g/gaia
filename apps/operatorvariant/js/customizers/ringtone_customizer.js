/* global Customizer, Resources */

'use strict';

var RingtoneCustomizer = (function() {
  var RINGTONE_NAME = 'dialer.ringtone.name';

  Customizer.call(this, 'ringtone', 'json');
  this.set = function(ringtoneParams) {
    var settings = navigator.mozSettings;
    if (!settings) {
      console.error('RingtoneCustomizer. Settings is not available');
      return;
    }

    function setRingtone() {
      Resources.load(ringtoneParams.uri, 'blob', function onsuccess(blob) {
        settings.createLock().set({
          'dialer.ringtone': blob,
          'dialer.ringtone.name': ringtoneParams.name
        });
      }, function onerror(status) {
        console.error('RingtoneCustomizer.js: Error retrieving the resource.' +
                      ringtoneParams.uri);
      });
    }

    var ringtone = settings.createLock().get(RINGTONE_NAME);
    var ringtoneDefault = ringtoneParams.default;
    // We only change the ringtone if the user does not changed it previously
    // The user has changed the value if the actual value of ringtone is
    // different from default value.
    ringtone.onsuccess = function wc_onsucces() {
      var value = ringtone.result[RINGTONE_NAME];
      if (!value || value === ringtoneDefault) {
        setRingtone();
      }
    };
    ringtone.onerror = function wc_onerror() {
      console.error('Error retrieving ' + RINGTONE_NAME + '. ' +
                    ringtone.error.name);
    };
  };
});

var ringtoneCustomizer = new RingtoneCustomizer();
ringtoneCustomizer.init();
