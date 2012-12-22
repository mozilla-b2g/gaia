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
  var init = function bsm_init() {
    var applications = Applications.installedApps;
    Object.keys(applications).forEach(function bsm_each(manifestURL) {
      var app = applications[manifestURL];
      if (!app.manifest.background_page)
        return;

      // XXX: this work as if background_page is always a path not a full URL.
      var url = app.origin + app.manifest.background_page;
      open(manifestURL, AUTO_OPEN_BG_PAGE_NAME, url);
    });
  };

  /* mozbrowseropenwindow */
  window.addEventListener('mozbrowseropenwindow', function bsm_winopen(evt) {
    if (evt.detail.features !== 'background')
      return;

    // stopPropagation means we are not allowing
    // Popup Manager to handle this event
    evt.stopPropagation();

    var manifestURL = evt.target.getAttribute('mozapp');
    var detail = evt.detail;

    open(manifestURL, detail.name, detail.url, detail.frameElement);
  }, true);

  /* mozbrowserclose */
  window.addEventListener('mozbrowserclose', function bsm_winclose(evt) {
    if (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'background')
      return;

    var manifestURL = evt.target.getAttribute('mozapp');

    close(manifestURL, evt.target.dataset.frameName);
  }, true);

  /* mozbrowsererror */
  window.addEventListener('mozbrowsererror', function bsm_winclose(evt) {
    if (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'background' ||
        evt.detail.type !== 'fatal')
      return;

    var target = evt.target;
    var manifestURL = target.getAttribute('mozapp');

    // This bg service has just crashed, clean up the frame
    var name = target.dataset.frameName;
    close(manifestURL, name);
  }, true);

  /* OnInstall */
  window.addEventListener('applicationinstall', function bsm_oninstall(evt) {
    var app = evt.detail.application;
    var origin = app.origin;
    if (!app.manifest.background_page)
      return;

    // XXX: this work as if background_page is always a path not a full URL.
    var url = origin + app.manifest.background_page;
    open(manifestURL, AUTO_OPEN_BG_PAGE_NAME, url);
  });

  /* OnUninstall */
  window.addEventListener('applicationuninstall', function bsm_oninstall(evt) {
    var app = evt.detail.application;
    close(app.manifestURL);
  });

  /* Check if the app has the permission to open a background page */
  var hasBackgroundPermission = function bsm_checkPermssion(app) {
    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms)
      return false;

    var value = mozPerms.get('backgroundservice', app.manifestURL,
                             app.origin, false);

    return (value === 'allow');
  };

  /* The open function is responsible of containing the iframe */
  var open = function bsm_open(manifestURL, name, url, frame) {
    var app = Applications.getByManifestURL(manifestURL);
    if (!app || !hasBackgroundPermission(app))
      return false;

    if (frames[manifestURL] && frames[manifestURL][name]) {
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
      frame.setAttribute('mozapp', manifestURL);
      frame.setAttribute('name', name);

      var appName = app.manifest.name;
      frame.setAttribute('remote', 'true');
      console.info('%%%%% Launching', appName, 'bg service as remote (OOP)');
      frame.src = url;
    }
    frame.className = 'backgroundWindow';
    frame.dataset.frameType = 'background';
    frame.dataset.frameName = name;

    if (!frames[manifestURL])
      frames[manifestURL] = {};
    frames[manifestURL][name] = frame;

    document.body.appendChild(frame);

    // Background services should load in the background.
    //
    // (The funky setTimeout(0) is to work around
    // https://bugzilla.mozilla.org/show_bug.cgi?id=810431 .)
    setTimeout(function() { frame.setVisible(false) }, 0);

    return true;
  };

  /* The close function will remove the iframe from DOM and
    delete the reference */
  var close = function bsm_close(manifestURL, name) {
    if (!frames[manifestURL])
      return false;

    if (typeof name == 'undefined') {
      // Close all windows
      Object.keys(frames[manifestURL]).forEach(function closeEach(name) {
        document.body.removeChild(frames[manifestURL][name]);
        frames[manifestURL][name] = null;
      });
      delete frames[manifestURL];
      return true;
    }

    // Close one window
    var frame = frames[manifestURL][name];
    if (!frame)
      return false;

    document.body.removeChild(frame);
    delete frames[manifestURL][name];

    if (!Object.keys(frames[manifestURL]).length)
      delete frames[manifestURL];
    return true;
  };

  /* start initialization */
  if (Applications.ready) {
    init();
  } else {
    window.addEventListener('applicationready',
    function bsm_appListReady(event) {
      window.removeEventListener('applicationready', bsm_appListReady);
      init();
    });
  }

  /* Return the public APIs */
  return {
    'open': open,
    'close': close
  };
}());

