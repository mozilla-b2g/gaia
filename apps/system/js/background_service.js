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

    // stopPropagation means we are not allowing
    // Popup Manager to handle this event
    evt.stopPropagation();

    var manifestURL = evt.target.getAttribute('mozapp');
    var origin = evt.target.dataset.frameOrigin;

    var detail = evt.detail;
    open(origin, detail.name, detail.url, detail.frameElement);
  }, true);

  /* mozbrowserclose */
  window.addEventListener('mozbrowserclose', function bsm_winclose(evt) {
    if (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'background')
      return;

    close(evt.target.dataset.frameOrigin, evt.target.dataset.frameName);
  }, true);

  /* mozbrowsererror */
  window.addEventListener('mozbrowsererror', function bsm_winclose(evt) {
    if (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'background' ||
        evt.detail.type !== 'fatal')
      return;

    var origin = evt.target.dataset.frameOrigin;
    var name = evt.target.dataset.frameName;

    // This bg service has just crashed, clean up the frame
    close(origin, name);

    // Attempt to relaunch if we could find the info to do so
    var app = Applications.getByOrigin(origin);
    if (name != AUTO_OPEN_BG_PAGE_NAME || !app)
      return;

    // XXX: this work as if background_page is always a path not a full URL.
    var url = origin + app.manifest.background_page;
    open(origin, AUTO_OPEN_BG_PAGE_NAME, url);

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
    if (!app || !app.manifest.permissions)
      return false;

    var keys = Object.keys(app.manifest.permissions);
    var permissions = keys.map(function map_perm(key) {
      return app.manifest.permissions[key];
    });

    return (permissions.indexOf('background') != -1);
  };

  /* The open function is responsible of containing the iframe */
  var open = function bsm_open(origin, name, url, frame) {
    var app = Applications.getByOrigin(origin);
    if (!app || !hasBackgroundPermission(app))
      return false;

    // These apps currently have bugs preventing them from being
    // run out of process. All other apps will be run OOP.
    //
    var backgroundOutOfProcessBlackList = [
      'Messages',

      // XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=783066
      'Communications'
    ];

    if (frames[origin] && frames[origin][name]) {
      console.error('Window with the same name is there but Gecko ' +
        ' failed to use it. See bug 766873. origin: "' + origin +
        '", name: "' + name + '".');
      return false;
    }

    if (!frame) {
      frame = document.createElement('iframe');

      // If we have a frame element, it's provided by mozbrowseropenwindow, and
      // it has the mozbrowser, mozapp, and src attributes set already.
      frame.setAttribute('mozbrowser', 'mozbrowser');
      frame.setAttribute('mozapp', app.manifestURL);
      frame.setAttribute('name', name);

      var appName = app.manifest.name;
      if (backgroundOutOfProcessBlackList.indexOf(appName) === -1) {
        // FIXME: content shouldn't control this directly
        frame.setAttribute('remote', 'true');
        console.info('%%%%% Launching', appName, 'bg service as remote (OOP)');
      } else {
        console.info('%%%%% Launching', appName, 'bg service as local');
      }

      frame.src = url;
    }
    frame.className = 'backgroundWindow';
    frame.dataset.frameType = 'background';
    frame.dataset.frameName = name;
    frame.dataset.frameOrigin = origin;

    if (!frames[origin])
      frames[origin] = {};
    frames[origin][name] = frame;

    document.body.appendChild(frame);
    return true;
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
    delete frames[origin][name];

    if (!Object.keys(frames[origin]).length)
      delete frames[origin];
    return true;
  };

  /* Return the public APIs */
  return {
    'open': open,
    'close': close
  };
}());

