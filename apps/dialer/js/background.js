'use strict';

(function() {

  var telephony = navigator.mozTelephony;
  if (!telephony) {
    return;
  }

  /* === Setup === */
  SettingsListener.init();

  var ringtonePlayer = new Audio();
  ringtonePlayer.loop = true;

  var power = navigator.mozPower;

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
  telephony.addEventListener('incoming', function incoming(evt) {
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

    telephony.calls.forEach(function(call) {
      if (call.state == 'incoming') {
        call.onstatechange = function() {
          call.onstatechange = null;
          ringtonePlayer.pause();
          window.clearInterval(vibrateInterval);
        };
      }
    });

    navigator.mozApps.getSelf().onsuccess = function(e) {
      var app = e.target.result;
      app.launch();

      if (power) {
        power.screenEnabled = true;
        power.screenBrightness = preferredBrightness;
      }
    };
  });
}());
