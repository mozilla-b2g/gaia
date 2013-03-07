/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PermissionManager = (function() {
  var _ = navigator.mozL10n.get;

  window.addEventListener('mozChromeEvent', function pm_chromeEventHandler(e) {
    var detail = e.detail;
    switch (detail.type) {
      case 'permission-prompt':
        overlay.dataset.type = detail.permission;
        handlePermissionPrompt(detail);
        break;
      case 'fullscreenoriginchange':
        delete overlay.dataset.type;
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
      var message =
        _('fullscreen-request', { 'origin': detail.fullscreenorigin });
      fullscreenRequest = requestPermission(message,
                                            /* yesCallback */ null,
                                            /* noCallback */ function() {
                                              document.mozCancelFullScreen();
                                            });
    }
  };

  var handlePermissionPrompt = function pm_handlePermissionPrompt(detail) {
    remember.checked = detail.remember ? true : false;
    var str = '';

    var permissionID = 'perm-' + detail.permission.replace(':', '-');
    if (detail.isApp) { // App
      str = _(permissionID + '-appRequest', { 'app': detail.appName });
    } else { // Web content
      str = _(permissionID + '-webRequest', { 'site': detail.origin });
    }

    requestPermission(str, function pm_permYesCB() {
      dispatchResponse(detail.id, 'permission-allow', remember.checked);
    }, function pm_permNoCB() {
      dispatchResponse(detail.id, 'permission-deny', remember.checked);
    });
  };

  var dispatchResponse = function pm_dispatchResponse(id, type, remember) {
    var event = document.createEvent('CustomEvent');
    remember = remember ? true : false;

    event.initCustomEvent('mozContentEvent', true, true, {
      id: id,
      type: type,
      remember: remember
    });
    window.dispatchEvent(event);
  };

  // A queue of pending requests. Callers of requestPermission() must be
  // careful not to create an infinite loop!
  var pending = [];

  // Div over in which the permission UI resides.
  var overlay = document.getElementById('permission-screen');
  var dialog = document.getElementById('permission-dialog');
  var message = document.getElementById('permission-message');

  // "Yes"/"No" buttons on the permission UI.
  var yes = document.getElementById('permission-yes');
  var no = document.getElementById('permission-no');

  // Remember the choice checkbox
  var remember = document.getElementById('permission-remember-checkbox');
  var rememberSection = document.getElementById('permission-remember-section');

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
                         request.nocallback);
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
                                   yescallback, nocallback) {
    var id = nextRequestID;
    nextRequestID = (nextRequestID + 1) % 1000000;

    if (currentRequestId != undefined) {
      // There is already a permission request being shown, queue this one.
      pending.push({
        id: id,
        message: msg,
        yescallback: yescallback,
        nocallback: nocallback
      });
      return id;
    }

    showPermissionPrompt(id, msg, yescallback, nocallback);

    return id;
  };

  var showPermissionPrompt = function(id, msg,
                                      yescallback, nocallback) {
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

  rememberSection.addEventListener('click', function onLabelClick() {
    remember.checked = !remember.checked;
  });

}());

