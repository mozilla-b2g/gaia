/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Applications = {
  installedApps: [],
  init: function a_init() {
    this.rebuild();
  },

  rebuild: function a_rebuild() {
    var self = this;
    navigator.mozApps.mgmt.getAll().onsuccess = function(evt) {
      var apps = evt.target.result;
      apps.forEach(function(app) {
        self.installedApps[app.origin] = app;
      });

      self.fireApplicationChangeEvent();
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
      self.rebuild();

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

  fireApplicationChangeEvent: function scm_fireScreenChangeEvent() {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationchange',
      /* canBubble */ true, /* cancelable */ false);
    window.dispatchEvent(evt);
  }
};

Applications.init();

window.addEventListener('mozChromeEvent', Applications);
