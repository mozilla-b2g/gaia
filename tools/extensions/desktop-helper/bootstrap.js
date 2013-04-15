/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function debug(data) {
  dump('desktop-helper: ' + data + '\n');
}

function startup(data, reason) {
  Cu.import('resource://gre/modules/Services.jsm');

  Cu.import('resource://gre/modules/ContactService.jsm');
  Cu.import('resource://gre/modules/SettingsChangeNotifier.jsm');
  Cu.import('resource://gre/modules/AlarmService.jsm');
  Cu.import('resource://gre/modules/ActivitiesService.jsm');
  Cu.import('resource://gre/modules/PermissionPromptHelper.jsm');

  try {
    // XXX This code is useless in b2g-desktop. Should not be loaded there.
    var loader = Cc['@mozilla.org/moz/jssubscript-loader;1']
                  .getService(Ci.mozIJSSubScriptLoader);
    loader.loadSubScript('chrome://desktop-helper.js/content/permissions.js');

    // Then inject the missing contents inside apps.
    // XXX This code is the only things that should affect both Firefox and
    // b2g-desktop. Loading mock apis lives here.
    var mm = Cc['@mozilla.org/globalmessagemanager;1']
               .getService(Ci.nsIMessageBroadcaster);
    mm.loadFrameScript('chrome://desktop-helper.js/content/content.js', true);

    // XXX This code is Firefox only and should not be loaded in b2g-desktop.
    Services.obs.addObserver(function() {
      let browserWindow = Services.wm.getMostRecentWindow('navigator:browser');

      // Automatically toggle responsive design mode
      let args = {'width': 320, 'height': 480};
      let mgr = browserWindow.ResponsiveUI.ResponsiveUIManager;
      mgr.handleGcliCommand(browserWindow,
                            browserWindow.gBrowser.selectedTab,
                            'resize to',
                            args);

      // And open ff os devtool panel while maximizing its size according to
      // screen size
      Services.prefs.setIntPref('devtools.toolbox.sidebar.width',
                                browserWindow.screen.width - 550);
      browserWindow.resizeTo(
        browserWindow.screen.width,
        browserWindow.outerHeight
      );
      gDevToolsBrowser.selectToolCommand(browserWindow.gBrowser,
                                         'firefox-os-controls');

      // XXX This code should be loaded by the keyboard/ extension
      // to not change the behavior of b2g-desktop.
      try {
        // Try to load a the keyboard if there is a keyboard addon.
        Cu.import('resource://keyboard.js/Keyboard.jsm');
        mm.addMessageListener('Forms:Input', Keyboard);
        mm.loadFrameScript('chrome://keyboard.js/content/forms.js', true);
      } catch(e) {
        debug("Can't load Keyboard.jsm. Likely because the keyboard addon is not here.");
      }
    }, 'sessionstore-windows-restored', false);

    // XXX This code is Firefox only and should not be loaded in b2g-desktop.
    try {
      // Register a new devtool panel with various OS controls
      Cu.import('resource:///modules/devtools/gDevTools.jsm');
      gDevTools.registerTool({
        id: 'firefox-os-controls',
        key: 'F',
        modifiers: 'accel,shift',
        icon: 'chrome://desktop-helper.js/content/panel/icon.gif',
        url: 'chrome://desktop-helper.js/content/panel/index.html',
        label: 'FFOS Control',
        tooltip: 'Set of controls to tune FirefoxOS apps in Desktop browser',
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
    debug('Something went wrong while trying to start desktop-helper: ' + e);
  }
}

function shutdown(data, reason) {
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

