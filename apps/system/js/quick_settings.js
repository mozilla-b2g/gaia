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

    // monitor power save mode
    SettingsListener.observe('powersave.enabled', false, function(value) {
      self.powerSave.dataset.enabled = value;
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
            SettingsListener.getSettingsLock().set({
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
            }
            break;

          case this.data:
            var enabled = (this.data.dataset.enabled == 'true');
            // the actual mozSettings request is async,
            // but we want to be responsive to user input
            // and double click so we'll change the UI state here
            this.data.dataset.enabled = !enabled;

            SettingsListener.getSettingsLock().set({
              'ril.data.enabled': !enabled
            });

            break;

          case this.bluetooth:
            var enabled = (this.bluetooth.dataset.enabled == 'true');
            this.bluetooth.dataset.enabled = !enabled;
            SettingsListener.getSettingsLock().set({
              'bluetooth.enabled': !enabled
            });
            break;

          case this.powerSave:
            var enabled = (this.powerSave.dataset.enabled == 'true');
            this.powerSave.dataset.enabled = !enabled;
            SettingsListener.getSettingsLock().set({
              'powersave.enabled': !enabled
            });
            break;

          case this.fullApp:
            // XXX: This should be replaced probably by Web Activities
            var host = document.location.host;
            var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
            var protocol = document.location.protocol + '//';
            Applications.getByManifestURL(protocol + 'settings.' +
                                          domain + '/manifest.webapp').launch();

            UtilityTray.hide();
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
    var setlock = SettingsListener.getSettingsLock();
    for (var key in keypairs) {
      var obj = {};
      obj[key] = keypairs[key];
      setlock.set(obj);
    }
  }
};

QuickSettings.init();
