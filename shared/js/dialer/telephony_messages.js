'use strict';

/* globals ConfirmDialog, LazyLoader, TonePlayer */
/* exported TelephonyMessages */

var TelephonyMessages = {
  displayMessage: function(message, number) {
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

    LazyLoader.load(['/shared/style/confirm.css',
                     '/shared/js/confirm.js',
                     document.getElementById('confirmation-message')],
      function() {
        ConfirmDialog.show(
          dialogTitle,
          {id: dialogBody, args: {number: number}},
          {
            title: 'emergencyDialogBtnOk', // Just 'ok' would be better.
            callback: function() {
              ConfirmDialog.hide();
            }
          }
        );
      }
    );
  },

  handleError: function(errorName, number, emergencyOnly, onerror) {
    if (onerror) {
      onerror();
    }

    if (errorName === 'BadNumberError') {
      // If the call is rejected for a bad number and we're in emergency
      // only mode, then just tell the user that they're not connected
      // to a network. Otherwise, tell them the number is bad.
      this.displayMessage(emergencyOnly ? 'NoNetwork' : 'BadNumber');
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
    } else if (errorName === 'OtherConnectionInUse') {
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
