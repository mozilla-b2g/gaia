
'use strict';

/* global UrlHelper */
/* exported EditDialog */

var EditDialog = (function() {
  var dialog, cancelButton, doneButton, form, nameField, urlField;

  function hide() {
    cancelButton.onclick = doneButton.onclick = null;
    form.removeEventListener('input', updateDoneButton);

    var classList = dialog.classList;
    if (classList.contains('show')) {
      dialog.addEventListener('transitionend', function hidden() {
        dialog.removeEventListener('transitionend', hidden);
        classList.remove('visible');
      });

      classList.remove('show');
    }
  }

  function show(icon) {
    dialog = document.getElementById('edit-dialog');
    cancelButton = document.getElementById('edit-dialog-cancel');
    doneButton = document.getElementById('edit-dialog-done');
    doneButton.disabled = true;
    form = document.querySelector('#edit-dialog form');
    nameField = document.getElementById('edit-dialog-name');
    urlField = document.getElementById('edit-dialog-url');

    nameField.value = icon.getName();
    urlField.value = icon.getURL();

    var classList = dialog.classList;
    classList.add('visible');

    window.setTimeout(function animate() {
      dialog.addEventListener('transitionend', function displayed() {
        dialog.removeEventListener('transitionend', displayed);
        cancelButton.onclick = hide;
        doneButton.onclick = save.bind(null, icon);
        form.addEventListener('input', updateDoneButton);
      });
      classList.add('show');
    }); // Give the opportunity to paint the UI
  }

  function updateDoneButton() {
    // Done button is disabled when some field is empty or it is an invalid URL
    var name = nameField.value.trim();
    var url = urlField.value.trim();
    doneButton.disabled = name === '' || url === '' || UrlHelper.isNotURL(url);
  }

  function save(icon) {
    icon.setName(nameField.value);
    icon.setURL(urlField.value);

    // Ev.me listens for changes on the URL or name
    window.dispatchEvent(new CustomEvent('appInstalled', {
      'detail': {
        'app': icon.app
      }
    }));
    hide();
  }

  return {
    hide: hide,

    show: show
  };

}());
