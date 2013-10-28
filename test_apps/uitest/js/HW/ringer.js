'use strict';

var ringtonePlayer = new Audio();

// Get ringer file path from settings
var phoneSoundURL = new SettingsURL();
SettingsListener.observe('dialer.ringtone', '', function(value) {
  ringtonePlayer.pause();
  ringtonePlayer.src = phoneSoundURL.set(value);
});

document.body.addEventListener('click', function(evt) {
  if (evt.target.id == 'ring') {
    ringtonePlayer.play();
  }
});

