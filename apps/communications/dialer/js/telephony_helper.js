'use strict';

var TelephonyHelper = (function() {
  var confirmLoaded = false;

  var call = function t_call(number, oncall, onconnected,
                             ondisconnected, onerror) {
    var sanitizedNumber = number.replace(/(\s|-|\.|\(|\))/g, '');
    if (!isValid(sanitizedNumber)) {
      displayMessage('BadNumber');
      return;
    }

    getConnection(function gotConnection(conn) {
      if (!conn || !conn.voice) {
        // No voice connection, the call won't make it
        displayMessage('NoNetwork');
        return;
      }

      var telephony = navigator.mozTelephony;
      var openLines = telephony.calls.length +
          (telephony.conferenceGroup.calls.length ? 1 : 0);
      // User can make call only when there are less than 2 calls by spec.
      // If the limit reached, return early to prevent holding active call.
      if (openLines >= 2) {
        displayMessage('UnableToCall');
        return;
      }

      var activeCall = telephony.active;
      if (!activeCall) {
        startDial(
          conn, sanitizedNumber, oncall, onconnected, ondisconnected, onerror);
        return;
      }
      activeCall.onheld = function activeCallHeld() {
        activeCall.onheld = null;
        startDial(
          conn, sanitizedNumber, oncall, onconnected, ondisconnected, onerror);
      };
      activeCall.hold();
    });
  };

  function notifyBusyLine() {
    // ANSI call waiting tone for a 6 seconds window.
    var sequence = [[480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500]];
    TonePlayer.playSequence(sequence);
  };

  function startDial(
    conn, sanitizedNumber, oncall, connected, disconnected, error) {

    var telephony = navigator.mozTelephony;
    if (!telephony) {
      return;
    }

    // Making sure we're not dialing the same number twice
    var alreadyDialed = telephony.calls.some(function callIterator(call) {
      return (call.number == sanitizedNumber);
    });
    if (alreadyDialed) {
      return;
    }

    LazyLoader.load('/shared/js/icc_helper.js', function() {
      var cardState = IccHelper.cardState;
      var emergencyOnly = conn.voice.emergencyCallsOnly;
      var hasCard = (conn.iccId !== null);
      var call;

      // Note: no need to check for cardState null. While airplane mode is on
      // cardState is null and we handle that situation in call() above.
      if (((cardState === 'unknown') || (cardState === 'illegal')) &&
           (emergencyOnly === false)) {
        error();
        return;
      } else if (emergencyOnly) {
        // If the mobileConnection has a sim card we let gecko take the
        // default service, otherwise we force the first slot.
        var serviceId = hasCard ? undefined : 0;
        call = telephony.dialEmergency(sanitizedNumber, serviceId);
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
          } else if (errorName === 'BusyError') {
            notifyBusyLine();
            displayMessage('NumberIsBusy');
          } else if (errorName === 'FDNBlockedError' ||
                     errorName === 'FdnCheckFailure') {
            displayMessage('FixedDialingNumbers');
          } else {
            // If the call failed for some other reason we should still
            // display something to the user. See bug 846403.
            console.error('Unexpected error: ', errorName);
          }
        };
      } else {
        displayMessage('UnableToCall');
      }
    });
  }

  var isValid = function t_isValid(sanitizedNumber) {
    var validExp = /^[0-9#+*]{1,50}$/;
    return validExp.test(sanitizedNumber);
  };

  var getConnection = function t_getConnection(callback) {
    var conn = window.navigator.mozMobileConnection;
    if (conn) {
      callback(conn);
      return;
    }

    var connections = navigator.mozMobileConnections;
    var settings = navigator.mozSettings;
    if (!settings || !connections) {
      callback(null);
      return;
    }

    if (connections.length === 1) {
      callback(connections[0]);
      return;
    }

    var req = settings.createLock().get('ril.telephony.defaultServiceId');

    req.onsuccess = function getDefaultServiceId() {
      var id = req.result['ril.telephony.defaultServiceId'] || 0;
      callback(connections[id]);
    };

    req.onerror = function getDefaultServiceIdError() {
      callback(null);
    };
  };

  var loadConfirm = function t_loadConfirm(cb) {
    if (confirmLoaded) {
      cb();
      return;
    }

    var confMsg = document.getElementById('confirmation-message');

    LazyLoader.load(['/contacts/js/utilities/confirm.js', confMsg], function() {
      navigator.mozL10n.translate(confMsg);
      confirmLoaded = true;
      cb();
    });
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
      case 'NumberIsBusy':
        dialogTitle = 'numberIsBusyTitle';
        dialogBody = 'numberIsBusyMessage';
        break;
      case 'FixedDialingNumbers':
        dialogTitle = 'fdnIsEnabledTitle';
        dialogBody = 'fdnIsEnabledMessage';
        break;
      default:
        console.error('Invalid message argument'); // Should never happen
        return;
      }

      loadConfirm(function() {
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
      });
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
