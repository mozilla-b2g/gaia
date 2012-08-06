/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PermissionManager = (function() {
  window.addEventListener('mozChromeEvent', function pm_chromeEventHandler(e) {
    var detail = e.detail;
    switch (detail.type) {
      case 'webapps-ask-install':
        handleInstallationPrompt(detail);
        break;
      case 'permission-prompt':
        handlePermissionPrompt(detail);
        break;
      case 'fullscreenoriginchange':
        handleFullscreenOriginChange(detail);
        break;
    }
  });

  var fullscreenRequest = null;

  // Add a listener to ensure that we cancel a fullscreen permission
  // prompt if we exit fullscreen before the user has approved/denied
  // fullscreen. This can happen if the user presses the HOME key,
  // or script can call document.mozCancelFullScreen() directly.
  document.addEventListener('mozfullscreenchange', function(e) {
    if (document.mozFullScreenElement == null && fullscreenRequest)
      cancelRequest(fullscreenRequest);
  });

  var handleFullscreenOriginChange = function(detail) {
    // If there's already a fullscreen request visible, cancel it,
    // we'll show the request for the new domain.
    if (fullscreenRequest != null) {
      cancelRequest(fullscreenRequest);
      fullscreenRequest = null;
    }
    if (detail.fullscreenorigin != WindowManager.getDisplayedApp()) {
      // The message to be displayed on the approval UI.
      var message = detail.fullscreenorigin + ' is now fullscreen';
      requestPermission(message,
                        /* yesCallback */ null,
                        /* noCallback */ function() {
                          document.mozCancelFullScreen();
                        },
                        'OK',
                        'Cancel');
      fullscreenRequest = message;
    }
  };

  var handlePermissionPrompt = function pm_handlePermissionPrompt(detail) {
    // XXX are going to l10n the permissions name/messages?
    requestPermission(detail.permission, function pm_permYesCB() {
      dispatchResponse(detail.id, 'permission-allow');
    }, function pm_permNoCB() {
      dispatchResponse(detail.id, 'permission-deny');
    });
  };

  var handleInstallationPrompt = function pm_handleInstallationPrompt(detail) {
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

    requestPermission(str, function pm_installYesCB() {
      dispatchResponse(detail.id, 'webapps-install-granted');
    }, function pm_installNoCB() {
      dispatchResponse(detail.id, 'webapps-install-denied');
    });
  };

  var dispatchResponse = function pm_dispatchResponse(id, type) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      id: id,
      type: type
    });
    window.dispatchEvent(event);
  };

  // A queue of pending requests. Callers of requestPermission() must be
  // careful not to create an infinite loop!
  var pending = [];

  // Div over in which the permission UI resides.
  var screen = null;
  var dialog = null;
  var message = null;

  // "Yes"/"No" buttons on the permission UI.
  var yes = null;
  var no = null;

  // This is the event listener function for the yes/no buttons.
  function clickHandler(evt) {
    // Hide the permission UI.
    screen.classList.remove('visible');

    // Call the appropriate callback, if it is defined.
    if (evt.target === yes && yes.callback) {
      yes.callback();
    } else if (evt.target === no && no.callback) {
      no.callback();
    }

    // Note, we must remove the click listeners after running the callback,
    // as cleanupClickHandlers clears {yes,no}.callback.
    cleanupClickHandlers();

    // Show the next request, if we have one.
    if (pending.length > 0) {
      request = pending.shift();
      window.setTimeout(function() {
        requestPermission(request.message,
                          request.yescallback,
                          request.nocallback,
                          request.yesText,
                          request.noText);
      });
    }
  }

  var requestPermission = function requestPermission(msg, yescallback, nocallback, yesText, noText) {
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
      yes.appendChild(document.createTextNode(yesText ? yesText : 'Yes'));
      yes.id = 'permission-yes';
      dialog.appendChild(yes);

      no = document.createElement('button');
      no.appendChild(document.createTextNode(noText ? noText : 'No'));
      no.id = 'permission-no';
      dialog.appendChild(no);

      document.body.appendChild(screen);
    }

    // If there is already a pending permission request, queue this one
    if (screen.classList.contains('visible')) {
      pending.push({
        message: message,
        yescallback: yescallback,
        nocallback: nocallback,
        yesText: yesText,
        noText: noText
      });
      return;
    }

    // Put the message in the dialog.
    // Note plain text since this may include text from
    // untrusted app manifests, for example.
    message.textContent = msg;

    // Make the screen visible
    screen.classList.add('visible');

    // Set event listeners for the yes and no buttons
    yes.addEventListener('click', clickHandler);
    yes.callback = yescallback;

    no.addEventListener('click', clickHandler);
    no.callback = nocallback;
  };

  var cleanupClickHandlers = function() {
    // Cleanup the event handlers.
    yes.removeEventListener('click', clickHandler);
    yes.callback = null;
    no.removeEventListener('click', clickHandler);
    no.callback = null;
  };

  // Cancels a request with a specfied message. Request can either be
  // currently showing, or pending. If there are further pending requests,
  // those are shown.
  var cancelRequest = function(message) {
    // Hide the permission UI.
    screen.classList.remove('visible');
    cleanupClickHandlers();
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].message === message) {
        pending.splice(i, 1);
        if (pending.length > 0) {
          // We still have a pending request, show that next.
          var request = pending[0];
          window.setTimeout(function() {
            requestPermission(request.message,
                              request.yescallback,
                              request.nocallback,
                              request.yesText,
                              request.noText);
          });
        }
        break;
      }
    }
  };

  return {
    requestPermission: requestPermission,
  };
}());

