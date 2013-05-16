/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function debug(data) {
  dump('browser-helper: ' + data + '\n');
}

function startup(data, reason) {
  Cu.import('resource://gre/modules/Services.jsm');

  try {
    // Initialize various JSM instanciated by shell.js
    // All of them are usefull even if we don't use them in this file.
    Cu.import('resource://gre/modules/ContactService.jsm');
    Cu.import('resource://gre/modules/SettingsChangeNotifier.jsm');
    Cu.import('resource://gre/modules/ActivitiesService.jsm');
    Cu.import('resource://gre/modules/PermissionPromptHelper.jsm');

    var mm = Cc['@mozilla.org/globalmessagemanager;1']
               .getService(Ci.nsIMessageBroadcaster);
    // Allow panning to work in the system app.
    mm.loadFrameScript('chrome://global/content/BrowserElementPanning.js', true);

    // Enable mozApps.getAll and app.launch to work.
    // By default on firefox, apps are consider as not launchable
    // and only launchable apps appear in getAll().
    Cu.import('resource://gre/modules/Webapps.jsm');
    DOMApplicationRegistry.allAppsLaunchable = true;

    // Track loading of the system app in order to load our striped down copy
    // of shell.xul
    Services.obs.addObserver(function(document) {
      // Some documents like XBL don't have location and should be ignored
      if (!document.location)
        return;
      let domain = document.location.toString();
      if (domain.indexOf('system.gaiamobile.org') != -1) {
        let scope = {
          content: document.defaultView
        };
        Services.scriptloader.loadSubScript(
          'chrome://browser-helper.js/content/shell.js', scope);
      }
    }, 'document-element-inserted', false);

    Services.obs.addObserver(function() {
      let browserWindow = Services.wm.getMostRecentWindow('navigator:browser');

      // Automatically toggle responsive design mode
      let args = {'width': 320, 'height': 480};
      let mgr = browserWindow.ResponsiveUI.ResponsiveUIManager;
      mgr.handleGcliCommand(browserWindow,
                            browserWindow.gBrowser.selectedTab,
                            'resize to',
                            args);

      // And devtool panel while maximizing its size according to screen size
      Services.prefs.setIntPref('devtools.toolbox.sidebar.width',
                                browserWindow.outerWidth - 550);
      gDevToolsBrowser.selectToolCommand(browserWindow.gBrowser);

      // XXX This code should be loaded by the keyboard/ extension
      try {
        // Try to load a the keyboard if there is a keyboard addon.
        Cu.import('resource://keyboard.js/Keyboard.jsm');
        mm.addMessageListener('Forms:Input', Keyboard);
        mm.loadFrameScript('chrome://keyboard.js/content/forms.js', true);
      } catch(e) {
        debug('Can\'t load Keyboard.jsm. Likely because the keyboard addon is not here.');
      }
    }, 'sessionstore-windows-restored', false);

    try {
      // Register a new devtool panel with various OS controls
      Cu.import('resource:///modules/devtools/gDevTools.jsm');
      gDevTools.registerTool({
        id: 'firefox-os-controls',
        key: 'F',
        modifiers: 'accel,shift',
        icon: 'chrome://browser-helper.js/content/panel/icon.gif',
        url: 'chrome://browser-helper.js/content/panel/index.html',
        label: 'FFOS Control',
        tooltip: 'Set of controls to tune FirefoxOS apps in Desktop browser',
        isTargetSupported: function(target) {
          return target.isLocalTab;
        },
        build: function(iframeWindow, toolbox) {
          iframeWindow.wrappedJSObject.tab = toolbox.target.window;
          return {
            destroy: function () {}
          };
        }
      });
    } catch(e) {
      debug('Can\'t load the devtools panel. Likely because this version of Gecko is too old');
    }

  } catch (e) {
    debug('Something went wrong while trying to start browser-helper: ' + e);
  }
}
