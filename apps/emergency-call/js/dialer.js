'use strict';

/* globals ConfirmDialog, KeypadManager, ICEContacts, LazyLoader,
           SimSettingsHelper, TonePlayer, SimPicker */
/* exported CallHandler */

var CallHandler = {
  _telephony: window.navigator.mozTelephony,
  _emergencyAlert: document.getElementById('emergencyAlert'),
  _emergencyMsg: document.getElementById('emergencyAlert-msg'),
  _emergencyAlertBtn: document.getElementById('emergencyAlert-btn'),
  l10n: window.navigator.mozL10n,

  init: function() {
    this._emergencyAlertBtn.addEventListener('click', function() {
      this._emergencyAlert.hidden = true;
    }.bind(this));
  },

  _throwEmergencyError: function(sanitizedNumber) {
    LazyLoader.load(['/shared/style/confirm.css'], function() {
      navigator.mozL10n.once(function() {
        this._emergencyMsg.textContent =
          this.l10n.get('emergency-call-error',
                        {number: sanitizedNumber});
        this._emergencyAlert.hidden = false;
      }.bind(this));
    }.bind(this));
  },

  call: function(number) {
    var sanitizedNumber = number.replace(/-/g, ''),
        self = this;

    if (ICEContacts.isFromICEContact(number)) {
      LazyLoader.load(['/shared/js/sim_settings_helper.js'], function() {
        SimSettingsHelper.getCardIndexFrom('outgoingCall',
        function(defaultCardIndex) {
          if (defaultCardIndex == SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE) {
            var simPickerElt = document.getElementById('sim-picker');
            var simFiles = [simPickerElt,
                            '/shared/js/sim_picker.js',
                            '/shared/style/sim_picker.css'];
            LazyLoader.load(simFiles, function() {
              SimPicker.getOrPick(defaultCardIndex, number, function(ci) {
                var callPromise = self._telephony.dial(number, ci);
                self._handleCallPromise(callPromise, sanitizedNumber);
              });
            });
          } else {
            var callPromise = self._telephony.dial(number, defaultCardIndex);
            self._handleCallPromise(callPromise, sanitizedNumber);
          }
        });
      });
    } else {
      var callPromise = self._telephony.dialEmergency(sanitizedNumber);
      self._handleCallPromise(callPromise, sanitizedNumber);
    }
  },

  _handleCallPromise: function(callPromise, sanitizedNumber) {
    var self = this;

    callPromise.then(function(call) {
      self._installHandlers(call);
    }).catch(function(errorName) {
      self._throwEmergencyError(sanitizedNumber);
    });
  },

  _installHandlers: function(call) {
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

  // FIXME/bug 1060451: Copied-and-pasted from dialer/telephony_helper.js. We
  // should refactor and share this.
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

  // FIXME/bug 1060451: Copied-and-pasted from dialer/telephony_helper.js. We
  // should refactor and share this.
  handleError: function(errorName, number) {
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
  window.CallHandler.init();
});
