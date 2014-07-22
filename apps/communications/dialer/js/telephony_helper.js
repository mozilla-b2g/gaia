'use strict';

/* global _, TonePlayer, LazyLoader, IccHelper, ConfirmDialog, LazyL10n */
/* exported TelephonyHelper */

// DTMF control digit separator length (ms) as defined in GSM ETSI GSM 02.07
const DTMF_SEPARATOR_PAUSE_DURATION = 3000;
// DTMF play tone duration (ms)
const DTMF_PLAY_LENGTH = 120;

var TelephonyHelper = (function() {
  var confirmLoaded = false;

  var call = function t_call(number, cardIndex, oncall, onconnected,
                             ondisconnected, onerror) {
    var sanitizedNumber = number.replace(/(\s|-|\.|\(|\))/g, '');
    if (!isValid(sanitizedNumber)) {
      displayMessage('BadNumber');
      return;
    }

    var conn = navigator.mozMobileConnections &&
      navigator.mozMobileConnections[cardIndex];

    if (!conn || !conn.voice) {
      // No voice connection, the call won't make it
      displayMessage('NoNetwork');
      return;
    }

    var telephony = navigator.mozTelephony;
    var openLines = telephony.calls.length +
        ((telephony.conferenceGroup &&
          telephony.conferenceGroup.calls.length) ? 1 : 0);
    // User can make call only when there are less than 2 calls by spec.
    // If the limit reached, return early to prevent holding active call.
    if (openLines >= 2) {
      displayMessage('UnableToCall');
      return;
    }

    var cdmaTypes = ['evdo0', 'evdoa', 'evdob', '1xrtt', 'is95a', 'is95b'];
    var voiceType = conn.voice ? conn.voice.type : null;
    var isCdmaConnection = (cdmaTypes.indexOf(voiceType) !== -1);
    var activeCall = telephony.active;

    if (!activeCall || isCdmaConnection) {
      startDial(cardIndex, conn, sanitizedNumber, oncall, onconnected,
                ondisconnected, onerror);
      return;
    }
    activeCall.onheld = function activeCallHeld() {
      activeCall.onheld = null;
      startDial(cardIndex, conn, sanitizedNumber, oncall, onconnected,
                ondisconnected, onerror);
    };
    activeCall.hold();
  };

  function notifyBusyLine() {
    // ANSI call waiting tone for a 6 seconds window.
    var sequence = [[480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500],
                    [480, 620, 500], [0, 0, 500]];
    
    TonePlayer.setChannel('telephony');
    TonePlayer.playSequence(sequence);
    TonePlayer.setChannel('normal');
  }

  // Split a number in 2 parts, the part before the DTMF separator and
  // the part after the DTMF separator
  function splitNumberAtDtmfSeparator(number) {
    var firstDtmfSeparator = number.indexOf(',');
    if (firstDtmfSeparator > 0) {
      return [number.substr(0, firstDtmfSeparator),
              number.substr(firstDtmfSeparator)];
    } else {
      return [number, ''];
    }
  }

  // Get the digits to dial, i.e. the digits before the first DTMF separator
  function getBaseDigitsFromNumber(number) {
    return splitNumberAtDtmfSeparator(number)[0];
  }

  // Get the DTMF digits part of the number, i.e. digits after the first 
  // DTMF separator
  function getDtmfDigitsFromNumber(number) {
    return splitNumberAtDtmfSeparator(number)[1];
  }

  function startDial(cardIndex, conn, sanitizedNumber, oncall, onconnected,
                     ondisconnected, onerror) {

    var telephony = navigator.mozTelephony;
    if (!telephony) {
      return;
    }

    // Making sure we're not dialing the same number twice
    var alreadyDialed = telephony.calls.some(function callIterator(call) {
      var number = call.id ? call.id.number : call.number;

      return (number == sanitizedNumber);
    });
    if (alreadyDialed) {
      return;
    }

    LazyLoader.load('/shared/js/icc_helper.js', function() {
      var cardState = IccHelper.cardState;
      var emergencyOnly = conn.voice.emergencyCallsOnly;
      var hasCard = (conn.iccId !== null);
      var callPromise;
      var baseNumber = getBaseDigitsFromNumber(sanitizedNumber);

      // Note: no need to check for cardState null. While airplane mode is on
      // cardState is null and we handle that situation in call() above.
      if (((cardState === 'unknown') || (cardState === 'illegal')) &&
           (emergencyOnly === false)) {
        onerror();
        return;
      } else if (emergencyOnly) {
        var _ = navigator.mozL10n.get;
        loadConfirm(function() {
          ConfirmDialog.show(
            _('connecting') + ' ...',
            '',
            {
              title: _('emergencyDialogBtnOk'),
              callback: function() {
                ConfirmDialog.hide();
              }
            }
          );
          document.addEventListener('visibilitychange', function hideDialog() {
            document.removeEventListener('visibilitychange', hideDialog);
            ConfirmDialog.hide();
          });
        });

        // If the mobileConnection has a sim card we let gecko take the
        // default service, otherwise we force the first slot.
        cardIndex = hasCard ? undefined : 0;
        callPromise = telephony.dialEmergency(baseNumber);
      } else {
        callPromise = telephony.dial(baseNumber, cardIndex);
      }

      callPromise.then(function(call) {
        installHandlers(call, sanitizedNumber, emergencyOnly, oncall,
                        onconnected, ondisconnected, onerror);
      }).catch(function(errorName) {
        handleError(errorName, sanitizedNumber, emergencyOnly, onerror);
      });
    });
  }

  function installHandlers(call, number, emergencyOnly, oncall, onconnected,
                           ondisconnected, onerror) {
    if (oncall) {
      oncall();
    }
    call.onconnected = function connectedCB() {
      var dtmfDigits = getDtmfDigitsFromNumber(number);
      if (dtmfDigits) {
        playDtmfTones(call, dtmfDigits);
      }
      if (onconnected) {
        onconnected.apply(this, arguments);
      }
    };
    call.ondisconnected = ondisconnected;
    call.onerror = function errorCB(evt) {
      var errorName = evt.call.error.name;
      handleError(errorName, number, emergencyOnly, onerror);
    };
  }

  function playDtmfTones(call, dtmfDigits) {
    if (call.state !== 'connected' || !dtmfDigits.length) {
      return;
    }

    var firstDigit = dtmfDigits[0];
    var restDigits = dtmfDigits.substr(1);

    if (firstDigit === ',') {
      // If the first digit is a separator we have to wait pause duration
      // before playing the rest of the digits
      setTimeout(function() {
        // Then, recursively play the remaining digits
        playDtmfTones(call, restDigits);
      }, DTMF_SEPARATOR_PAUSE_DURATION);
    } else {
      // Play the first DTMF digit
      playDtmfTone(call, firstDigit, function() {
        // When done, recursively play remaining digits
        playDtmfTones(call, restDigits);
      });
    }
  }

  // Plays a single dtmf tone for DTMF_PLAY_LENGTH and then calls callback
  function playDtmfTone(call, digit, callback) {
    var telephony = navigator.mozTelephony;
    if (!telephony) {
      return;
    }

    telephony.startTone(digit, call.serviceId);
    setTimeout(function() {
      telephony.stopTone(call.serviceId);
      callback();
    }, DTMF_PLAY_LENGTH);
  }

  function handleError(errorName, number, emergencyOnly, onerror) {
    if (onerror) {
      onerror();
    }

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
      displayMessage('FixedDialingNumbers', number);
    } else if (errorName == 'OtherConnectionInUse') {
      displayMessage('OtherConnectionInUse');
    } else {
      // If the call failed for some other reason we should still
      // display something to the user. See bug 846403.
      console.error('Unexpected error: ', errorName);
      displayMessage('UnableToCall');
    }
  }

  var isValid = function t_isValid(sanitizedNumber) {
    var validExp = /^(?!,)([0-9#+*,]){1,50}$/;
    return validExp.test(sanitizedNumber);
  };

  var loadConfirm = function t_loadConfirm(cb) {
    if (confirmLoaded) {
      cb();
      return;
    }

    var confMsg = document.getElementById('confirmation-message');

    LazyLoader.load(['/shared/js/confirm.js', confMsg], function() {
      navigator.mozL10n.translate(confMsg);
      confirmLoaded = true;
      cb();
    });
  };

  var displayMessage = function t_displayMessage(message, number) {
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
        dialogTitle = 'fdnIsActiveTitle';
        dialogBody = 'fdnIsActiveMessage';
        break;
      case 'OtherConnectionInUse':
        dialogTitle = 'otherConnectionInUseTitle';
        dialogBody = 'otherConnectionInUseMessage';
        break;
      default:
        console.error('Invalid message argument'); // Should never happen
        return;
      }

      loadConfirm(function() {
        ConfirmDialog.show(
          _(dialogTitle),
          _(dialogBody, {number: number}),
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

  var getInUseSim = function t_getInUseSim() {
    var telephony = navigator.mozTelephony;
    if (telephony) {
      var isInCall = !!telephony.calls.length;
      var isInConference = !!telephony.conferenceGroup.calls.length;

      if (isInCall || isInConference) {
        return isInCall ?
          navigator.mozTelephony.calls[0].serviceId :
          navigator.mozTelephony.conferenceGroup.calls[0].serviceId;
      }
    }

    return null;
  };

  window.TelephonyHelper = TelephonyHelper;

  return {
    call: call,
    getInUseSim: getInUseSim
  };

})();
