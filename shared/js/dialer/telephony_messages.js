'use strict';

/* globals ConfirmDialog, LazyLoader */
/* exported TelephonyMessages */

var TelephonyMessages = {
  /**
   * Constants for what message to display when we get a bad number error.
   * Depends on the situation.
   */
  // Display the regular "invalid number" message, as this is a regular call.
  REGULAR_CALL: 0,
  // We have no network and/or no SIM, so we can only make emergency calls.
  // Display the "no network" message.
  NO_NETWORK: 1,
  // We are making a call from an emergency call view, so calls can only be
  // placed to emergency and ICE numbers. Display the "not an emergency number"
  // message.
  EMERGENCY_ONLY: 2,

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
    case 'OperatorDeterminedBarring':
      dialogTitle = 'unableToCallTitle';
      dialogBody = 'callBarredByTheOperatorMessage';
      break;
    case 'EmergencyCallOnly':
      dialogTitle = 'emergency-call-only';
      dialogBody = 'emergency-call-error';
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

  handleError: function(errorName, number, emergencyOptions) {
    // We ignore this error because some networks generate this with
    // STK CallControl when calling Voicemail pilots (e.g. TMobile)
    if (errorName === 'ModifiedDialError') {
      console.log('ModifiedDialError');
      return;
    }

    if (errorName === 'BadNumberError') {
      if (emergencyOptions === this.REGULAR_CALL) {
        this.displayMessage('BadNumber');
      } else if (emergencyOptions === this.NO_NETWORK) {
        this.displayMessage('NoNetwork');
      } else if (emergencyOptions === this.EMERGENCY_ONLY) {
        this.displayMessage('EmergencyCallOnly', number);
      } else {
        console.error('Unexpected emergency options: ' + emergencyOptions);
      }
    } else if (errorName === 'DeviceNotAcceptedError') {
      this.displayMessage('DeviceNotAccepted');
    } else if (errorName === 'RadioNotAvailable') {
      this.displayMessage('FlightMode');
    } else if (errorName === 'BusyError') {
      this.displayMessage('NumberIsBusy');
    } else if (errorName === 'FDNBlockedError' ||
               errorName === 'FdnCheckFailure') {
      this.displayMessage('FixedDialingNumbers', number);
    } else if (errorName === 'OtherConnectionInUse') {
      this.displayMessage('OtherConnectionInUse');
    } else if (errorName === 'OperatorDeterminedBarringError') {
      this.displayMessage('OperatorDeterminedBarring');
    } else {
      // If the call failed for some other reason we should still
      // display something to the user. See bug 846403.
      console.error('Unexpected error: ', errorName);
      this.displayMessage('UnableToCall');
    }
  },
};
