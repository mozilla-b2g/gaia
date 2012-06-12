/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var permission = (function(doc) {

  'use strict';

  // A queue of pending requests.
  // Callers must be careful not to create an infinite loop!
  var pending = [];

  var screen = null;
  var dialog = null;
  var title = null;
  var message = null;
  var yes = null;
  var no = null;

  return {
    destroy: function() {
      if (screen !== null) {
        doc.body.removeChild(screen);
        screen = null;
        dialog = null;
        title = null;
        message = null;
        yes = null;
        no = null;
        pending = [];
      }
    },

    request: function (tit, msg, yescallback, nocallback) {
      if (screen === null) {
        screen = doc.createElement('div');
        screen.id = 'permission-screen';

        dialog = doc.createElement('div');
        dialog.id = 'permission-dialog';
        screen.appendChild(dialog);

        title = doc.createElement('p');
        title.id = 'permission-title';
        dialog.appendChild(title);

        message = doc.createElement('p');
        message.id = 'permission-message';
        dialog.appendChild(message);

        no = doc.createElement('button');
        no.appendChild(doc.createTextNode('Cancel'));
        no.id = 'permission-no';
        dialog.appendChild(no);

        yes = doc.createElement('button');
        yes.appendChild(doc.createTextNode('Remove'));
        yes.id = 'permission-yes';
        dialog.appendChild(yes);

        doc.body.appendChild(screen);
      }

      // If there is already a pending permission request, queue this one
      if (screen.classList.contains('visible')) {
        pending.push({
          title: tit,
          message: msg,
          yescallback: yescallback,
          nocallback: nocallback
        });
        return;
      }

      // Put the message in the dialog.
      // Note plain text since this may include text from
      // untrusted app manifests, for example.
      title.textContent = tit;
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
            requestPermission(request.title,
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
  }
}(document));
