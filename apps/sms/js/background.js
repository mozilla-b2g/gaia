'use strict';

(function () {

var mozSms = navigator.mozSms;
var mozNotification = navigator.mozNotification;
var mozSettings = navigator.mozSettings;

if (!mozSms || !mozNotification || !mozSettings)
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
    setTimeout(function smsRingtoneEnder() {
      ringtonePlayer.pause();
      ringtonePlayer.src = '';
    }, 500);
  }

  if (activateSMSVibration) {
    if ('mozVibrate' in navigator) {
      navigator.mozVibrate([200, 200, 200, 200]);
    }
  }

  var notification = mozNotification.createNotification(
    message.sender, message.body
  );
  notification.onclick = function notiClick() {

    // Switch to the clicked message conversation panel
    // XXX: we somehow need to get access to the window object
    // of the original web app to do this.
    // window.parent.location.hash = '#num=' + message.sender;

    // Asking to launch itself
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      app.launch();
    };
  };

  notification.show();
});

}());
