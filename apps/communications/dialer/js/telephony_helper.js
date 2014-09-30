'use strict';

/* global LazyLoader, IccHelper, ConfirmDialog, TelephonyMessages */
/* exported TelephonyHelper */

var TelephonyHelper = (function() {
  var confirmLoaded = false;

  var call = function t_call(number, cardIndex, oncall, onconnected,
                             ondisconnected, onerror) {
    var sanitizedNumber = number.replace(/(\s|-|\.|\(|\))/g, '');
    if (!isValid(sanitizedNumber)) {
      TelephonyMessages.displayMessage('BadNumber');
      return;
    }

    var conn = navigator.mozMobileConnections &&
      navigator.mozMobileConnections[cardIndex];

    if (!conn || !conn.voice) {
      // No voice connection, the call won't make it
      TelephonyMessages.displayMessage('NoNetwork');
      return;
    }

    var telephony = navigator.mozTelephony;
    var openLines = telephony.calls.length +
        ((telephony.conferenceGroup &&
          telephony.conferenceGroup.calls.length) ? 1 : 0);
    // User can make call only when there are less than 2 calls by spec.
    // If the limit reached, return early to prevent holding active call.
    if (openLines >= 2) {
      TelephonyMessages.displayMessage('UnableToCall');
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

  function startDial(cardIndex, conn, sanitizedNumber, oncall, onconnected,
                     ondisconnected, onerror) {

    var telephony = navigator.mozTelephony;
    if (!telephony) {
      return;
    }

    LazyLoader.load('/shared/js/icc_helper.js', function() {
      var cardState = IccHelper.cardState;
      var emergencyOnly = conn.voice.emergencyCallsOnly;
      var hasCard = (conn.iccId !== null);
      var callPromise;

      // Note: no need to check for cardState null. While airplane mode is on
      // cardState is null and we handle that situation in call() above.
      if (((cardState === 'unknown') || (cardState === 'illegal')) &&
           (emergencyOnly === false)) {
        onerror();
        return;
      } else if (emergencyOnly) {
        loadConfirm(function() {
          ConfirmDialog.show(
            'connectingEllipsis',
            '',
            {
              title: 'emergencyDialogBtnOk',
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
        callPromise = telephony.dialEmergency(sanitizedNumber);
      } else {
        callPromise = telephony.dial(sanitizedNumber, cardIndex);
      }

      callPromise.then(function(call) {
        installHandlers(call, sanitizedNumber, emergencyOnly, oncall,
                        onconnected, ondisconnected, onerror);
      }).catch(function(errorName) {
        TelephonyMessages.handleError(
          errorName, sanitizedNumber, emergencyOnly, onerror);
      });
    });
  }

  function installHandlers(call, number, emergencyOnly, oncall, onconnected,
                           ondisconnected, onerror) {
    if (oncall) {
      oncall();
    }
    call.onconnected = onconnected;
    call.ondisconnected = ondisconnected;
    call.onerror = function errorCB(evt) {
      var errorName = evt.call.error.name;
      TelephonyMessages.handleError(errorName, number, emergencyOnly, onerror);
    };
  }

  var isValid = function t_isValid(sanitizedNumber) {
    var validExp = /^[0-9#+*]{1,50}$/;
    return validExp.test(sanitizedNumber);
  };

  var loadConfirm = function t_loadConfirm(cb) {
    if (confirmLoaded) {
      cb();
      return;
    }

    var confMsg = document.getElementById('confirmation-message');

    LazyLoader.load(['/shared/js/confirm.js', confMsg], function() {
      confirmLoaded = true;
      cb();
    });
  };

  var getInUseSim = function t_getInUseSim() {
    var telephony = navigator.mozTelephony;
    if (telephony) {
      var isInCall = !!telephony.calls.length;
      var isInConference = !!telephony.conferenceGroup &&
                          !!telephony.conferenceGroup.calls.length;

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
