
'use strict';

var Permissions = (function() {
  // A queue of pending requests.
  // Callers must be careful not to create an infinite loop!
  var pending = [];

  var screen = null;
  var dialog = null;
  var header = null;
  var message = null;
  var yes = null;
  var no = null;

  return {
    hide: function permissions_hide() {
      if (screen === null)
        return;

      document.body.removeChild(screen);
      screen = null;
      dialog = null;
      header = null;
      message = null;
      yes = null;
      no = null;
      pending = [];
    },

    show: function permissions_show(title, msg, yescallback, nocallback) {
      if (screen === null) {
        screen = document.createElement('div');
        screen.id = 'permission-screen';

        dialog = document.createElement('div');
        dialog.id = 'permission-dialog';
        screen.appendChild(dialog);

        header = document.createElement('p');
        header.id = 'permission-title';
        dialog.appendChild(header);

        message = document.createElement('p');
        message.id = 'permission-message';
        dialog.appendChild(message);

        no = document.createElement('button');
        no.appendChild(document.createTextNode('Cancel'));
        no.id = 'permission-no';
        dialog.appendChild(no);

        yes = document.createElement('button');
        yes.appendChild(document.createTextNode('Remove'));
        yes.id = 'permission-yes';
        dialog.appendChild(yes);

        document.body.appendChild(screen);
      }

      // If there is already a pending permission request, queue this one
      if (screen.classList.contains('visible')) {
        pending.push({
          header: title,
          message: msg,
          yescallback: yescallback,
          nocallback: nocallback
        });
        return;
      }

      // Put the message in the dialog.
      // Note plain text since this may include text from
      // untrusted app manifests, for example.
      header.textContent = title;
      message.textContent = msg;

      // Make the screen visible
      screen.classList.add('visible');
      // Put the dialog in the middle of the screen
      dialog.style.marginTop = -dialog.offsetHeight / 2 + 'px';

      // This is the event listener function for the buttons
      function clickHandler(evt) {
        // cleanup the event handlers
        yes.removeEventListener('click', clickHandler);
        no.removeEventListener('click', clickHandler);

        // Hide the dialog
        screen.classList.remove('visible');

        // Call the appropriate callback, if it is defined
        if (evt.target === yes && yescallback) {
          yescallback();
        } else if (evt.target === no && nocallback) {
          nocallback();
        }

        // And if there are pending permission requests, trigger the next one
        if (pending.length > 0) {
          var request = pending.shift();
          window.setTimeout(function() {
            Permissions.show(request.header,
                             request.message,
                             request.yescallback,
                             request.nocallback);
          });
        }
      }

      // Set event listeners for the yes and no buttons
      yes.addEventListener('click', clickHandler);
      no.addEventListener('click', clickHandler);
    }
  };
}());

