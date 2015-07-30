/* global BaseModule, BrowserFrame */
'use strict';

(function(exports) {
  function RemoteAppWindowManager() {
  }

  RemoteAppWindowManager.SERVICES = [
    'launchApp',
    'killCurrentApp'
  ];

  // An empty EVENTS is necessary for triggering EventMixin in BaseModule.
  RemoteAppWindowManager.EVENTS = [
  ];

  BaseModule.create(RemoteAppWindowManager, {
    DEBUG: false,

    name: 'RemoteAppWindowManager',

    REGISTERED_EVENTS: ['mozbrowserclose', 'mozbrowsererror'],

    launchApp: function(config, immediate) {
      return new Promise((resolve, reject) => {
        if (this.currentApp &&
            this.currentApp.container.classList.contains('opening')) {
          this.debug('error: previous app is opening.');
          reject('Previous app is opening.');
          return;
        }

        this.debug('launching app: ' + JSON.stringify(config));

        this.killCurrentApp();

        var app = new BrowserFrame(config);
        this.REGISTERED_EVENTS.forEach((type) => {
          app.element.addEventListener(type, this);
        });

        this.currentApp = app;

        var appWindow = document.createElement('div');
        appWindow.appendChild(app.element);
        appWindow.classList.add('appWindow');
        app.container = appWindow;
        this.container.appendChild(appWindow);

        if (!immediate) {
          appWindow.addEventListener('animationend', function(evt) {
            evt.target.classList.remove(evt.animationName);
            resolve(config);
          });
          appWindow.classList.add('opening');
        } else {
          resolve(config);
        }
      });
    },

    killCurrentApp: function() {
      if (!this.currentApp) {
        return;
      }

      this.container.removeChild(this.currentApp.container);
      this.currentApp = null;

      this.debug('current app is killed');
    },

    _start: function() {
      this.container = document.getElementById('windows');
      this.currentApp = null;

      // XXX: A workaround to force external display to refresh the screen
      //      at the beginning.
      this.launchApp({
        oop: true,
        url: 'about:blank'
      }, true).then(this.killCurrentApp.bind(this));
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
    }
  });
}(window));
