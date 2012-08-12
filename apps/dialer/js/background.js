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

  var callScreenDisplayed = false;
  window.addEventListener('message', function messageListener(evt) {
    if (evt.data == 'closing') {
      callScreenDisplayed = false;
    }
  });

  var _ = navigator.mozL10n.get;

  /* === Incoming handling === */
  telephony.addEventListener('callschanged', function bs_incomingHandler(evt) {
    // If the call screen is displayed we don't need
    // to handle new incoming calls here
    if (callScreenDisplayed) {
      return;
    }

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

    callScreenDisplayed = true;

    if (call.state != 'incoming')
      return;

    var vibrateInterval = 0;
    if (activateVibration) {
      vibrateInterval = window.setInterval(function vibrate() {
        if ('vibrate' in navigator) {
          navigator.vibrate([200]);
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

          var title = _('missedCall');
          var body = _('from') + ' ' +
            (call.number.length ? call.number : _('unknown'));

          NotificationHelper.send(title, body, iconURL, notiClick);
        };
      }
    };
  });
}());
