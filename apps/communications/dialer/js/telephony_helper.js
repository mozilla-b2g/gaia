'use strict';

var TelephonyHelper = (function() {
  var call = function t_call(number, oncall, onconnected,
                             ondisconnected, onerror) {
    var sanitizedNumber = number.replace(/(\s|-|\.|\(|\))/g, '');
    if (!isValid(sanitizedNumber)) {
      displayMessage('BadNumber');
      return;
    }
    var conn = window.navigator.mozMobileConnection;
    if (!conn || !conn.voice || !conn.voice.network) {
      // No voice connection, the call won't make it
      displayMessage('NoNetwork');
      return;
    }
    startDial(sanitizedNumber, oncall, onconnected, ondisconnected, onerror);
  };

  function startDial(sanitizedNumber, oncall, connected, disconnected, error) {
    var telephony = navigator.mozTelephony;
    if (telephony) {
      var conn = window.navigator.mozMobileConnection;
      var cardState = IccHelper.cardState;
      var emergencyOnly = conn.voice.emergencyCallsOnly;
      var call;

      // Note: no need to check for cardState null. While airplane mode is on
      // cardState is null and we handle that situation in call() above.
      if (cardState === 'unknown') {
        error();
        return;
      } else if (emergencyOnly) {
        call = telephony.dialEmergency(sanitizedNumber);
      } else {
        call = telephony.dial(sanitizedNumber);
      }

      if (call) {
        if (oncall) {
          oncall();
        }
        call.onconnected = connected;
        call.ondisconnected = disconnected;
        call.onerror = function errorCB(evt) {
          if (error) {
            error();
          }

          var errorName = evt.call.error.name;
          if (errorName === 'BadNumberError') {
            // If the call is rejected for a bad number and we're in emergency
            // only mode, then just tell the user that they're not connected
            // to a network. Otherwise, tell them the number is bad.
            displayMessage(emergencyOnly ? 'NoNetwork' : 'BadNumber');
          } else if (errorName === 'DeviceNotAcceptedError') {
            displayMessage('DeviceNotAccepted');
          } else if (errorName === 'RadioNotAvailable') {
            displayMessage('FlightMode');
          } else {
            // If the call failed for some other reason we should still
            // display something to the user. See bug 846403.
            console.error('Unexpected error: ', errorName);
          }
        };
      } else {
        displayMessage('UnableToCall');
      }
    }
  }

  var isValid = function t_isValid(sanitizedNumber) {
    var validExp = /^[0-9#+*]{1,50}$/;
    return validExp.test(sanitizedNumber);
  };

  var displayMessage = function t_displayMessage(message) {
    var showDialog = function fm_showDialog(_) {
      var dialogTitle, dialogBody;
      switch (message) {
      case 'BadNumber':
        dialogTitle = 'invalidNumberToDialTitle';
        dialogBody = 'invalidNumberToDialMessage';
        break;
      case 'FlightMode':
        dialogTitle = 'callAirplaneModeTitle';
        dialogBody = 'callAirplaneModeMessage';
        break;
      case 'NoNetwork':
        dialogTitle = 'emergencyDialogTitle';
        dialogBody = 'emergencyDialogBodyBadNumber';
        break;
      case 'DeviceNotAccepted':
        dialogTitle = 'emergencyDialogTitle';
        dialogBody = 'emergencyDialogBodyDeviceNotAccepted';
        break;
      case 'UnableToCall':
        dialogTitle = 'unableToCallTitle';
        dialogBody = 'unableToCallMessage';
        break;
      default:
        console.error('Invalid message argument'); // Should never happen
        return;
      }

      ConfirmDialog.show(
        _(dialogTitle),
        _(dialogBody),
        {
          title: _('emergencyDialogBtnOk'), // Just 'ok' would be better.
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

  return {
    call: call
  };

})();
