/* global BaseModule, BrowserFrame */
'use strict';

(function(exports) {
  function RemoteAppWindowManager() {
  }

  RemoteAppWindowManager.SERVICES = [
    'launchApp'
  ];

  // An empty EVENTS is necessary for triggering EventMixin in BaseModule.
  RemoteAppWindowManager.EVENTS = [
  ];

  BaseModule.create(RemoteAppWindowManager, {
    DEBUG: false,

    name: 'RemoteAppWindowManager',

    REGISTERED_EVENTS: ['mozbrowserclose', 'mozbrowsererror'],

    launchApp: function(config) {
      this.killCurrentApp();

      var app = new BrowserFrame(config);
      this.REGISTERED_EVENTS.forEach((type) => {
        app.element.addEventListener(type, this);
      });

      this.currentApp = app;

      var appWindow = document.createElement('div');
      appWindow.appendChild(app.element);
      appWindow.classList.add('appWindow');
      appWindow.addEventListener('animationend', this);
      this.container.appendChild(appWindow);

      appWindow.classList.add('opening');

      app.container = appWindow;
    },

    killCurrentApp: function() {
      if (!this.currentApp) {
        return;
      }

      this.container.removeChild(this.currentApp.container);
      this.currentApp = null;
    },

    _start: function() {
      this.container = document.getElementById('windows');
      this.currentApp = null;
    },

    _stop: function() {
      this.killCurrentApp();
      this.container = null;
    },

    _handle_mozbrowsererror: function() {
      this.killCurrentApp();
    },

    _handle_mozbrowserclose: function() {
      this.killCurrentApp();
    },

    _handle_animationend: function(evt) {
      evt.target.classList.remove(evt.animationName);
    }
  });
}(window));
