'use strict';

var TelephonyHelper = (function() {

  var telephony = navigator.mozTelephony;

  var call = function t_call(number, oncall, onconnected, ondisconnected) {

    var settings = window.navigator.mozSettings, req;
    if (settings) {
      var settingsLock = settings.createLock();
      req = settingsLock.get('ril.radio.disabled');
      req.addEventListener('success', function onsuccess() {
        var status = req.result['ril.radio.disabled'];
        if (!status) {
          startDial(number, oncall, onconnected, ondisconnected);
        } else {
          handleFlightMode();
        }
      });
    } else {
      startDial(number, oncall, onconnected, ondisconnected);
    }
  };

  var startDial = function t_start(number, oncall, connected, disconnected) {
    var sanitizedNumber = number.replace(/-/g, '');

    if (telephony) {
      var call = telephony.dial(sanitizedNumber);

      if (call) {
        if (oncall)
          oncall();
        call.onconnected = connected;
        call.ondisconnected = disconnected;
        call.onerror = handleError;
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

  var handleError = function t_handleError(event) {
    var showError = function he_showError(_) {
      var erName = event.call.error.name, emgcyDialogBody,
          errorRecognized = false;

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
