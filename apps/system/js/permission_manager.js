/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const Ci = Components.interfaces;

var PermissionManager = (function() {
  var _ = navigator.mozL10n.get;

  window.addEventListener('mozChromeEvent', function pm_chromeEventHandler(e) {
    var detail = e.detail;
    switch (detail.type) {
      case 'permission-prompt':
        overlay.dataset.type = detail.permission;
        handlePermissionPrompt(detail);
        break;
      case 'cancel-permission-prompt':
        discardPermissionRequest();
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
      fullscreenRequest = requestPermission(message, '',
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
    // The app is certified o priviledged
    if ((detail.appType == Ci.nsIPrincipal.APP_STATUS_PRIVILEGED) ||
       (detail.appType == Ci.nsIPrincipal.APP_STATUS_CERTIFIED)) {
      str = _(permissionID + '-appRequest', { 'app': detail.appName }) +
            detail.description;//Added to show permissions description
    // The app is webapp
    } else if (detail.appType == Ci.nsIPrincipal.APP_STATUS_INSTALLED) {
      //Added to show permissions description with a warning about its origin
      //Comment next two lines if don't want to show description for webapps
      str = _(permissionID + '-appRequest', { 'app': detail.appName }) +
            'Provided by developer: ' + detail.description;
    } else { // Web content
      str = _(permissionID + '-webRequest', { 'site': detail.origin });
    }

    var moreInfoText = _(permissionID + '-more-info');

    requestPermission(str, moreInfoText, function pm_permYesCB() {
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
  var moreInfo = document.getElementById('permission-more-info');
  var moreInfoLink = document.getElementById('permission-more-info-link');
  var moreInfoBox = document.getElementById('permission-more-info-box');

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

    moreInfoLink.removeEventListener('click', clickHandler);
    moreInfo.classList.add('hidden');
  };

  // Show the next request, if we have one.
  var showNextPendingRequest = function() {
    if (pending.length == 0)
      return;
    var request = pending.shift();
    showPermissionPrompt(request.id,
                         request.message,
                         request.moreInfoText,
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
    } else if (evt.target === moreInfoLink) {
      moreInfoBox.classList.toggle('hidden');
      return;
    }
    hidePermissionPrompt();

    // Call the appropriate callback, if it is defined.
    if (callback)
      window.setTimeout(callback, 0);

    showNextPendingRequest();
  };

  var requestPermission = function(msg, moreInfoText,
                                   yescallback, nocallback) {
    var id = nextRequestID;
    nextRequestID = (nextRequestID + 1) % 1000000;

    if (currentRequestId != undefined) {
      // There is already a permission request being shown, queue this one.
      pending.push({
        id: id,
        message: msg,
        moreInfoText: moreInfoText,
        yescallback: yescallback,
        nocallback: nocallback
      });
      return id;
    }

    showPermissionPrompt(id, msg, moreInfoText, yescallback, nocallback);

    return id;
  };

  var showPermissionPrompt = function(id, msg, moreInfoText,
                                      yescallback, nocallback) {
    // Put the message in the dialog.
    // Note plain text since this may include text from
    // untrusted app manifests, for example.
    message.textContent = msg;

    if (moreInfoText) {
      // Show the "More info… " link.
      moreInfo.classList.remove('hidden');
      moreInfoLink.addEventListener('click', clickHandler);
      moreInfoBox.textContent = moreInfoText;
    }

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

  function discardPermissionRequest() {
    if (currentRequestId == undefined)
      return;

    dispatchResponse(currentRequestId, 'permission-deny', false);
    hidePermissionPrompt();
  };

  // On home/holdhome pressed, discard permission request.
  // XXX: We should make permission dialog be embededd in appWindow
  // Gaia bug is https://bugzilla.mozilla.org/show_bug.cgi?id=853711
  // Gecko bug is https://bugzilla.mozilla.org/show_bug.cgi?id=852013
  window.addEventListener('home', discardPermissionRequest);
  window.addEventListener('holdhome', discardPermissionRequest);

}());

