'use strict';

(function() {
  var mozSms = navigator.mozSms;
  if (!mozSms)
    return;

  /* === Setup === */
  SettingsListener.init();

  var ringtonePlayer = new Audio();

  /* === Settings === */
  var activeSMSSound = true;
  SettingsListener.observe('sms.ring.received', true, function(value) {
    activeSMSSound = !!value;
  });

  var activateSMSVibration = false;
  SettingsListener.observe('sms.vibration.received', true, function(value) {
    activateSMSVibration = !!value;
  });

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

    if (activateSMSVibration && 'mozVibrate' in navigator) {
      navigator.mozVibrate([200, 200, 200, 200]);
    }

    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;

      var iconURL = NotificationHelper.getIconURI(app);

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

