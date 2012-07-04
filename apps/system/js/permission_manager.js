/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function PermissionManager() {
  window.addEventListener('mozChromeEvent', function handleWebappInstall(evt) {
    var detail = evt.detail;
    if (detail.type !== 'webapps-ask-install')
      return;

    // This is how we say yes or no to the request after the user decides
    var self = this;
    function sendResponse(id, allow) {

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, {
        id: id,
        type: allow ? 'webapps-install-granted' : 'webapps-install-denied'
      });
      window.dispatchEvent(event);
    }

    var app = detail.app;
    if (document.location.toString().indexOf(app.installOrigin) == 0) {
      sendResponse(detail.id, true);
      return;
    }

    var name = app.manifest.name;
    var locales = app.manifest.locales;
    var lang = navigator.language;
    if (locales && locales[lang] && locales[lang].name)
      name = locales[lang].name;

    var str = navigator.mozL10n.get('install', {
      'name': name, 'origin': app.origin
    });
    requestPermission(str, function() { sendResponse(detail.id, true); },
                           function() { sendResponse(detail.id, false); });
  });

  var requestPermission = (function() {
    // A queue of pending requests.
    // Callers must be careful not to create an infinite loop!
    var pending = [];

    var screen = null;
    var dialog = null;
    var message = null;
    var yes = null;
    var no = null;

    return function requestPermission(msg, yescallback, nocallback) {
      if (screen === null) {
        screen = document.createElement('div');
        screen.id = 'permission-screen';

        dialog = document.createElement('div');
        dialog.id = 'permission-dialog';
        screen.appendChild(dialog);

        message = document.createElement('div');
        message.id = 'permission-message';
        dialog.appendChild(message);

        yes = document.createElement('button');
        yes.appendChild(document.createTextNode('Yes'));
        yes.id = 'permission-yes';
        dialog.appendChild(yes);

        no = document.createElement('button');
        no.appendChild(document.createTextNode('No'));
        no.id = 'permission-no';
        dialog.appendChild(no);

        document.body.appendChild(screen);
      }

      // If there is already a pending permission request, queue this one
      if (screen.classList.contains('visible')) {
        pending.push({
          message: message,
          yescallback: yescallback,
          nocallback: nocallback
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
        if (evt.target === yes && yescallback) {
          yescallback();
        } else if (evt.target === no && nocallback) {
          nocallback();
        }

        // And if there are pending permission requests, trigger the next one
        if (pending.length > 0) {
          var request = pending.shift();
          window.setTimeout(function() {
            requestPermission(request.message,
                              request.yescallback,
                              request.nocallback);
          });
        }
      }

      // Set event listeners for the yes and no buttons
      yes.addEventListener('click', clickHandler);
      no.addEventListener('click', clickHandler);
    };
  }());
})();


