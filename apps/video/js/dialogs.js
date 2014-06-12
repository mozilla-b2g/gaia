var Dialogs = {
  // show a confirm dialog
  confirm: function(options, onConfirm, onCancel) {
      LazyLoader.load('shared/style/confirm.css', function() {
      var dialog = $('confirm-dialog');
      var msgEle = $('confirm-msg');
      var cancelButton = $('confirm-cancel');
      var confirmButton = $('confirm-ok');
      // set up the dialog based on the options
      msgEle.textContent = options.message;
      cancelButton.textContent = options.cancelText ||
                                 navigator.mozL10n.get('cancel');
      confirmButton.textContent = options.confirmText ||
                                  navigator.mozL10n.get('ok');

      if (options.danger) {
        confirmButton.classList.add('danger');
      } else {
        confirmButton.classList.remove('danger');
      }

      // show the confirm dialog
      dialog.classList.remove('hidden');

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

      function close(ev) {
        dialog.classList.add('hidden');
        cancelButton.removeEventListener('click', onCancelClick);
        confirmButton.removeEventListener('click', onConfirmClick);
        ev.preventDefault();
        ev.stopPropagation();
        return false;
      }
    });
  }
};
