/* jshint unused: true */
/* global LazyLoader, $, pendingPick */
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

      // show the confirm dialog
      dialog.classList.remove('hidden');

      function close(ev) {
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
      switch (id) {
        case null:
          $('overlay').classList.add('hidden');
          return;
        case 'nocard':
          title = 'nocard3-title';
          text = 'nocard4-text';
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        case 'pluggedin':
          title = 'pluggedin2-title';
          text = 'pluggedin2-text';
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        case 'scanning':
          title = 'scanning-title';
          text = 'scanning-text';
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        case 'emptygallery':
          title = pendingPick ? 'emptygallery2-title-pick' :
                                'emptygallery2-title';
          text = 'emptygallery2-text';
          $('overlay-menu').classList.remove('hidden');
          if (pendingPick) {
            $('overlay-cancel-button').classList.remove('hidden');
          } else {
            $('overlay-camera-button').classList.remove('hidden');
          }
          break;
        case 'upgrade':
          title = 'upgrade-title';
          text = 'upgrade-text';
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

      $('overlay-title').setAttribute('data-l10n-id', title);
      $('overlay-text').setAttribute('data-l10n-id', text);
      $('overlay').classList.remove('hidden');
    });
  }

};
