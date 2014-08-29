'use strict';

/* globals ConfirmDialog, KeypadManager, ICEContacts, LazyLoader,
           SimSettingsHelper, TonePlayer */
/* exported CallHandler */

var CallHandler = {
  _telephony: window.navigator.mozTelephony,
  l10n: window.navigator.mozL10n,

  call: function (number, isICEContact) {
    var sanitizedNumber = number.replace(/-/g, ''),
        telephony = this._telephony,
        self = this;
    if (telephony) {
      var callPromise;
      if (ICEContacts.isFromICEContact(number)) {
        LazyLoader.load(['/shared/js/sim_settings_helper.js'], function() {
          SimSettingsHelper.getCardIndexFrom('outgoingCall',
            function(defaultCardIndex) {
              callPromise = telephony.dial(number, defaultCardIndex);
              callPromise.then(function(call) {
                self._installHandlers(call);
              }).catch(function (errorName) {
                self.l10n.ready(function() {
                  self.handleError(errorName, number);
                });
              });
            }
          );
        });
      } else {
        callPromise = telephony.dialEmergency(sanitizedNumber);
        callPromise.then(function(call) {
          self._installHandlers(call);
        }).catch(function(errorName) {
          self.handleError(errorName, number);
        });
      }
    }
  },

  _installHandlers: function (call) {
    if (call) {
      var cb = function clearPhoneView() {
        KeypadManager.updatePhoneNumber('');
      };
      call.onconnected = cb;

      call.ondisconnected = function callEnded() {
        cb();
      };
    }
  },

  displayMessage: function (message, number) {
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

    var self = this;
    LazyLoader.load(['/shared/style/confirm.css',
                     '/shared/js/confirm.js',
                     document.getElementById('confirmation-message')],
      function() {
        ConfirmDialog.show(
          self.l10n.get(dialogTitle),
          self.l10n.get(dialogBody, {number: number}),
          {
            title: self.l10n.get('emergencyDialogBtnOk'),
            callback: function() {
              ConfirmDialog.hide();
            }
          }
        );
      }
    );
  },

  handleError: function (errorName, number) {
    if (errorName === 'BadNumberError') {
      this.displayMessage('NoNetwork');
    } else if (errorName === 'DeviceNotAcceptedError') {
      this.displayMessage('DeviceNotAccepted');
    } else if (errorName === 'RadioNotAvailable') {
      this.displayMessage('FlightMode');
    } else if (errorName === 'BusyError') {
      this.notifyBusyLine();
      this.displayMessage('NumberIsBusy');
    } else if (errorName === 'FDNBlockedError' ||
               errorName === 'FdnCheckFailure') {
      this.displayMessage('FixedDialingNumbers', number);
    } else if (errorName == 'OtherConnectionInUse') {
      this.displayMessage('OtherConnectionInUse');
    } else {
      // If the call failed for some other reason we should still
      // display something to the user. See bug 846403.
      console.error('Unexpected error: ', errorName);
      this.displayMessage('UnableToCall');
    }
  },

  notifyBusyLine: function() {
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
};
/** @global CallHandler */
window.CallHandler = CallHandler;

window.addEventListener('load', function onload() {
  window.removeEventListener('load', onload);
  window.ICEContacts.updateICEContacts();
  window.KeypadManager.init();
});
