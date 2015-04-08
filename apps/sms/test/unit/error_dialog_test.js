/*global Dialog,
   ErrorDialog,
   MockL10n,
   MocksHelper,
   Settings
*/
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');

require('/test/unit/mock_dialog.js');
require('/test/unit/mock_settings.js');

require('/js/dialog.js');
require('/js/error_dialog.js');

var mocksHelperForDialog = new MocksHelper([
  'Dialog',
  'Settings'
]).init();

suite('ErrorDialog', function() {
  // Silencing jshint complaints related to "new ErrorDialog(..)" invocations
  /*jshint nonew: false */
  var realL10n;

  mocksHelperForDialog.attachTestHelpers();

  setup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    this.sinon.spy(Dialog, 'call');
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('basic tests', function() {
    test('uses correct Dialog title, body and cancel button l10nIds',
      function() {
      var errorDescription = {
        prefix: 'TEST'
      };

      (new ErrorDialog(errorDescription));

      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: errorDescription.prefix + 'Title',
        body: errorDescription.prefix + 'Body',
        options: {
          cancel: {
            text: errorDescription.prefix + 'BtnOk'
          }
        },
        classes: ['error-dialog-' + errorDescription.prefix, 'error-dialog']
      });
    });

    test('throws if prefix is not passed', function() {
      assert.throws(function() {
        (new ErrorDialog({}));
      });
    });
  });

  suite('uses correct Dialog options', function() {
    test('confirm handler is not set, errorDescription.executeHandler is true',
    function() {
      var errorDescription = {
        prefix: 'TEST',
        executeHandler: true
      };

      (new ErrorDialog(errorDescription));

      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: sinon.match.any,
        options: {
          cancel: {
            text: errorDescription.prefix + 'BtnOk'
          }
        },
        classes: ['error-dialog-' + errorDescription.prefix, 'error-dialog']
      });
    });

    test('confirm handler is set, errorDescription.executeHandler is false',
    function() {
      var errorDescription = {
        prefix: 'TEST',
        executeHandler: false
      };
      var dialogOptions = { confirmHandler: () => {} };

      (new ErrorDialog(errorDescription, dialogOptions));

      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: sinon.match.any,
        options: {
          cancel: {
            text:  errorDescription.prefix + 'BtnOk'
          }
        },
        classes: ['error-dialog-' + errorDescription.prefix, 'error-dialog']
      });
    });

    test('confirm handler is set, errorDescription.executeHandler is true',
    function() {
      var errorDescription = {
        prefix: 'TEST',
        executeHandler: true
      };
      var dialogOptions = { confirmHandler: () => {} };

      (new ErrorDialog(errorDescription, dialogOptions));

      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: sinon.match.any,
        options: {
          cancel: {
            text: errorDescription.prefix + 'BtnOk'
          },
          confirm: {
            text: errorDescription.prefix + 'Confirm',
            method: dialogOptions.confirmHandler
          }
        },
        classes: ['error-dialog-' + errorDescription.prefix, 'error-dialog']
      });
    });
  });

  suite('respects errorDescription.showRecipient', function() {
    test('errorDescription.showRecipient is true, recipients array is set',
    function() {
      var errorDescription = {
        prefix: 'TEST',
        showRecipient: true
      };

      var dialogOptions = {
        recipients: ['111', '222', '333']
      };

      (new ErrorDialog(errorDescription, dialogOptions));

      var fragmentContainsBody = sinon.match((fragment) => {
        var body = fragment.querySelector('span');
        var expectedL10nId = errorDescription.prefix + 'Body';
        var hasL10nId = (body.dataset.l10nId === expectedL10nId);
        var expectedArgs = JSON.stringify(
          { n: dialogOptions.recipients.length }
        );
        var hasL10nArgs = (body.dataset.l10nArgs === expectedArgs);

        return hasL10nId && hasL10nArgs;
      }, 'fragment contains correct body');

      var fragmentContainsRecipients = sinon.match((fragment) => {
        var recipients = fragment.querySelector('ul');
        return dialogOptions.recipients.every((recipient, i) => {
          var li = recipients.children[i];
          return li.textContent === recipient;
        });
      }, 'fragment contains all recipients');

      var fragmentContainsBodyAndRecipients =
        sinon.match.instanceOf(DocumentFragment)
        .and(fragmentContainsBody)
        .and(fragmentContainsRecipients);

      var expectedClasses = [
        'error-dialog-TEST', 'error-dialog', 'error-dialog-show-recipient'
      ];

      sinon.assert.calledWithMatch(Dialog.call, sinon.match.any, {
        body: {
          raw: fragmentContainsBodyAndRecipients
        },
        classes: expectedClasses
      });
    });

    test('errorDescription.showRecipient is true, recipients array is not set',
    function() {
      var errorDescription = {
        prefix: 'TEST',
        showRecipient: true
      };

      assert.throws(function() {
        (new ErrorDialog(errorDescription));
      });
    });
  });

  suite('respects errorDescription.showDsdsStatus', function() {
    test('errorDescription.showDsdsStatus is true, SIM 1 is active',
    function() {
      var errorDescription = {
        prefix: 'TEST',
        showDsdsStatus: true
      };

      Settings.mmsServiceId = 0;

      (new ErrorDialog(errorDescription));
      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: {
          id: errorDescription.prefix + 'Body',
          args: {
            activeSimId: '1',
            nonActiveSimId: '2'
          }
        },
        options: sinon.match.any,
        classes: ['error-dialog-' + errorDescription.prefix, 'error-dialog']
      });
    });

    test('errorDescription.showDsdsStatus is true, SIM 2 is active',
    function() {
      var errorDescription = {
        prefix: 'TEST',
        showDsdsStatus: true
      };

      Settings.mmsServiceId = 1;

      (new ErrorDialog(errorDescription));
      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: {
          id: errorDescription.prefix + 'Body',
          args: {
            activeSimId: '2',
            nonActiveSimId: '1'
          }
        },
        options: sinon.match.any,
        classes: ['error-dialog-' + errorDescription.prefix, 'error-dialog']
      });
    });

    test('errorDescription.showDsdsStatus is false, any SIM is active',
    function() {
      var errorDescription = {
        prefix: 'TEST',
        showDsdsStatus: false
      };

      Settings.mmsServiceId = 0;

      (new ErrorDialog(errorDescription));
      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: errorDescription.prefix + 'Body',
        options: sinon.match.any,
        classes: ['error-dialog-' + errorDescription.prefix, 'error-dialog']
      });
    });

    test('errorDescription.showDsdsStatus is true, mmsServiceId is not valid',
    function() {
      var errorDescription = {
        prefix: 'TEST',
        showDsdsStatus: true
      };

      // No mmsServiceId available
      Settings.mmsServiceId = null;

      (new ErrorDialog(errorDescription));
      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: {
          id: errorDescription.prefix + 'Body',
          args: null
        },
        options: sinon.match.any,
        classes: ['error-dialog-' + errorDescription.prefix, 'error-dialog']
      });
      Dialog.call.reset();

      // Unknown mmsServiceId
      Settings.mmsServiceId = 2;

      (new ErrorDialog(errorDescription));
      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: {
          id: errorDescription.prefix + 'Body',
          args: null
        },
        options: sinon.match.any,
        classes: ['error-dialog-' + errorDescription.prefix, 'error-dialog']
      });
    });
  });
});
