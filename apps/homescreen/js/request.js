
'use strict';

var ConfirmDialog = (function() {

  var dialog = document.getElementById('confirm-dialog');

  var titleElem = document.getElementById('confirm-dialog-title');
  var messageElem = document.getElementById('confirm-dialog-message');

  var cancelButton = document.getElementById('confirm-dialog-cancel-button');
  var confirmButton = document.getElementById('confirm-dialog-confirm-button');

  return {
    hide: function dialog_hide() {
      dialog.classList.remove('visible');
    },

    show: function dialog_show(title, msg, cancel, confirm) {
      titleElem.textContent = title;
      messageElem.textContent = msg;

      cancelButton.textContent = cancel.title;
      confirmButton.textContent = confirm.title;

      cancelButton.className = '';
      confirmButton.className = '';

      if (cancel.applyClass) {
        cancelButton.classList.add(cancel.applyClass);
      }
      if (confirm.applyClass) {
        confirmButton.classList.add(confirm.applyClass);
      }

      cancelButton.onclick = confirmButton.onclick = clickHandler;

      function clickHandler(evt) {
        evt.target === confirmButton ? confirm.callback() : cancel.callback();
        return false;
      }

      dialog.classList.add('visible');
    }
  };

}());
