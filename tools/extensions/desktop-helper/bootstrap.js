/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function debug(data) {
  dump('desktop-helper: ' + data + '\n');
}

function startup(data, reason) {
  const CC = Components.Constructor;
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;

  Cu.import('resource://gre/modules/Services.jsm');
  Cu.import('resource://gre/modules/PermissionPromptHelper.jsm');
  Cu.import('resource://gre/modules/ContactService.jsm');

  /**
   * Mappings of permissions we need to add to the chrome
   * XXX This should be replaced by a manifest parser
  */
  const kPermissions = {
    browser: ['browser', 'systemXHR', 'settings-read', 'geolocation', 'desktop-notification'],
    calendar: ['systemXHR', 'tcp-socket'],
    camera: ['camera'],
    communications: ['contacts-read', 'contacts-write', 'contacts-create', 'settings-read', 'settings-write'],
    email: ['contacts-read', 'contacts-write', 'desktop-notification', 'settings-read', 'settings-write', 'systemXHR', 'tcp-socket'],
    homescreen: ['settings-read', 'settings-write', 'systemXHR', 'tcp-socket', 'webapps-manage'],
    gallery: ['settings-read', 'device-storage:pictures-read', 'device-storage:pictures-write'],
    keyboard: ['settings-read', 'settings-write', 'keyboard'],
    system: ['settings-read', 'settings-write', 'webapps-manage'],
    sms: ['contacts-read', 'contacts-write', 'contacts-create']
  };

  try {
    // Add permissions
    for (var app in kPermissions) {
      // XXX The domain name should be generic to not be tied to gaiamobile.org
      // and the random port number.
      var host = 'http://' + app + '.gaiamobile.org:8080';
      var uri = Services.io.newURI(host, null, null);

      var perms = kPermissions[app];
      for (var i = 0, eachPerm; eachPerm = perms[i]; i++) {
        Services.perms.add(uri, eachPerm, 1);
      }
    }

    // Then inject the missing contents inside apps.
    Cc["@mozilla.org/globalmessagemanager;1"]
      .getService(Ci.nsIMessageBroadcaster)
      .loadFrameScript("chrome://desktop-helper.js/content/content.js", true);

    // Start the responsive UI
    Services.obs.addObserver(function() {
      let browserWindow = Services.wm.getMostRecentWindow('navigator:browser');
      let args = {'width': 320, 'height': 480};
      let mgr = browserWindow.ResponsiveUI.ResponsiveUIManager;
      mgr.handleGcliCommand(browserWindow,
                            browserWindow.gBrowser.selectedTab,
                            'resize to',
                            args);
    }, 'sessionstore-windows-restored', false)

  } catch(e) {
    debug("Something went wrong while trying to start desktop-helper: " + e);
  }
}

function shutdown(data, reason) {
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

