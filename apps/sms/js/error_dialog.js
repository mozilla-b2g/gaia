/*global Dialog, Settings*/

/* exported ErrorDialog */

(function(exports) {
  'use strict';
  /*
   Error confirm screen. Handling all the message error code and corresponding
   description/behavior.

   Options object can contain the following properties:
     * recipients: ['foo', 'bar'] - to show the recipient information, used only
       if errorDescription.showRecipient is equal to "true";
     * confirmHandler: function() - to be executed if user selects confirm
       action in the error dialog, used only if errorDescription.executeHandler
       is equal to "true".
   }
  */
  function ErrorDialog(errorDescription, options) {
    var prefix = errorDescription.prefix;

    if (!prefix) {
      throw new Error('Prefix is required!');
    }

    var dialogOptions = {
      cancel: {
        text: {
          l10nId: prefix + 'BtnOk'
        }
      }
    };

    if (options && options.confirmHandler && errorDescription.executeHandler) {
      dialogOptions.confirm = {
        text: {
          l10nId: prefix + 'Confirm'
        },
        method: options.confirmHandler
      };
    }

    var messageBodyParams = null;
    if (errorDescription.showRecipient) {
      messageBodyParams = {
        n: options.recipients.length,
        numbers: options.recipients.join('<br />')
      };
    }

    if (errorDescription.showDsdsStatus) {
      var mmsServiceId = Settings.mmsServiceId;
      if (mmsServiceId !== null) {
        // mmsServiceId = 0 => default Service is SIM 1
        // mmsServiceId = 1 => default Service is SIM 2

        switch (mmsServiceId) {
          case 0:
            messageBodyParams = {
              activeSimId: '1',
              nonActiveSimId: '2'
            };
            break;
          case 1:
            messageBodyParams = {
              activeSimId: '2',
              nonActiveSimId: '1'
            };
            break;
          default:
            console.error(
              'MMS ServiceId(' + mmsServiceId + ') is not matched!'
            );
        }
      } else {
        console.error('Settings unavailable');
      }
    }

    Dialog.call(this, {
      title: {
        l10nId: prefix + 'Title'
      },
      body: {
        l10nId: prefix + 'Body',
        l10nArgs: messageBodyParams
      },
      options: dialogOptions
    });
  }

  ErrorDialog.prototype = Object.create(Dialog.prototype);

  exports.ErrorDialog = ErrorDialog;
}(this));
