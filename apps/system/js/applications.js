/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Application module handles the information of apps on behalf of other
// modules.

var Applications = {
  installedApps: {},
  ready: false,
  init: function a_init() {
    var self = this;
    var apps = navigator.mozApps;

    var getAllApps = function getAllApps() {
      navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
        var apps = evt.target.result;
        apps.forEach(function(app) {
          self.installedApps[app.manifestURL] = app;
          // TODO Followup for retrieving homescreen & comms app
        });

        self.ready = true;
        self.fireApplicationReadyEvent();
      };
    };

    // We need to wait for the chrome shell to let us know when it's ok to
    // launch activities. This prevents race conditions.
    // The event does not fire again when we reload System app in on
    // B2G Desktop, so we save the information into sessionStorage.
    if (window.sessionStorage.getItem('webapps-registry-ready')) {
      getAllApps();
    } else {
      window.addEventListener('mozChromeEvent', function mozAppReady(event) {
        if (event.detail.type != 'webapps-registry-ready')
          return;

        window.sessionStorage.setItem('webapps-registry-ready', 'yes');
        window.removeEventListener('mozChromeEvent', mozAppReady);

        getAllApps();
      });
    }

    apps.mgmt.oninstall = function a_install(evt) {
      var newapp = evt.application;
      self.installedApps[newapp.manifestURL] = newapp;

      self.fireApplicationInstallEvent(newapp);
    };

    apps.mgmt.onuninstall = function a_uninstall(evt) {
      var deletedapp = evt.application;
      delete self.installedApps[deletedapp.manifestURL];

      self.fireApplicationUninstallEvent(deletedapp);
    };
  },

  getByManifestURL: function a_getByManifestURL(manifestURL) {
    if (manifestURL in this.installedApps) {
      return this.installedApps[manifestURL];
    }

    return null;
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
