/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var QuickSettings = {
  init: function qs_init() {
    this.getAllElements();

    this.overlay.addEventListener('click', this);
    window.addEventListener('utilitytrayshow', this);

    var self = this;

    SettingsListener.observe('ril.data.enabled', true, function(value) {
      self.data.enabled = value;
    });

  },

  handleEvent: function qs_handleEvent(evt) {
    evt.preventDefault();
    switch (evt.type) {
      case 'click':
        switch (evt.target) {
          case this.wifi:
            var wifiManager = navigator.mozWifiManager;
            if (!wifiManager)
              return;

            var enabled = (this.wifi.dataset.enabled == 'true');
            wifiManager.setEnabled(!enabled);
            this.wifi.dataset.enabled = !enabled;
            break;

          case this.data:
            var enabled = (this.data.dataset.enabled == 'true');
            // the actual mozSettings request is async,
            // but we want to be responsive to user input
            // and double click so we'll change the UI state here
            this.data.dataset.enabled = !enabled;

            navigator.mozSettings.getLock().set({
              'ril.data.enabled': !enabled });

            break;

          case this.bluetooth:
            var bluetooth = navigator.mozBluetooth;
            if (!bluetooth)
              return;

            var enabled = (this.bluetooth.dataset.enabled == 'true');
            bluetooth.setEnabled(!enabled);
            this.bluetooth.dataset.enabled = !enabled;
            break;

          case this.powerSave:
            break;

          case this.fullApp:
            break;
        }
        break;

      case 'utilitytrayshow':
        this.updateStatus();
        break;
    }
  },

  updateStatus: function qs_updateStatus() {
    var wifiManager = navigator.mozWifiManager;
    this.wifi.dataset.enabled = !!(wifiManager && wifiManager.enabled);

    var bluetooth = navigator.mozBluetooth;
    this.bluetooth.dataset.enabled = !!(bluetooth && bluetooth.enabled);
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
  }
};

QuickSettings.init();
