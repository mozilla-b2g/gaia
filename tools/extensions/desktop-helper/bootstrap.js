/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/Services.jsm');

function debug(data) {
  //dump('desktop-helper: ' + data + '\n');
}

const kChromeRootPath = 'chrome://desktop-helper.js/content/data/';

// XXX Scripts should be loaded based on the permissions of the apps not
// based on the domain.
const kScriptsPerDomain = {
  '.gaiamobile.org': [
    'ffos_runtime.js',
    'lib/bluetooth.js',
    'lib/cameras.js',
    'lib/mobile_connection.js',
    'lib/icc_manager.js',
    'lib/telephony.js',
    'lib/wifi.js'
  ]
};

function injectMocks() {
  // Track loading of apps to inject mock APIs
  Services.obs.addObserver(function(document) {
    // Some documents like XBL don't have location and should be ignored
    if (!document.location || !document.defaultView)
      return;
    let currentDomain = document.location.toString();
    let window = document.defaultView;

    // Do not include mocks for unit test sandboxes
    if (window.wrappedJSObject.mocha &&
        currentDomain.indexOf('_sandbox.html') !== -1) {
      return;
    }

    debug('+++ loading scripts for app: ' + currentDomain + "\n");
    // Inject mocks based on domain
    for (let domain in kScriptsPerDomain) {
      if (currentDomain.indexOf(domain) == -1)
        continue;

      let includes = kScriptsPerDomain[domain];
      for (let i = 0; i < includes.length; i++) {
        debug('loading ' + includes[i] + '...');

        Services.scriptloader.loadSubScript(kChromeRootPath + includes[i],
                                            window.wrappedJSObject);
      }
    }

    // Inject script to simulate touch events only in the system app
    if (currentDomain.indexOf('system.gaiamobile.org') != -1) {
      let require = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools.require;
      let {TouchEventHandler} = require("devtools/touch-events");
      // We need to register mouse event listeners on the iframe/browser
      // element
      let frame = window.QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIWebNavigation)
                        .QueryInterface(Ci.nsIDocShell).chromeEventHandler;
      let scope = {
        addEventListener: function (type, fun, capture) frame.addEventListener(type, fun, capture),
        removeEventListener: function (type, fun) frame.removeEventListener(type, fun)
      };
      let touchEventHandler = new TouchEventHandler(scope);
      touchEventHandler.start();
    }
  }, 'document-element-inserted', false);
}

function hotfixAlarms() {
  // Replace existing alarm service xpcom factory by a new working one,
  // until a working fallback is implemented in platform code (bug 867868)

  // Sigh. Seems like there is a registration issue between all the addons.
  // This is dirty but delaying this seems to make it.
  var timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
  timer.initWithCallback(function() {
    Services.scriptloader.loadSubScript('chrome://desktop-helper.js/content/alarms.js', {});
  }, 1000, Ci.nsITimer.TYPE_ONE_SHOT);
}

function startup(data, reason) {
  try {
    hotfixAlarms();

    injectMocks();
  } catch (e) {
    debug('Something went wrong while trying to start desktop-helper: ' + e);
  }
}

function shutdown(data, reason) {
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

