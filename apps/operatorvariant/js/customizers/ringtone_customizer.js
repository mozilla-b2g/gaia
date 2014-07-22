/* global Customizer, Resources */

'use strict';

var RingtoneCustomizer = (function() {

  Customizer.call(this, 'ringtone', 'json');
  this.set = function(ringtoneParams) {
    if (!this.simPresentOnFirstBoot) {
      console.log('RingtoneCustomizer. No first RUN with configured SIM.');
      return;
    }

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

    setRingtone();
  };
});

var ringtoneCustomizer = new RingtoneCustomizer();
ringtoneCustomizer.init();
