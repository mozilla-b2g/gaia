'use strict';

(function() {

var mozSms = navigator.mozSms;
var mozSettings = navigator.mozSettings;

if (!mozSms || !mozSettings)
  return;

var activeSMSSound;
var activateSMSVibration;
var ringSettingName = 'sms.ring.received';
var vibrationSettingName = 'sms.vibration.received';

mozSettings.onsettingchange = function onchange(evt) {
  switch (evt.settingName) {
    case ringSettingName:
      activeSMSSound = evt.settingValue;
      break;
    case vibrationSettingName:
      activateSMSVibration = evt.settingValue;
      break;
  }
};

mozSettings.getLock().get(ringSettingName)
    .addEventListener('success', (function onsuccess(evt) {
  activeSMSSound = evt.target.result[ringSettingName];
}));

mozSettings.getLock().get(vibrationSettingName)
    .addEventListener('success', (function onsuccess(evt) {
  activateSMSVibration = evt.target.result[vibrationSettingName];
}));

mozSms.addEventListener('received', function received(evt) {
  var message = evt.message;

  if (activeSMSSound) {
    var ringtonePlayer = new Audio();
    ringtonePlayer.src = 'style/ringtones/sms.wav';
    ringtonePlayer.play();
    window.setTimeout(function smsRingtoneEnder() {
      ringtonePlayer.pause();
      ringtonePlayer.src = '';
    }, 500);
  }

  if (activateSMSVibration) {
    if ('mozVibrate' in navigator) {
      navigator.mozVibrate([200, 200, 200, 200]);
    }
  }

  navigator.mozApps.getSelf().onsuccess = function(evt) {
    var app = evt.target.result;

    // Taking the first icon for now
    // TODO: define the size
    var icons = app.manifest.icons;
    var iconURL = null;
    if (icons) {
      iconURL = app.installOrigin + icons[Object.keys(icons)[0]];
    }

    var notiClick = function() {
      // Switch to the clicked message conversation panel
      // XXX: we somehow need to get access to the window object
      // of the original web app to do this.
      // window.parent.location.hash = '#num=' + message.sender;

      // Asking to launch itself
      app.launch();
    };

    NotificationHelper.send(message.sender, message.body, iconURL, notiClick);
  };
});

}());
