'use strict';

var TelephonyHelper = (function() {

  var telephony = navigator.mozTelephony;

  var call = function(number, oncall, onconnected, ondisconnected, onerror) {
    var settings = window.navigator.mozSettings, req;
    if (settings) {
      var settingsLock = settings.createLock();
      req = settingsLock.get('ril.radio.disabled');
      req.addEventListener('success', function onsuccess() {
        var status = req.result['ril.radio.disabled'];
        if (!status) {
          var conn = window.navigator.mozMobileConnection;
          if (!conn || !conn.voice.network) {
            // No voice connection, the call won't make it
            handleError(null, true /* generic */);
            return;
          }

          startDial(number, oncall, onconnected, ondisconnected, onerror);
        } else {
          handleFlightMode();
        }
      });
    } else {
      startDial(number, oncall, onconnected, ondisconnected, onerror);
    }
  };

  var startDial = function(number, oncall, connected, disconnected, onerror) {
    if (telephony) {
      var conn = window.navigator.mozMobileConnection;
      var call;
      var cardState = conn.cardState;
      var sanitizedNumber = number.replace(/-/g, '');

      if (cardState === 'pinRequired' || cardState === 'pukRequired') {
        call = telephony.dialEmergency(sanitizedNumber);
      }
      else {
        call = telephony.dial(sanitizedNumber);
      }

      if (call) {
        if (oncall)
          oncall();
        call.onconnected = connected;
        call.ondisconnected = disconnected;
        call.onerror = function errorCB(evt) {
          handleError(evt);

          if (onerror) {
            onerror();
          }
        };
      }
    }
  };

  var handleFlightMode = function t_handleFlightMode() {
    var showDialog = function fm_showDialog(_) {
      ConfirmDialog.show(
        _('callAirplaneModeTitle'),
        _('callAirplaneModeMessage'),
        {
          title: _('cancel'),
          callback: function() {
            ConfirmDialog.hide();
          }
        }
      );
    };

    if (window.hasOwnProperty('LazyL10n')) {
      LazyL10n.get(function localized(_) {
        showDialog(_);
      });
    } else {
      showDialog(_);
    }
  };

  var handleError = function t_handleError(event, generic) {
    var showError = function he_showError(_) {
      var emgcyDialogBody, errorRecognized = false;

      var erName = generic ? 'BadNumberError' : event.call.error.name;

      if (erName === 'BadNumberError') {
        errorRecognized = true;
        emgcyDialogBody = 'emergencyDialogBodyBadNumber';
      } else if (erName === 'DeviceNotAcceptedError') {
        errorRecognized = true;
        emgcyDialogBody = 'emergencyDialogBodyDeviceNotAccepted';
      }

      if (errorRecognized) {
        ConfirmDialog.show(
          _('emergencyDialogTitle'),
          _(emgcyDialogBody),
          {
            title: _('emergencyDialogBtnOk'),
            callback: function() {
              ConfirmDialog.hide();
            }
          }
        );
      }
    };

    if (window.hasOwnProperty('LazyL10n')) {
      LazyL10n.get(function localized(_) {
        showError(_);
      });
    } else {
      showError(_);
    }
  };

  return {
    call: call
  };

})();
