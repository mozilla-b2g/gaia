'use strict';

/* globals MocksHelper, TelephonyMessages, MockConfirmDialog, LazyLoader */

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_confirm_dialog.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');
require('/shared/test/unit/mocks/dialer/mock_telephony_messages.js');

require('/shared/js/dialer/telephony_messages.js');

var mocksHelperForTelephonyMessages = new MocksHelper([
  'LazyLoader',
  'TonePlayer',
  'ConfirmDialog'
]);

suite('Telephony messages', function() {
  var subject;

  mocksHelperForTelephonyMessages.attachTestHelpers();

  suiteSetup(function() {
    subject = TelephonyMessages;
  });

  setup(function() {
    // This doesn't really matter. We do this to prevent the output from
    // appearing during testing.
    this.sinon.stub(console, 'error');
  });

  suite('Display messages', function() {
    var expectedMessages = [
      {
        message: 'BadNumber',
        title: 'invalidNumberToDialTitle',
        body: 'invalidNumberToDialMessage'
      },
      {
        message: 'FlightMode',
        title: 'callAirplaneModeTitle',
        body: 'callAirplaneModeMessage'
      },
      {
        message: 'NoNetwork',
        title: 'emergencyDialogTitle',
        body: 'emergencyDialogBodyBadNumber'
      },
      {
        message: 'DeviceNotAccepted',
        title: 'emergencyDialogTitle',
        body: 'emergencyDialogBodyDeviceNotAccepted'
      },
      {
        message: 'UnableToCall',
        title: 'unableToCallTitle',
        body: 'unableToCallMessage'
      },
      {
        message: 'NumberIsBusy',
        title: 'numberIsBusyTitle',
        body: 'numberIsBusyMessage'
      },
      {
        message: 'FixedDialingNumbers',
        title: 'fdnIsActiveTitle',
        body: 'fdnIsActiveMessage'
      },
      {
        message: 'OtherConnectionInUse',
        title: 'otherConnectionInUseTitle',
        body: 'otherConnectionInUseMessage'
      },
      {
        message: 'EmergencyCallOnly',
        title: 'emergency-call-only',
        body: 'emergency-call-error'
      },
      {
        message: 'OperatorDeterminedBarring',
        title: 'unableToCallTitle',
        body: 'callBarredByTheOperatorMessage'
      }
    ];

    setup(function() {
      this.sinon.spy(MockConfirmDialog, 'show');
    });

    suite('Lazyloading', function() {
      setup(function() {
        this.sinon.spy(LazyLoader, 'load');
      });

      test('Loads #confirmation-message element', function() {
        var confirmationMessage = document.createElement('span');
        confirmationMessage.id = 'confirmation-message';
        document.body.appendChild(confirmationMessage);

        subject.displayMessage('BadNumber');

        assert.notEqual(
          LazyLoader.load.args[0][0].indexOf(confirmationMessage), -1);

        document.body.removeChild(confirmationMessage);
      });

      test('Loads ConfirmDialog', function() {
        subject.displayMessage('BadNumber');

        assert.notEqual(
          LazyLoader.load.args[0][0].indexOf('/shared/style/confirm.css'), -1);
        assert.notEqual(
          LazyLoader.load.args[0][0].indexOf('/shared/js/confirm.js'), -1);
      });
    });

    expectedMessages.forEach(function(messageTuple) {
      test(messageTuple.message + ' displays message ' + messageTuple.title,
      function() {
        subject.displayMessage(messageTuple.message, '123');
        sinon.assert.calledWith(MockConfirmDialog.show, messageTuple.title,
                                {id: messageTuple.body, args: {number: '123'}});
      });
    });

    test('Invalid input message doesn\'t display anything', function() {
      subject.displayMessage('asdfghjkl');
      sinon.assert.notCalled(MockConfirmDialog.show);
    });

    suite('ConfirmDialog', function() {
      test('Calls ConfirmDialog.show() with correct args', function() {
        subject.displayMessage('BadNumber', '123');
        assert.equal(MockConfirmDialog.show.args[0][2].title,
                     'emergencyDialogBtnOk');
        assert.equal(typeof MockConfirmDialog.show.args[0][2].callback,
                     'function');
      });

      test('Clicking a button closes the ConfirmDialog', function() {
        this.sinon.spy(MockConfirmDialog, 'hide');

        subject.displayMessage('BadNumber', '123');
        MockConfirmDialog.show.args[0][2].callback();

        sinon.assert.calledOnce(MockConfirmDialog.hide);
      });
    });
  });

  suite('Error handling', function() {
    var expectedErrors = [
      {
        error: 'BadNumberError',
        message: 'BadNumber'
      },
      {
        error: 'DeviceNotAcceptedError',
        message: 'DeviceNotAccepted',
      },
      {
        error: 'RadioNotAvailable',
        message: 'FlightMode'
      },
      {
        error: 'BusyError',
        message: 'NumberIsBusy'
      },
      {
        error: 'OtherConnectionInUse',
        message: 'OtherConnectionInUse'
      },
      {
        error: 'OperatorDeterminedBarringError',
        message: 'OperatorDeterminedBarring'
      },
      {
        // This is not an actual type. It is the catch-all for unhandled errors.
        error: 'Unknown/unhandled error',
        message: 'UnableToCall'
      }
    ];

    setup(function() {
      this.sinon.spy(subject, 'displayMessage');
    });

    expectedErrors.forEach(function(errorTuple) {
      test(errorTuple.error + ' displays ' + errorTuple.message + ' error',
      function() {
        subject.handleError(errorTuple.error, '123', subject.REGULAR_CALL);
        sinon.assert.calledWith(subject.displayMessage, errorTuple.message);
      });
    });

    test('FDNBlockedError displays FixedDialingNumbers error', function() {
      subject.handleError('FDNBlockedError', '123', subject.REGULAR_CALL);
      sinon.assert.calledWith(
        subject.displayMessage, 'FixedDialingNumbers', '123');
    });

    test('FdnCheckFailure displays FixedDialingNumbers error', function() {
      subject.handleError('FdnCheckFailure', '123', subject.REGULAR_CALL);
      sinon.assert.calledWith(
        subject.displayMessage, 'FixedDialingNumbers', '123');
    });

    test('BusyError displays NumberIsBusy error', function() {
      subject.handleError('BusyError');
      sinon.assert.calledWith(subject.displayMessage, 'NumberIsBusy');
    });

    test('BadNumberError displays NoNetwork error (no network)', function() {
      subject.handleError('BadNumberError', '123', subject.NO_NETWORK);
      sinon.assert.calledWith(subject.displayMessage, 'NoNetwork');
    });

    test('BadNumberError displays EmergencyCallOnly error (emergency only)',
    function() {
      subject.handleError('BadNumberError', '123', subject.EMERGENCY_ONLY);
      sinon.assert.calledWith(subject.displayMessage, 'EmergencyCallOnly');
    });

    test('ModifiedDialError not displayed', function() {
      subject.handleError('ModifiedDialError');
      sinon.assert.notCalled(subject.displayMessage);
    });
  });
});
