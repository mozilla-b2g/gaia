
'use stricts';

(function () {

var mozSms = navigator.mozSms;
var mozNotification = navigator.mozNotification;
var mozSettings = navigator.mozSettings;

if (!mozSms || !mozNotification || !mozSettings)
  return;

var activeSMSSound;
var activateSMSVibration;

mozSettings.onsettingchange = function onchange(ev) {
  switch (ev.settingName) {
    case 'sms.ring.received':
      activeSMSSound = ev.settingValue;
      break;
    case 'sms.vibration.received':
      activateSMSVibration = ev.settingValue;
      break;
  }
};

mozSettings.getLock().get('sms.ring.received')
    .addEventListener('success', (function onsuccess(ev) {
  activeSMSSound = ev.target.result['sms.ring.received'];
}));

mozSettings.getLock().get('sms.vibration.received')
    .addEventListener('success', (function onsuccess(ev) {
  activateSMSVibration = ev.target.result['sms.vibration.received'];
}));

mozSms.addEventListener('received', function received(ev) {
  var message = ev.message;

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
    // Asking to launch itself
    navigator.mozApps.getSelf().onsuccess = function(e) {
      var app = e.target.result;
      app.launch();
    };
  };

  notification.show();
});

}());
