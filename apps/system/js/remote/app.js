/* global BaseModule */
'use strict';

(function(exports) {
  var App = function() {
  };

  App.SUB_MODULES = [
    'WallpaperManager',
    'remote/RemoteAppWindowManager'
  ];

  App.EVENTS = [
    'wallpaperchange'
  ];

  App.STATES = [
    'displayId'
  ];

  BaseModule.create(App, {
    DEBUG: false,
    name: 'App',

    displayId: function() {
      return this._displayId;
    },

    _start: function() {
      // The displayId is assigned by shell_remote.js. It should be unique and
      // indicates the display which the current instance is associated with in
      // Gecko.
      this._displayId = window.location.hash ?
        parseInt(window.location.hash.substring(1), 10) :
        -1;
      this.debug('displayId: ' + this._displayId);
    },

    _handle_wallpaperchange: function(evt) {
      document.body.style.backgroundImage =
        'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)),' +
        'url(' + evt.detail.url + ')';
    }
  });
}(window));
