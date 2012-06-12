/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Application module handles the information of apps on behalf of other
// modules.

var Applications = {
  installedApps: {},
  init: function a_init() {
    var self = this;
    var apps = navigator.mozApps;

    apps.mgmt.oninstall = function a_install(evt) {
      var newapp = evt.application;
      self.installedApps[newapp.origin] = newapp;

      self.fireApplicationInstallEvent(newapp);
    };

    apps.mgmt.onuninstall = function a_uninstall(evt) {
      var deletedapp = evt.application;
      delete installedApps[deletedapp.origin];

      self.fireApplicationUninstallEvent(newapp);
    }

    apps.mgmt.getAll().onsuccess = function(evt) {
      var apps = evt.target.result;
      apps.forEach(function(app) {
        self.installedApps[app.origin] = app;
      });

      self.fireApplicationReadyEvent();
    };
  },

  getByOrigin: function a_getByOrigin(origin) {
    return this.installedApps[origin];
  },

  fireApplicationReadyEvent: function a_fireAppReadyEvent() {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationready',
      /* canBubble */ true, /* cancelable */ false,
      { applications: this.installedApps });
    window.dispatchEvent(evt);
  },

  // We need to dispatch the following events because
  // mozApps is not doing so right now.
  // ref: https://bugzilla.mozilla.org/show_bug.cgi?id=731746

  fireApplicationInstallEvent: function a_fireApplicationInstallEvent(app) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationinstall',
      /* canBubble */ true, /* cancelable */ false,
      { application: app });
    window.dispatchEvent(evt);
  },

  fireApplicationUninstallEvent: function a_fireApplicationUninstallEvent(app) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationuninstall',
      /* canBubble */ true, /* cancelable */ false,
      { application: app });
    window.dispatchEvent(evt);
  }
};

Applications.init();
