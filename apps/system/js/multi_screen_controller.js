/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global ActionMenu, BaseModule, LazyLoader, BroadcastChannel */
/* global BrowserConfigHelper */
'use strict';

(function() {
  var MultiScreenController = function() {};
  MultiScreenController.SERVICES = [
    'chooseDisplay'
  ];

  MultiScreenController.EVENTS = [
    'mozChromeEvent',
    'mozPresentationChromeEvent'
  ];

  BaseModule.create(MultiScreenController, {
    name: 'MultiScreenController',

    EVENT_PREFIX: 'remote-',
    DEBUG: false,

    choosePresentationDevice: function() {
      this.debug('choose device for presentation');

      var deviceList = [];
      return this.queryPresentationDevices()
        .then((list) => {
          deviceList = list.map((device, idx) => {
            return {
              name: device.name,
              deviceId: device.id,
              id: idx,
            };
          });
          return Promise.resolve(deviceList);
        })
        .then(this.showMenu.bind(this))
        .then((displayId) => {
          this.debug('chosen display id: ' + displayId);

          if (isNaN(displayId)) {
            return Promise.reject();
          }
          return Promise.resolve(deviceList.find((device) => {
            return device.id == displayId;
          }).deviceId);
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

    queryPresentationDevices: function() {
      this.debug('queryPresentationDevices is invoked');

      return navigator.mozPresentationDeviceInfo.getAll();
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
      this.actionMenu = null;

      this.broadcastChannel = new BroadcastChannel('multiscreen');
      this.broadcastChannel.addEventListener('message', this);
    },

    _stop: function() {
      this.broadcastChannel.close();
      this.broadcastChannel = null;

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
      this.debug('got mozChromeEvent: ' + JSON.stringify(detail));

      switch (detail.type) {
        case 'presentation-select-device':
          this._presentationDeviceSelectionHandler(detail);
          break;
      }
    },

    _presentationDeviceSelectionHandler: function(detail) {
      this.debug('handle presentation-select-device event');

      this.choosePresentationDevice(null)
      .then((deviceId) => {
        // store request info
        this.requestDeviceId = deviceId;
        this.debug('target device: ' + this.requestDeviceId);

        window.dispatchEvent(new CustomEvent('mozContentEvent', {
          detail: {
            'type': 'presentation-select-result',
            'deviceId': deviceId,
            'id': detail.id,
          }
        }));
      }).catch(() => {
        window.dispatchEvent(new CustomEvent('mozContentEvent', {
          detail: {
            'type': 'presentation-select-deny',
            'id': detail.id
          }
        }));
      });
    },

    _handle_mozPresentationChromeEvent: function(evt) {
      this.debug('got mozPresentationChromeEvent event');

      var detail = evt.detail;
      switch(detail.type) {
        case 'presentation-launch-receiver':
          var url = new URL(detail.url);
          var manifestURL = null;
          if (url.protocol.toLowerCase() == 'app:') {
            manifestURL = new URL('/manifest.webapp', url);
          }

          var config = new BrowserConfigHelper({
            url: url.toString(),
            manifestURL: manifestURL.toString()
          });
          config.timestamp = detail.timestamp;
          config.requestId = detail.id;

          this.requestConfig = config;
          break;
      }
    },

    _handle_message: function(evt) {
      var data = evt.data;
      if (data.target !== undefined) {
        return;
      }
      this.debug('got message from #' + data.source + ': ' +
        data.type + ', ' + JSON.stringify(data.detail));

      switch(data.type) {
        case 'remote-system-ready':
          this.postMessage(this.requestDeviceId,
                           'launch-presentation-app',
                           this.requestConfig);
          break;
        case 'launch-app-success':
        case 'launch-app-error':
          this.publish(data.type, {
            displayId: data.source,
            config: data.detail.config,
            reason: data.detail.reason
          });
          break;
      }
    }
  });
}());
