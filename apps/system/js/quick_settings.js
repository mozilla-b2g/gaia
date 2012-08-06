/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var QuickSettings = {
  // Indicate setting status of geolocation.enabled
  geolocationEnabled: false,

  init: function qs_init() {
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    this.getAllElements();

    this.overlay.addEventListener('click', this);
    window.addEventListener('utilitytrayshow', this);

    var self = this;

    // monitor data status
    SettingsListener.observe('ril.data.enabled', true, function(value) {
      self.data.dataset.enabled = value;
    });

    // monitor bluetooth status
    SettingsListener.observe('bluetooth.enabled', true, function(value) {
      self.bluetooth.dataset.enabled = value;
    });

    // monitor wifi status
    SettingsListener.observe('wifi.enabled', true, function(value) {
      self.wifi.dataset.enabled = value;
    });

    // monitor geolocation status
    SettingsListener.observe('geolocation.enabled', true, function(value) {
      self.geolocationEnabled = value;
    });
  },

  handleEvent: function qs_handleEvent(evt) {
    evt.preventDefault();
    switch (evt.type) {
      case 'click':
        switch (evt.target) {
          case this.wifi:
            var enabled = (this.wifi.dataset.enabled == 'true');
            this.wifi.dataset.enabled = !enabled;
            navigator.mozSettings.getLock().set({
              'wifi.enabled': !enabled
            });
            if (!enabled) {
              var activity = new MozActivity({
                name: 'configure',
                data: {
                  target: 'device',
                  section: 'wifi'
                }
              });
              UtilityTray.hide();
            }
            break;

          case this.data:
            var enabled = (this.data.dataset.enabled == 'true');
            // the actual mozSettings request is async,
            // but we want to be responsive to user input
            // and double click so we'll change the UI state here
            this.data.dataset.enabled = !enabled;

            navigator.mozSettings.getLock().set({
              'ril.data.enabled': !enabled
            });

            break;

          case this.bluetooth:
            var enabled = (this.bluetooth.dataset.enabled == 'true');
            this.bluetooth.dataset.enabled = !enabled;
            navigator.mozSettings.getLock().set({
              'bluetooth.enabled': !enabled
            });
            break;

          case this.powerSave:
            var enabled = (this.powerSave.dataset.enabled == 'true');
            this.powerSave.dataset.enabled = !enabled;
            if (!enabled) {
              // Keep the original states
              this._powerSaveResume = {
                wifi: (this.wifi.dataset.enabled == 'true'),
                data: (this.data.dataset.enabled == 'true'),
                bluetooth: (this.bluetooth.dataset.enabled == 'true'),
                geolocation: this.geolocationEnabled
              };

              var settingsToSet = {};
              // Turn off Wifi
              settingsToSet['wifi.enabled'] = false;
              // Turn off Data
              settingsToSet['ril.data.enabled'] = false;
              // Turn off Bluetooth
              settingsToSet['bluetooth.enabled'] = false;
              // Turn off Geolocation
              settingsToSet['geolocation.enabled'] = false;

              this.setMozSettings(settingsToSet);

            } else if (this._powerSaveResume) {
              var settingsToSet = {};
              if (this._powerSaveResume.wifi) {
                // Turn on Wifi
                settingsToSet['wifi.enabled'] = true;
              }

              if (this._powerSaveResume.data) {
                // Turn on Data
                settingsToSet['ril.data.enabled'] = true;
              }

              if (this._powerSaveResume.bluetooth) {
                // Turn on Bluetooth
                settingsToSet['bluetooth.enabled'] = true;
              }

              if (this._powerSaveResume.geolocation) {
                // Turn on Bluetooth
                settingsToSet['geolocation.enabled'] = true;
              }

              this.setMozSettings(settingsToSet);

              delete this._powerSaveResume;
            }

            break;

          case this.fullApp:
            // XXX: This should be replaced probably by Web Activities
            var host = document.location.host;
            var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
            var protocol = document.location.protocol + '//';
            Applications.getByOrigin(protocol + 'settings.' + domain).launch();

            window.addEventListener('appopen', function hideTray(evt) {
              window.removeEventListener('appopen', hideTray);
              UtilityTray.hide();
            });

            break;
        }
        break;

      case 'utilitytrayshow':
        break;
    }
  },

  getAllElements: function qs_getAllElements() {
    // ID of elements to create references
    var elements = ['wifi', 'data', 'bluetooth', 'power-save', 'full-app'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    }

    elements.forEach(function createElementRef(name) {
      this[toCamelCase(name)] =
        document.getElementById('quick-settings-' + name);
    }, this);

    this.overlay = document.getElementById('quick-settings');
  },

  // XXX Break down obj keys in a for each loop because mozSettings
  // does not currently supports multiple keys in one set()
  // https://bugzilla.mozilla.org/show_bug.cgi?id=779381
  setMozSettings: function qs_setter(keypairs) {
    var setlock = window.navigator.mozSettings.getLock();
    for (var key in keypairs) {
      var obj = {};
      obj[key] = keypairs[key];
      setlock.set(obj);
    }
  }
};

QuickSettings.init();
