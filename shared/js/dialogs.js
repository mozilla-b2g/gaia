/* jshint unused: true */
/* global LazyLoader, $ */
/* exported Dialogs */

'use strict';

var Dialogs = {
  // show a confirm dialog
  confirm: function(options, onConfirm, onCancel) {
    LazyLoader.load('shared/style/confirm.css', function() {
      var dialog = $('confirm-dialog');
      var msgEle = $('confirm-msg');
      var cancelButton = $('confirm-cancel');
      var confirmButton = $('confirm-ok');

      /*
       * this function handles the logic for adding the correct text
       * to `element` given option fields prefixed with `prefix`
       * failing to find an option, `defaultId` will be added if it exists
       */
      var addText = function (element, prefix, defaultId) {
        if (options[prefix + 'Id']) {
          navigator.mozL10n.setAttributes(
            element,
            options[prefix + 'Id'],
            options[prefix + 'Args'] //may be undefined but will still work
          );
        }
        else if (options[prefix] || options[prefix + 'Text']) {
          var textOption = options[prefix] || options[prefix + 'Text'];
          element.textContent = textOption;
        }
        else if (defaultId) {
          element.setAttribute('data-l10n-id', defaultId);
        }
      };

      // set up the dialog based on the options
      addText(msgEle, 'message');
      addText(cancelButton, 'cancel', 'cancel');
      addText(confirmButton, 'confirm', 'ok');

      if (options.danger) {
        confirmButton.classList.add('danger');
      } else {
        confirmButton.classList.remove('danger');
      }

      // If the caller specified a bodyClass, add that to the classList of the
      // body element. This can be used for accessibility, e.g., to hide the
      // main document while a dialog is shown
      if (options.bodyClass) {
        document.body.classList.add(options.bodyClass);
      }

      // show the confirm dialog
      dialog.classList.remove('hidden');

      function close(ev) {
        if (options.bodyClass) {
          document.body.classList.remove(options.bodyClass);
        }
        dialog.classList.add('hidden');
        cancelButton.removeEventListener('click', onCancelClick);
        confirmButton.removeEventListener('click', onConfirmClick);
        ev.preventDefault();
        ev.stopPropagation();
        return false;
      }

      // attach event handlers
      var onCancelClick = function(ev) {
        close(ev);
        if (onCancel) {
          onCancel();
        }
        return false;
      };
      var onConfirmClick = function(ev) {
        close(ev);
        if (onConfirm) {
          onConfirm();
        }
        return false;
      };
      cancelButton.addEventListener('click', onCancelClick);
      confirmButton.addEventListener('click', onConfirmClick);

    });
  }
};
