/*global Dialog,
   ErrorDialog,
   MocksHelper,
   Settings
*/
'use strict';

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

  mocksHelperForDialog.attachTestHelpers();

  setup(function() {
    this.sinon.spy(Dialog, 'call');
  });

  suite('basic tests', function() {
    test('uses correct Dialog title, body and cancel button l10nIds',
      function() {
      var errorDescription = {
        prefix: 'TEST'
      };

      (new ErrorDialog(errorDescription));

      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: {
          l10nId: errorDescription.prefix + 'Title'
        },
        body: {
          l10nId: errorDescription.prefix + 'Body',
          l10nArgs: null
        },
        options: {
          cancel: {
            text: {
              l10nId:  errorDescription.prefix + 'BtnOk'
            }
          }
        }
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
            text: {
              l10nId:  errorDescription.prefix + 'BtnOk'
            }
          }
        }
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
            text: {
              l10nId:  errorDescription.prefix + 'BtnOk'
            }
          }
        }
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
            text: {
              l10nId:  errorDescription.prefix + 'BtnOk'
            }
          },
          confirm: {
            text: {
              l10nId: errorDescription.prefix + 'Confirm'
            },
            method: dialogOptions.confirmHandler
          }
        }
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

      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: {
          l10nId: errorDescription.prefix + 'Body',
          l10nArgs: {
            n: dialogOptions.recipients.length,
            numbers: dialogOptions.recipients.join('<br />')
          }
        },
        options: sinon.match.any
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
          l10nId: errorDescription.prefix + 'Body',
          l10nArgs: {
            activeSimId: '1',
            nonActiveSimId: '2'
          }
        },
        options: sinon.match.any
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
          l10nId: errorDescription.prefix + 'Body',
          l10nArgs: {
            activeSimId: '2',
            nonActiveSimId: '1'
          }
        },
        options: sinon.match.any
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
        body: {
          l10nId: errorDescription.prefix + 'Body',
          l10nArgs: null
        },
        options: sinon.match.any
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
          l10nId: errorDescription.prefix + 'Body',
          l10nArgs: null
        },
        options: sinon.match.any
      });
      Dialog.call.reset();

      // Unknown mmsServiceId
      Settings.mmsServiceId = 2;

      (new ErrorDialog(errorDescription));
      sinon.assert.calledWith(Dialog.call, sinon.match.any, {
        title: sinon.match.any,
        body: {
          l10nId: errorDescription.prefix + 'Body',
          l10nArgs: null
        },
        options: sinon.match.any
      });
    });
  });
});
