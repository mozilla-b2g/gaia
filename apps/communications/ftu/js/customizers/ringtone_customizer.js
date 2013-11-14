'use strict';

var RingtoneCustomizer = (function() {
  Customizer.call(this, 'ringtone', 'blob');
  this.set = function(blob) {
    var request = navigator.mozSettings.createLock().set({
      'dialer.ringtone': blob,
      'dialer.ringtone.name': 'Default'
    });
  };
});

var ringtoneCustomizer = new RingtoneCustomizer();
ringtoneCustomizer.init();
