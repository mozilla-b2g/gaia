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
  },
  //
  // If id is null then hide the overlay. Otherwise, look up the localized
  // text for the specified id and display the overlay with that text.
  // Supported ids include:
  //
  //   nocard: no sdcard is installed in the phone
  //   pluggedin: the sdcard is being used by USB mass storage
  //   emptygallery: no pictures found
  //   scanning: scanning the sdcard for photo's, but none found yet
  //
  // Localization is done using the specified id with "-title" and "-text"
  // suffixes.
  //
  showOverlay: function(id) {
    LazyLoader.load('shared/style/confirm.css', function() {

      // hide any special elements
      $('overlay-camera-button').classList.add('hidden');
      $('overlay-cancel-button').classList.add('hidden');
      $('overlay-menu').classList.add('hidden');
      var title, text;
      var _ = navigator.mozL10n.get;
      switch (id) {
        case null:
          $('overlay').classList.add('hidden');
          return;
        case 'nocard':
          title = _('nocard3-title');
          text = _('nocard4-text');
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        case 'pluggedin':
          title = _('pluggedin2-title');
          text = _('pluggedin2-text');
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        case 'scanning':
          title = _('scanning-title');
          text = _('scanning-text');
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        case 'emptygallery':
          title = _(pendingPick ? 'emptygallery2-title-pick' :
                                  'emptygallery2-title');
          text = _('emptygallery2-text');
          $('overlay-menu').classList.remove('hidden');
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
          } else {
            $('overlay-camera-button').classList.remove('hidden');
          }
          break;
        case 'upgrade':
          title = _('upgrade-title');
          text = _('upgrade-text');
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        default:
          console.warn('Reference to undefined overlay', id);
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          return;
      }

      $('overlay-title').textContent = title;
      $('overlay-text').textContent = text;
      $('overlay').classList.remove('hidden');
    });
  }
};
