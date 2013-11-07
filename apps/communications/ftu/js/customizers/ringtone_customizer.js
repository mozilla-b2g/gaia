'use strict';

var RingtoneCustomizer = (function() {
  var resourceParams = {
    type: 'blob',
    mimetype: 'audio/ogg'
  };

  Customizer.call(this, 'ringtone', resourceParams);
  this.set = function(blob) {
    var request = navigator.mozSettings.createLock().set({
      'dialer.ringtone': blob,
      'dialer.ringtone.name': 'Default'
    });
  };
});

var ringtoneCustomizer = new RingtoneCustomizer();
ringtoneCustomizer.init();
