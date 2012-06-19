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

  /* The name of the background window open by background_page in
    manifest. */
  var AUTO_OPEN_BG_PAGE_NAME = 'background';

  /* Init */
  window.addEventListener('applicationready', function bsm_init(evt) {
    var applications = evt.detail.applications;
    Object.keys(applications).forEach(function bsm_each(origin) {
      if (!applications[origin].manifest.background_page)
        return;

      // XXX: this work as if background_page is always a path not a full URL.
      var url = origin + applications[origin].manifest.background_page;
      open(origin, AUTO_OPEN_BG_PAGE_NAME, url);
    });
  });

  /* mozbrowseropenwindow */
  window.addEventListener('mozbrowseropenwindow', function bsm_winopen(evt) {
    if (evt.detail.features !== 'background')
      return;

    // preventDefault means "we're handling this popup; let it through."
    evt.preventDefault();
    // stopPropagation means we are not allowing
    // Popup Manager to handle this event
    evt.stopPropagation();

    // XXX: this is sad. Getting origin from manifest URL.
    var manifestURL = evt.target.getAttribute('mozapp');
    var origin = manifestURL.substr(0, manifestURL.indexOf('/'));

    var frame = open(origin, evt.detail.name, evt.detail.url);
    if (frame)
      evt.detail.frameElement = frame;
  }, true);

  /* mozbrowserclose */
  window.addEventListener('mozbrowserclose', function bsm_winclose(evt) {
    if (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'background')
      return;

    close(evt.target.dataset.frameOrigin, evt.target.dataset.frameName);
  }, true);

  /* OnInstall */
  window.addEventListener('applicationinstall', function bsm_oninstall(evt) {
    var app = evt.detail.application;
    var origin = app.origin;
    if (!app.manifest.background_page)
      return;

    // XXX: this work as if background_page is always a path not a full URL.
    var url = origin + app.manifest.background_page;
    open(origin, AUTO_OPEN_BG_PAGE_NAME, url);
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
  var open = function bsm_open(origin, name, url) {
    var app = Applications.getByOrigin(origin);
    if (!app || !hasBackgroundPermission(app))
      return false;

    if (frames[origin] && frames[origin][name])
      return frames[origin][name];

    var frame = document.createElement('iframe');
    frame.className = 'backgroundWindow';
    frame.setAttribute('mozbrowser', 'true');
    frame.setAttribute('mozapp', app.manifestURL);
    frame.src = url;
    frame.dataset.frameType = 'background';
    frame.dataset.frameName = name;
    frame.dataset.frameOrigin = origin;

    if (!frames[origin])
      frames[origin] = {};
    frames[origin][name] = frame;

    document.body.appendChild(frame);
    return frames[origin][name];
  };

  /* The close function will remove the iframe from DOM and
    delete the reference */
  var close = function bsm_close(origin, name) {
    if (!frames[origin])
      return false;

    if (typeof name == 'undefined') {
      // Close all windows
      Object.keys(frames[origin]).forEach(function closeEach(name) {
        document.body.removeChild(frames[origin][name]);
        frames[origin][name] = null;
      });
      delete frames[origin];
      return true;
    }

    // Close one window
    var frame = frames[origin][name];
    if (!frame)
      return false;

    document.body.removeChild(frame);
    frame = null;

    if (!Object.keys(frames[origin]).length)
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

