
'use strict';

var ConfirmDialog = (function() {

  var dialog, titleElem, appIcon, messageElem, cancelButton, cancelButton2, cancelButton3, confirmButton;

  var image, blob;

  var _ = navigator.mozL10n.get;

  function initialize() {
    dialog = document.getElementById('confirm-dialog');

    titleElem = document.getElementById('confirm-dialog-title');
    //messageElem = document.getElementById('confirm-dialog-message');
    appIcon = document.getElementById('app_icon')

    cancelButton = document.getElementById('confirm-dialog-cancel-button');
    cancelButton2 = document.getElementById('confirm-dialog-cancel-button2');
	  cancelButton3 = document.getElementById('confirm-dialog-cancel-button3');
    confirmButton = document.getElementById('confirm-dialog-confirm-button');
  }

  initialize();

  return {
    hide: function dialog_hide() {
      cancelButton.onclick = confirmButton.onclick = null;

      var classList = dialog.classList;
      if (classList.contains('show')) {
        dialog.addEventListener('transitionend', function transitionend() {
          dialog.removeEventListener('transitionend', transitionend);
          classList.remove('visible');
        });
        classList.remove('show');
      }
    },

    show: function dialog_show(title, msg, cancel, confirm, icon) {

	  //Make sure send app to dialog is hidden at first.
	  document.getElementById('app_manage').style.display='block';
	  document.getElementById('send_manage').style.display='none';

	  //Slice "remove" or "delete" from the dialog title
	  title = title.slice(7);

      titleElem.textContent = title;

      IconRetriever.get({
        icon: icon,
        success: function(blob) {
          appIcon.innerHTML = "";
          image = new Image();
          image.src = window.URL.createObjectURL(blob);
          appIcon.appendChild(image);
          window.asyncStorage.setItem('sendingIcon', image.src); 
        },
        error: function(){
          return false;
        }
      });

      //messageElem.textContent = msg;

      cancelButton.textContent = cancel.title;
      confirmButton.textContent = confirm.title;

      //cancelButton.className = '';
      //confirmButton.className = '';

      if (cancel.applyClass) {
        cancelButton.classList.add(cancel.applyClass);
      }
      if (confirm.applyClass) {
        confirmButton.classList.add(confirm.applyClass);
      }

      cancelButton.onclick = cancelButton2.onclick = cancelButton3.onclick = confirmButton.onclick = clickHandler;

      function clickHandler(evt) {
        evt.target === confirmButton ? confirm.callback() : cancel.callback();
        return false;
      }

      dialog.classList.add('visible');
      setTimeout(function animate() {
        dialog.addEventListener('transitionend', function transitionend() {
          dialog.removeEventListener('transitionend', transitionend);
          cancelButton.onclick = confirmButton.onclick = clickHandler;
        });
        dialog.classList.add('show');
      }, 50); // Give the opportunity to paint the UI component
    },

    showApp: function dialog_showApp(icon) {
      var title, body, app = icon.app;

      var cancel = {
        title: _('cancel'),
        callback: function onCancel() {
          ConfirmDialog.hide();
          var evt = new CustomEvent('confirmdialog', {
            'detail': {
              'action': 'cancel',
              'app': app
            }
          });
          window.dispatchEvent(evt);
        }
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

          var evt = new CustomEvent('confirmdialog', {
            'detail': {
              'action': 'confirm',
              'app': app
            }
          });
          window.dispatchEvent(evt);
        },
        applyClass: 'danger'
      };

      // Show a different prompt if the user is trying to remove
      // a bookmark shortcut instead of an app.
      var nameObj = {
        name: icon.getName()
      };

      if (app.type === GridItemsFactory.TYPE.COLLECTION ||
          app.type === GridItemsFactory.TYPE.BOOKMARK) {
        title = _('remove-title-2', nameObj);
        body = _('remove-body', nameObj);
        confirm.title = _('remove');
      } else {
        // Make sure to get the localized name
        title = _('delete-title', nameObj);
        body = _('delete-body', nameObj);
        confirm.title = _('delete');
      }

      this.show(title, body, cancel, confirm, icon);
    },

    init: initialize
  };

}());
