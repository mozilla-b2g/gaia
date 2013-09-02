var ringer = function callsHandler() {
  var phoneSoundURL = new SettingsURL();
  SettingsListener.observe('dialer.ringtone', '', function(value) {
    ringtonePlayer.pause();
    ringtonePlayer.src = phoneSoundURL.set(value);
  });
  var ringtonePlayer = ringtonePlayer;
  ringtonePlayer = new Audio();
  ringtonePlayer.mozAudioChannelType = 'ringer';
  ringtonePlayer.src = phoneSoundURL.get();
  ringtonePlayer.loop = false;

  document.body.addEventListener('click', function (evt) {
    if (evt.target.id == 'ring')
      ringtonePlayer.play();
  });
}();
