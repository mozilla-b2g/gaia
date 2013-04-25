/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Services",
                                  "resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "AccessFu",
                                  "resource://gre/modules/accessibility/AccessFu.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "gDevTools",
                                  "resource:///modules/devtools/gDevTools.jsm");

var gBrowserWindow = null;

function debug(data) {
  dump('screen-reader-simulator: ' + data + '\n');
}

function startup(data, reason) {
  function setupWindow() {
    Services.prefs.setIntPref('accessibility.accessfu.activate', 0);
    AccessFu.attach(gBrowserWindow);
  }

  try {
    gBrowserWindow = Services.wm.getMostRecentWindow('navigator:browser');
    if (gBrowserWindow) {
      setupWindow();
    } else {
      Services.obs.addObserver(function() {
          gBrowserWindow = Services.wm.getMostRecentWindow('navigator:browser');
          setupWindow();
        }, 'sessionstore-windows-restored', false);
    }

    // XXX This code is Firefox only and should not be loaded in b2g-desktop.
    try {
      // Register a new devtool panel with various OS controls
      gDevTools.registerTool({
        id: 'screen-reader-controls',
        key: 'V',
        modifiers: 'accel,shift',
        icon: 'chrome://screen-reader-simulator/content/panel/icon.png',
        url: 'chrome://screen-reader-simulator/content/panel/screen-reader-simulator.xul',
        label: 'Screen Reader',
        tooltip: 'Control the mobile screen reader',
        isTargetSupported: function(target) {
          return target.isLocalTab;
        },
        build: function(iframeWindow, toolbox) {
          iframeWindow.wrappedJSObject.tab = toolbox.target.window;
        }
      });
    } catch(e) {
      debug('Can\'t load the devtools panel. Likely because this version of Gecko is too old');
    }

  } catch (e) {
  }
}

function shutdown(data, reason) {
  try {
    gDevTools.unregisterTool('screen-reader-controls');
    Services.prefs.setIntPref('accessibility.accessfu.activate', 0);
    AccessFu.detach(gBrowserWindow);
  } catch (e) {
    debug('Something went wrong while trying to stop: ' + e);
  }
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

