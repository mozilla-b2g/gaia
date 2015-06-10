/* global ActionMenu, BaseModule, LazyLoader, BroadcastChannel */
'use strict';

(function() {
  var MultiScreenController = function() {};
  MultiScreenController.SERVICES = [
    'chooseDisplay'
  ];
  MultiScreenController.EVENTS = [
    'mozChromeEvent'
  ];
  MultiScreenController.SETTINGS = [
    'multiscreen.enabled'
  ];
  MultiScreenController.STATES = [
    'enabled'
  ];
  BaseModule.create(MultiScreenController, {
    name: 'MultiScreenController',

    EVENT_PREFIX: 'remote-',
    DEBUG: false,

    enabled: function() {
      return this._enabled;
    },
    chooseDisplay: function(config) {
      this.debug('chooseDisplay is invoked');

      if (!this._enabled) {
        this.debug('multi-screen is disabled');
        return Promise.reject();
      }

      if (config.isSystemMessage || config.stayBackground) {
        this.debug('unsupported config: ' + JSON.stringify(config));
        return Promise.reject();
      }

      return this.queryExternalDisplays()
        .then(this.showMenu.bind(this))
        .then((displayId) => {
          this.debug('chosen display id: ' + displayId);

          if (!displayId) {
            return Promise.reject();
          }

          this.postMessage(displayId, 'launch-app', config);
          return Promise.resolve(displayId);
        });
    },
    showMenu: function(displays) {
      this.debug('showMenu is invoked');

      if (this.actionMenu) {
        this.debug('actionMenu is busy');
        return Promise.reject();
      }

      if (!displays.length) {
        this.debug('no external display so cancel the menu directly');
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        LazyLoader.load('js/action_menu.js', () => {
          this.actionMenu = new ActionMenu({
            successCb: (choice) => {
              this.actionMenu = null;
              resolve(choice);
            },
            cancelCb: () => {
              this.actionMenu = null;
              resolve();
            }
          });

          this.actionMenu.show(displays.map(function(display) {
            return {
              label: display.name,
              value: display.id
            };
          }), 'multiscreen-pick');
        });
      });
    },
    queryExternalDisplays: function() {
      this.debug('queryExternalDisplays is invoked');

      if (this.queryPromiseCallback) {
        this.debug('there\'s a pending query');
        return Promise.reject();
      }

      return new Promise((resolve, reject) => {
        this.debug('sending mozContentEvent');

        this.queryPromiseCallback = {
          resolve: resolve,
          reject: reject
        };

        window.dispatchEvent(new CustomEvent('mozContentEvent', {
          detail: {
            type: 'get-display-list'
          }
        }));
      });
    },
    postMessage: function(target, type, detail) {
      this.debug('broadcast message to #' + target + ': ' +
        type + ', ' + JSON.stringify(detail));

      this.broadcastChannel.postMessage({
        target: target,
        type: type,
        detail: detail
      });
    },
    _start: function() {
      this._enabled = false;
      this.actionMenu = null;
      this.queryPromiseCallback = null;

      this.broadcastChannel = new BroadcastChannel('multiscreen');
      this.broadcastChannel.addEventListener('message', this);
    },
    _stop: function() {
      if (this._enabled) {
        window.removeEventListener('mozChromeEvent', this);
        this._enabled = false;
      }

      this.broadcastChannel.close();
      this.broadcastChannel = null;

      if (this.queryPromiseCallback) {
        this.queryPromiseCallback.reject('module has been stoped');
        this.queryPromiseCallback = null;
      }
      if (this.actionMenu) {
        this.actionMenu.hide();
        if (this.actionMenu.oncancel) {
          this.actionMenu.oncancel();
        }
        this.actionMenu = null;
      }
    },
    _handle_mozChromeEvent: function(evt) {
      var detail = evt.detail;

      if (!this.queryPromiseCallback) {
        return;
      }

      switch (detail.type) {
        case 'get-display-list-success':
          this.queryPromiseCallback.resolve(detail.display);
          break;
        case 'get-display-list-error':
          this.queryPromiseCallback.reject(detail.error);
          break;
        default:
          return;
      }

      this.queryPromiseCallback = null;
      this.debug('got mozChromeEvent: ' + JSON.stringify(detail));
    },
    _handle_message: function(evt) {
      var data = evt.data;
      if (data.target !== undefined) {
        return;
      }
      this.debug('got message from #' + data.source + ': ' +
        data.type + ', ' + JSON.stringify(data.detail));

      switch(data.type) {
        case 'launch-app-success':
        case 'launch-app-error':
          this.publish(data.type, {
            displayId: data.source,
            config: data.detail.config,
            reason: data.detail.reason
          });
          break;
      }
    },
    '_observe_multiscreen.enabled': function(value) {
      if (value == this._enabled) {
        return;
      }

      this._enabled = value;
      if (this._enabled) {
        window.addEventListener('mozChromeEvent', this);
      } else {
        window.removeEventListener('mozChromeEvent', this);
      }
    }
  });
}());
