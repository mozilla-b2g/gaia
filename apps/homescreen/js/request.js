
'use strict';

var UninstallDialog = (function() {

  var dialog = document.getElementById('delete-dialog');

  var titleElem = document.getElementById('delete-dialog-title');
  var messageElem = document.getElementById('delete-dialog-message');

  var cancelButton = document.getElementById('delete-dialog-cancel-button');
  var confirmButton = document.getElementById('delete-dialog-confirm-button');

  return {
    hide: function dialog_hide() {
      dialog.classList.remove('visible');
    },

    show: function dialog_show(title, msg, cancel, confirm) {
      titleElem.textContent = title;
      messageElem.textContent = msg;

      cancelButton.textContent = cancel.title;
      confirmButton.textContent = confirm.title;

      cancelButton.onclick = confirmButton.onclick = clickHandler;

      function clickHandler(evt) {
        evt.target === confirmButton ? confirm.callback() : cancel.callback();
        return false;
      }

      dialog.classList.add('visible');
    }
  };

}());
