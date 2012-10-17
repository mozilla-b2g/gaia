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
  SettingsListener.observe('ring.enabled', true, function(value) {
    activeSMSSound = !!value;
  });

  var selectedSmsSound = 'style/ringtones/sms.wav';
  SettingsListener.observe('sms.ringtone', 'sms.wav', function(value) {
    selectedSmsSound = 'style/ringtones/' + value;
  });

  var activateSMSVibration = false;
  SettingsListener.observe('vibration.enabled', true, function(value) {
    activateSMSVibration = !!value;
  });

  function ring() {
    var ringtonePlayer = new Audio();
    ringtonePlayer.src = selectedSmsSound;
    ringtonePlayer.play();
    window.setTimeout(function smsRingtoneEnder() {
      ringtonePlayer.pause();
      ringtonePlayer.src = '';
    }, 2000);
  }

  function vibrate() {
    navigator.vibrate([200, 200, 200, 200]);
  }

  mozSms.addEventListener('received', function received(evt) {
    var message = evt.message;
    // The black list includes numbers for which notifications should not
    // progress to the user. Se blackllist.js for more information.
    if (BlackList.has(message.sender))
      return;

    if (activeSMSSound) {
      ring();
    }

    if (activateSMSVibration && 'vibrate' in navigator) {
      // If the screen is turned off we need to wait for it to turn on
      // again (the notification will turn it on if needed).
      if (document.mozHidden) {
        window.addEventListener('mozvisibilitychange', function waitOn() {
          window.removeEventListener('mozvisibilitychange', waitOn);
          vibrate();
        });
      } else {
        vibrate();
      }
    }

    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      var number = message.sender;
      var iconURL = NotificationHelper.getIconURI(app);

      var activityCall = function() {
        // Go directly to the thread of the received message.
        try {
          var activity = new MozActivity({
            name: 'new',
            data: {
              type: 'websms/sms',
              number: number
            }
          });
        } catch (e) {
          console.log('WebActivities unavailable? : ' + e);
        }
      };

      Contacts.findByNumber(message.sender,
      function gotContact(contact) {
        var sender;
        if (contact) {
          sender = contact.name;
        } else {
          sender = message.sender;
        }

        NotificationHelper.send(sender, message.body, iconURL, activityCall);
      });
    };
  });
}());
