'use strict';

/*
  Allow web apps to inject a tiny persistent background iframe
  as the phone starts.

*/
var BackgroundServiceManager = (function bsm() {
  /* We keep information about the installed Apps here */
  var installedApps = {};

  /* We keep the references to background page iframes here.
    The iframes will be append to body */
  var frames = {};

  /* Init */

  navigator.mozApps.mgmt.getAll().onsuccess = function settings_getAll(evt) {
    evt.target.result.forEach(function app_forEach(app) {
      installedApps[app.origin] = app;
      open(app.origin);
    });
  };

  /* XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=731746
  addEventListener does't work for now (workaround follows)

  navigator.mozApps.mgmt.addEventListener('install', function bsm_install(evt) {
    var newapp = evt.application;
    installedApps[newapp.origin] = newapp;

    open(newapp.origin);
  });

  navigator.mozApps.mgmt.addEventListener('uninstall', function bsm_uninstall(evt) {
    var newapp = evt.application;
    delete installedApps[newapp.origin];

    close(newapp.origin);
  });

  */

  /* workaround */
  var mgmt = navigator.mozApps.mgmt;
  var OriginalOninstall = mgmt.oninstall;
  var OriginalOnuninstall = mgmt.onuninstall;

  mgmt.oninstall = function bsm_install(evt) {
    var newapp = evt.application;
    installedApps[newapp.origin] = newapp;

    open(newapp.origin);

    if (OriginalOninstall)
      OriginalOninstall.apply(this, arguments);
  };

  mgmt.onuninstall = function bsm_uninstall(evt) {
    var newapp = evt.application;
    delete installedApps[newapp.origin];

    close(newapp.origin);

    if (OriginalOninstall)
      OriginalOnuninstall.apply(this, arguments);
  };
  /* // workaround */

  /* The open function will check for the needs and
    permission before creating the containing iframe */
  var open = function bsm_open(origin) {
    var app = installedApps[origin];
    if (!app || !app.manifest.background_page)
      return false;

    /*
    app.manifset.permissions is used by preferences.js
    can't use that for here. We don't check for permission for now.

    if (!app.manifset.permissions ||
        !app.manifset.permissions.indexOf('background') == -1) {
      console.log('Error: app ' + origin + ' requests background_page'
        + ' but it doesn\'t have the permission to.');
      return false;
    }
    */

    var frame = document.createElement('iframe');
    frame.className = 'backgroundWindow';
    frame.setAttribute('mozbrowser', 'true');
    frame.src = origin + app.manifest.background_page;
    frames[origin] = frame;

    document.body.appendChild(frame);
    return true;
  };

  /* The close function will remove the iframe from DOM and
    delete the reference */
  var close = function bsm_close(origin) {
    if (!frames[origin])
      return false;

    frames[origin].parentNode.removeChild(frames[origin]);
    delete frames[origin];
    return true;
  };

  /* Getting the window object reference of the background page. Unused.
     We have no way to give the object reference to the the app iframe for now */
  var getWindow = function bsm_getWindow(origin) {
    if (frames[origin])
      return frames[origin].contentWindow || null;
    return null;
  };

  /* Return the public APIs */
  return {
    'open': open,
    'close': close,
    'getWindow': getWindow
  };

}());
