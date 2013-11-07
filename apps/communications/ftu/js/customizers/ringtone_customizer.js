'use strict';

var RingtoneCustomizer = (function() {
  var resourceParams = {
    type: 'blob',
    mimetype: 'audio/ogg'
  };

  Customizer.call(this, 'ringtone', resourceParams);
  this.set = function(blob) {
    var player = new Audio();
    player.preload = 'metadata';
    player.src = URL.createObjectURL(blob);
    player.oncanplay = function() {
      console.log('Este audio es reproducible');
    };
    player.onerror = function() {
      console.log('Este audio CONTIENE ERRORES');
    };
    var request = navigator.mozSettings.createLock().set({
      'dialer.ringtone': blob,
      'dialer.ringtone.name': 'Default'
    });
  };
});

var ringtoneCustomizer = new RingtoneCustomizer();
ringtoneCustomizer.init();
