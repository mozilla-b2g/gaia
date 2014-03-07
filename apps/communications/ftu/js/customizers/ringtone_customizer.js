'use strict';

var RingtoneCustomizer = (function() {
  Customizer.call(this, 'ringtone', 'json');
  this.set = function(ringtoneParams) {
    Resources.load(ringtoneParams.uri, 'blob', function onsuccess(blob) {
      var settings = navigator.mozSettings;
      if (!settings) {
        console.error('Settings is not available');
        return;
      }
      var request = settings.createLock().set({
        'dialer.ringtone': blob,
        'dialer.ringtone.name': ringtoneParams.name
      });
    }, function onerror(status) {
      console.error('RingtoneCustomizer.js: Error retrieving the resource.');
    });
  };
});

var ringtoneCustomizer = new RingtoneCustomizer();
ringtoneCustomizer.init();
