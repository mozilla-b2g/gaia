/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
  Allow web apps to inject a tiny persistent background iframe
  as the phone starts.
*/
var BackgroundServiceManager = (function bsm() {
  /* We keep the references to background page iframes here.
    The iframes will be append to body */
  var frames = {};

  /* Init */
  window.addEventListener('applicationready', function bsm_init(evt) {
    var applications = evt.detail.applications;
    Object.keys(applications).forEach(open);
  });

  /* OnInstall */
  window.addEventListener('applicationinstall', function bsm_oninstall(evt) {
    var origin = evt.detail.application.origin;
    open(origin);
  });

  /* OnUninstall */
  window.addEventListener('applicationuninstall', function bsm_oninstall(evt) {
    var origin = evt.detail.application.origin;
    close(origin);
  });

  /* Check if the app has the permission to open a background page */
  var hasBackgroundPermission = function bsm_checkPermssion(app) {
    if (!app || !app.manifest.permissions ||
        app.manifest.permissions.indexOf('background') == -1) {
      return false;
    }
    return true;
  };

  /* The open function is responsible of containing the iframe */
  var open = function bsm_open(origin) {
    var app = Applications.getByOrigin(origin);
    if (!hasBackgroundPermission(app))
      return false;

    if (!app || !app.manifest.background_page)
      return false;

    var frame = document.createElement('iframe');
    frame.className = 'backgroundWindow';
    frame.setAttribute('mozbrowser', 'true');
    frame.setAttribute('mozapp', app.manifestURL);
    frame.src = origin + app.manifest.background_page;
    frames[origin] = frame;

    document.body.appendChild(frame);
    return true;
  };

  /* The close function will remove the iframe from DOM and
    delete the reference */
  var close = function bsm_close(origin) {
    var frame = frames[origin];
    if (!frame)
      return false;

    document.body.removeChild(frame);

    delete frames[origin];
    return true;
  };

  // Getting the window object reference of the background page. Unused.
  // We have no way to give the object reference to the the app iframe for now
  var getWindow = function bsm_getWindow(origin) {
    var frame = frames[origin];
    if (frame)
      return frame.contentWindow || null;
    return null;
  };

  /* Return the public APIs */
  return {
    'open': open,
    'close': close,
    'getWindow': getWindow
  };
}());

