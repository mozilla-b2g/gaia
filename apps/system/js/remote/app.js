/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global BaseModule, Service */
'use strict';

(function(exports) {
  var App = function() {
  };

  App.SUB_MODULES = [
    'WallpaperManager',
    'remote/RemoteAppWindowManager',
    'remote/MessageController'
  ];

  App.STATES = [
    'displayId'
  ];
  App.EVENTS = [
    'mozPresentationChromeEvent'
  ];

  BaseModule.create(App, {
    DEBUG: false,
    name: 'App',

    displayId: function() {
      return this._displayId;
    },

    _start: function() {
      // The displayId is assigned by HDMIDisplayProvider. It should be unique
      // and indicates the display which the current instance is associated
      // with in Gecko.
      this._displayId = window.location.hash.substring(1);
      this.debug('displayId: ' + this._displayId);

      window.dispatchEvent(
        new CustomEvent('mozContentEvent',
                        { bubbles: true,
                          cancelable: false,
                          detail: { type: 'system-message-listener-ready' }
                        }));
    },

    _handle_mozPresentationChromeEvent: function(evt) {
      this.debug('got mozPresentationChromeEvent event');

      let detail = evt.detail;
      switch(detail.type) {
        case 'presentation-launch-receiver':
          let url = new URL(detail.url);
          let manifestURL = null;
          if (url.protocol.toLowerCase() == 'app:') {
            manifestURL = new URL('/manifest.webapp', url);
          }

          Service.request('postMessage',
                          'request-app-config',
                          { url: url.toString(),
                            manifestURL: manifestURL.toString(),
                            timestamp: detail.timestamp,
                            requestId: detail.id
                          });
          break;
      }
    },
  });
}(window));
