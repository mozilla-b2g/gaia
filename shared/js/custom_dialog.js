//XXX: Waiting for the window.showModalDialog support in B2G

'use strict';

var CustomDialog = (function() {

  var screen = null;
  var dialog = null;
  var header = null;
  var message = null;
  var yes = null;
  var no = null;

  return {
    hide: function dialog_hide() {
      if (screen === null)
        return;

      document.body.removeChild(screen);
      screen = null;
      dialog = null;
      header = null;
      message = null;
      yes = null;
      no = null;
    },

    /**
    * Method that shows the dialog
    * @param  {String} title the title of the dialog. null or empty for
    *                        no title.
    * @param  {String} msg message for the dialog.
    * @param  {Object} cancel {title, callback} object when confirm.
    * @param  {Object} confirm {title, callback} object when cancel.
    */
    show: function dialog_show(title, msg, cancel, confirm) {
      if (screen === null) {
        screen = document.createElement('section');
        screen.setAttribute('role', 'region');
        screen.id = 'dialog-screen';

        dialog = document.createElement('div');
        dialog.id = 'dialog-dialog';
        dialog.setAttribute('role', 'dialog');
        screen.appendChild(dialog);

        var info = document.createElement('div');
        info.className = 'inner';

        if (title && title != '') {
          header = document.createElement('h3');
          header.id = 'dialog-title';
          header.textContent = title;
          info.appendChild(header);
        }

        message = document.createElement('p');
        message.id = 'dialog-message';
        info.appendChild(message);
        dialog.appendChild(info);

        var menu = document.createElement('menu');
        menu.dataset['items'] = 1;

        no = document.createElement('button');
        var noText = document.createTextNode(cancel.title);
        no.appendChild(noText);
        no.id = 'dialog-no';
        no.addEventListener('click', clickHandler);
        menu.appendChild(no);

        if (confirm) {
          menu.dataset['items'] = 2;
          yes = document.createElement('button');
          var yesText = document.createTextNode(confirm.title);
          yes.appendChild(yesText);
          yes.id = 'dialog-yes';
          yes.className = 'negative';
          yes.addEventListener('click', clickHandler);
          menu.appendChild(yes);
        }

        dialog.appendChild(menu);

        document.body.appendChild(screen);
      }

      // Put the message in the dialog.
      // Note plain text since this may include text from
      // untrusted app manifests, for example.
      message.textContent = msg;

      // Make the screen visible
      screen.classList.add('visible');

      // This is the event listener function for the buttons
      function clickHandler(evt) {

        // Hide the dialog
        screen.classList.remove('visible');

        // Call the appropriate callback, if it is defined
        if (evt.target === yes && confirm.callback) {
          confirm.callback();
        } else if (evt.target === no && cancel.callback) {
          cancel.callback();
        }
      }
    }
  };
}());

