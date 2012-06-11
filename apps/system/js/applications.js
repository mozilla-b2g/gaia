/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Application module handles the information of apps on behalf of other
// modules.

var Applications = {
  installedApps: {},
  init: function a_init() {
    // XXX: handle webapps-ask-install on behalf of permission manager
    // need relocate.
    window.addEventListener('mozChromeEvent', this);

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

  handleEvent: function a_handleEvent(evt) {
    var detail = evt.detail;
    if (detail.type !== 'webapps-ask-install')
      return;

    // This is how we say yes or no to the request after the user decides
    var self = this;
    function sendResponse(id, allow) {

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, {
        id: id,
        type: allow ? 'webapps-install-granted' : 'webapps-install-denied'
      });
      window.dispatchEvent(event);
    }

    var app = detail.app;
    if (document.location.toString().indexOf(app.installOrigin) == 0) {
      sendResponse(detail.id, true);
      return;
    }

    var name = app.manifest.name;
    var locales = app.manifest.locales;
    var lang = navigator.language;
    if (locales && locales[lang] && locales[lang].name)
      name = locales[lang].name;

    var str = document.mozL10n.get('install', {
      'name': name, 'origin': app.origin
    });
    requestPermission(str, function() { sendResponse(detail.id, true); },
                           function() { sendResponse(detail.id, false); });
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
