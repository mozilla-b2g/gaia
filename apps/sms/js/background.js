'use strict';

(function() {
  var mozSms = navigator.mozSms;
  if (!mozSms)
    return;

  // Setting up the SimplePhoneMatcher
  var conn = window.navigator.mozMobileConnection;
  if (conn) {
    SimplePhoneMatcher.mcc = conn.voice.network.mcc;
  }

  /* === Setup === */
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
    // The black list includes numbers for which notifications should not
    // progress to the user. Se blackllist.js for more information.
    if (BlackList.has(message.sender))
      return;

    if (activeSMSSound) {
      var ringtonePlayer = new Audio();
      ringtonePlayer.src = 'style/ringtones/sms.wav';
      ringtonePlayer.play();
      window.setTimeout(function smsRingtoneEnder() {
        ringtonePlayer.pause();
        ringtonePlayer.src = '';
      }, 500);
    }

    if (activateSMSVibration && 'vibrate' in navigator) {
      navigator.vibrate([200, 200, 200, 200]);
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

      Contacts.findByNumber(message.sender,
      function gotContact(contact) {
        var sender;
        if (contact) {
          sender = contact.name;
        } else {
          sender = message.sender;
        }

        NotificationHelper.send(sender, message.body, iconURL, notiClick);
      });
    };
  });
}());

