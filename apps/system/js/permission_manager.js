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

  var fullscreenRequest = undefined;

  var handleFullscreenOriginChange = function(detail) {
    // If there's already a fullscreen request visible, cancel it,
    // we'll show the request for the new domain.
    if (fullscreenRequest != undefined) {
      cancelRequest(fullscreenRequest);
      fullscreenRequest = undefined;
    }
    if (detail.fullscreenorigin != WindowManager.getDisplayedApp()) {
      // The message to be displayed on the approval UI.
      var message = detail.fullscreenorigin + ' is now fullscreen';
      fullscreenRequest = requestPermission(message,
                                            /* yesCallback */ null,
                                            /* noCallback */ function() {
                                              document.mozCancelFullScreen();
                                            },
                                            'OK',
                                            'Cancel');
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
  var overlay = null;
  var dialog = null;
  var message = null;

  // "Yes"/"No" buttons on the permission UI.
  var yes = null;
  var no = null;

  // The ID of the next permission request. This is incremented by one
  // on every request, modulo some large number to prevent overflow problems.
  var nextRequestID = 0;

  // The ID of the request currently visible on the screen. This has the value
  // "undefined" when there is no request visible on the screen.
  var currentRequestId = undefined;

  var hidePermissionPrompt = function() {
    overlay.classList.remove('visible');
    currentRequestId = undefined;
    // Cleanup the event handlers.
    yes.removeEventListener('click', clickHandler);
    yes.callback = null;
    no.removeEventListener('click', clickHandler);
    no.callback = null;
  };

  // Show the next request, if we have one.
  var showNextPendingRequest = function() {
    if (pending.length == 0)
      return;
    var request = pending.shift();
    showPermissionPrompt(request.id,
                         request.message,
                         request.yescallback,
                         request.nocallback,
                         request.yesText,
                         request.noText);
  };

  // This is the event listener function for the yes/no buttons.
  var clickHandler = function(evt) {
    var callback = null;
    if (evt.target === yes && yes.callback) {
      callback = yes.callback;
    } else if (evt.target === no && no.callback) {
      callback = no.callback;
    }
    hidePermissionPrompt();

    // Call the appropriate callback, if it is defined.
    if (callback)
      window.setTimeout(callback, 0);

    showNextPendingRequest();
  };

  var requestPermission = function(msg,
                                   yescallback, nocallback,
                                   yesText, noText) {
    var id = nextRequestID;
    nextRequestID = (nextRequestID + 1) % 1000000;

    if (currentRequestId != undefined) {
      // There is already a permission request being shown, queue this one.
      pending.push({
        id: id,
        message: msg,
        yescallback: yescallback,
        nocallback: nocallback,
        yesText: yesText,
        noText: noText
      });
      return id;
    }

    showPermissionPrompt(id, msg, yescallback, nocallback, yesText, noText);

    return id;
  };

  var showPermissionPrompt = function(id, msg,
                                      yescallback, nocallback,
                                      yesText, noText) {
    if (overlay === null) {
      overlay = document.createElement('div');
      overlay.id = 'permission-screen';
      overlay.dataset.zIndexLevel = 'permission-screen';

      dialog = document.createElement('div');
      dialog.id = 'permission-dialog';
      overlay.appendChild(dialog);

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

      // Note that 'overlay' needs to be the last child in 'screen' otherwise
      // its zIndex value won't override the zIndex value of the element
      // before it in the DOM, i.e. the permission prompt won't appear over
      // top of the fullscreen window!
      document.getElementById('screen').appendChild(overlay);
    }

    // Put the message in the dialog.
    // Note plain text since this may include text from
    // untrusted app manifests, for example.
    message.textContent = msg;

    currentRequestId = id;

    // Make the screen visible
    overlay.classList.add('visible');

    // Set event listeners for the yes and no buttons
    yes.addEventListener('click', clickHandler);
    yes.callback = yescallback;

    no.addEventListener('click', clickHandler);
    no.callback = nocallback;
  };

  // Cancels a request with a specfied id. Request can either be
  // currently showing, or pending. If there are further pending requests,
  // the next is shown.
  var cancelRequest = function(id) {
    if (currentRequestId === id) {
      // Request is currently being displayed. Hide the permission prompt,
      // and show the next request, if we have any.
      hidePermissionPrompt();
      showNextPendingRequest();
    } else {
      // The request is currently not being displayed. Search through the
      // list of pending requests, and remove it from the list if present.
      for (var i = 0; i < pending.length; i++) {
        if (pending[i].id === id) {
          pending.splice(i, 1);
          break;
        }
      }
    }
  };

}());

