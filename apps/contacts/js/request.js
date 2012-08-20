
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

    /**
    * Method that shows the dialog
    * @param  {String} title the title of the dialog. null or empty for
    *                        no title.
    * @param  {String} msg message for the dialog.
    * @param  {Object} yesObject {title, callback} object when confirm.
    * @param  {Object} noObject {title, callback} object when cancel.
    */
    show: function permissions_show(title, msg, yesObject, noObject) {
      if (screen === null) {
        screen = document.createElement('section');
        screen.setAttribute('role', 'region');
        screen.id = 'permission-screen';

        dialog = document.createElement('div');
        dialog.id = 'permission-dialog';
        dialog.setAttribute('role', 'dialog');
        screen.appendChild(dialog);

        var info = document.createElement('div');
        info.className = 'center';

        if (title && title != '') {
          header = document.createElement('h3');
          header.id = 'permission-title';
          header.textContent = title;
          info.appendChild(header);
        }

        message = document.createElement('p');
        message.id = 'permission-message';
        info.appendChild(message);
        dialog.appendChild(info);

        var menu = document.createElement('menu');
        menu.dataset['items'] = 2;

        yes = document.createElement('button');
        var yesText = document.createTextNode(yesObject.title);
        yes.appendChild(yesText);
        yes.id = 'permission-yes';
        yes.className = 'negative';

        no = document.createElement('button');
        var noText = document.createTextNode(noObject.title);
        no.appendChild(noText);
        no.id = 'permission-no';
        menu.appendChild(no);
        menu.appendChild(yes);
        dialog.appendChild(menu);

        document.body.appendChild(screen);
      }

      // If there is already a pending permission request, queue this one
      if (screen.classList.contains('visible')) {
        pending.push({
          header: title,
          message: msg,
          yesObject: yesObject,
          noObject: noObject
        });
        return;
      }

      // Put the message in the dialog.
      // Note plain text since this may include text from
      // untrusted app manifests, for example.
      message.textContent = msg;

      // Make the screen visible
      screen.classList.add('visible');

      // This is the event listener function for the buttons
      function clickHandler(evt) {
        // cleanup the event handlers
        yes.removeEventListener('click', clickHandler);
        no.removeEventListener('click', clickHandler);

        // Hide the dialog
        screen.classList.remove('visible');

        // Call the appropriate callback, if it is defined
        var yescallback = yesObject.callback;
        var nocallback = noObject.callback;
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
                             request.yesObject,
                             request.noObject);
          });
        }
      }

      // Set event listeners for the yes and no buttons
      yes.addEventListener('click', clickHandler);
      no.addEventListener('click', clickHandler);
    }
  };
}());

