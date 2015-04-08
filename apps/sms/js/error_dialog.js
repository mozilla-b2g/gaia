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
        text: prefix + 'BtnOk'
      }
    };

    if (options && options.confirmHandler && errorDescription.executeHandler) {
      dialogOptions.confirm = {
        text: prefix + 'Confirm',
        method: options.confirmHandler
      };
    }

    var bodyL10nId = prefix + 'Body';
    var body = null;
    var additionalClasses = [];

    if (errorDescription.showRecipient) {
      var fragment = document.createDocumentFragment();
      var mainText = document.createElement('span');
      navigator.mozL10n.setAttributes(
        mainText, bodyL10nId,
        { n: options.recipients.length }
      );
      fragment.appendChild(mainText);

      var list = options.recipients.reduce((list, recipient) => {
        var li = document.createElement('li');
        li.textContent = recipient;

        list.appendChild(li);

        return list;
      }, document.createElement('ul'));

      fragment.appendChild(list);
      body = { raw: fragment };
      additionalClasses.push('error-dialog-show-recipient');
    } else if (errorDescription.showDsdsStatus) {
      var messageBodyParams = null;

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

      body = {
        id: bodyL10nId,
        args: messageBodyParams
      };
    }

    Dialog.call(this, {
      title: prefix + 'Title',
      body: body || bodyL10nId,
      options: dialogOptions,
      classes: ['error-dialog-' + prefix, 'error-dialog', ...additionalClasses]
    });
  }

  ErrorDialog.prototype = Object.create(Dialog.prototype);

  exports.ErrorDialog = ErrorDialog;
}(this));
