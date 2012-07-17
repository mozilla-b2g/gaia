/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Bluetooth = {
  init: function bt_init() {

    SettingsListener.observe('bluetooth.enabled', true, function(value) {
      var bluetooth = window.navigator.mozBluetooth;
      if (!bluetooth) {
        return;
      }
      if (bluetooth.enabled == value) {
        return;
      }
      var req = bluetooth.setEnabled(value);
      req.onerror = function bt_EnabledError(){
        // rollback
        var settings = window.navigator.mozSettings;
        if (settings) {
          settings.getLock().set({
            'bluetooth.enabled': !value
          });
        }
      }
    });
  }
};
