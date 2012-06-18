/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var QuickSettings = {
  init: function qs_init() {
    this.getAllElements();

    this.overlay.addEventListener('click', this);
    window.addEventListener('utilitytrayshow', this);
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
            break;

          case this.bluetooth:
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
