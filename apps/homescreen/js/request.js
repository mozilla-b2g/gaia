
'use strict';

var ConfirmDialog = (function() {

  var dialog, titleElem, messageElem, cancelButton, confirmButton;

  function initialize() {
    dialog = document.getElementById('confirm-dialog');

    titleElem = document.getElementById('confirm-dialog-title');
    messageElem = document.getElementById('confirm-dialog-message');

    cancelButton = document.getElementById('confirm-dialog-cancel-button');
    confirmButton = document.getElementById('confirm-dialog-confirm-button');
  }

  initialize();

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
    },

    init: initialize
  };

}());
