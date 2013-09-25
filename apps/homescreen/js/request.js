
'use strict';

var ConfirmDialog = (function() {

  var dialog, titleElem, messageElem, cancelButton, confirmButton;

  var _ = navigator.mozL10n.get;

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

    showApp: function dialog_showApp(app) {
      var title, body, cancel = {
        title: _('cancel'),
        callback: ConfirmDialog.hide
      };

      var confirm = {
        callback: function onAccept() {
          ConfirmDialog.hide();
          if (app.type === GridItemsFactory.TYPE.COLLECTION ||
              app.type === GridItemsFactory.TYPE.BOOKMARK) {
            app.uninstall();
          } else {
            navigator.mozApps.mgmt.uninstall(app);
          }
        },
        applyClass: 'danger'
      };

      // Show a different prompt if the user is trying to remove
      // a bookmark shortcut instead of an app.
      var manifest = app.manifest || app.updateManifest;

      if (app.type === GridItemsFactory.TYPE.COLLECTION ||
          app.type === GridItemsFactory.TYPE.BOOKMARK) {
        title = _('remove-title-2', { name: manifest.name });
        body = _('remove-body', { name: manifest.name });
        confirm.title = _('remove');
      } else {
        // Make sure to get the localized name
        manifest = new ManifestHelper(manifest);
        title = _('delete-title', { name: manifest.name });
        body = _('delete-body', { name: manifest.name });
        confirm.title = _('delete');
      }

      this.show(title, body, cancel, confirm);
    },

    init: initialize
  };

}());
