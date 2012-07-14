'use strict';

(function() {
  var telephony = navigator.mozTelephony;
  if (!telephony) {
    return;
  }

  /* === Setup === */
  var ringtonePlayer = new Audio();
  ringtonePlayer.loop = true;

  /* === Settings === */
  var activePhoneSound = true;
  SettingsListener.observe('phone.ring.incoming', true, function(value) {
    activePhoneSound = !!value;
  });

  var selectedPhoneSound = '';
  SettingsListener.observe('homescreen.ring', 'classic.wav', function(value) {
    selectedPhoneSound = 'style/ringtones/' + value;
    ringtonePlayer.src = selectedPhoneSound;
  });

  var activateVibration = false;
  SettingsListener.observe('phone.vibration.incoming', false, function(value) {
    activateVibration = !!value;
  });

  var preferredBrightness = 0.5;
  SettingsListener.observe('screen.brightness', 0.5, function(value) {
    preferredBrightness = parseFloat(value);
  });

  /* === Incoming handling === */
  telephony.addEventListener('callschanged', function bs_incomingHandler(evt) {
    var call = null;
    telephony.calls.some(function(aCall) {
      if (aCall.state == 'incoming' || aCall.state == 'dialing') {
        call = aCall;
        return true;
      }
      return false;
    });

    if (!call)
      return;

    var host = document.location.host;
    var protocol = document.location.protocol;
    window.open(protocol + '//' + host + '/oncall.html#' + call.state,
                'call_screen', 'attention');

    if (call.state != 'incoming')
      return;

    var vibrateInterval = 0;
    if (activateVibration) {
      vibrateInterval = window.setInterval(function vibrate() {
        if ('mozVibrate' in navigator) {
          navigator.mozVibrate([200]);
        }
      }, 600);
    }

    if (activePhoneSound && selectedPhoneSound) {
      ringtonePlayer.play();
    }

    call.onstatechange = function callStateChange() {
      call.onstatechange = null;

      ringtonePlayer.pause();
      window.clearInterval(vibrateInterval);

      // The call wasn't picked up
      if (call.state == 'disconnected') {
        navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
          var app = evt.target.result;

          var iconURL = NotificationHelper.getIconURI(app);

          var notiClick = function() {
            // Asking to launch itself
            app.launch('#recents-view');
          };

          var title = 'Missed call';
          var body = 'From ' + call.number;

          NotificationHelper.send(title, body, iconURL, notiClick);
        };
      }
    };
  });
}());
