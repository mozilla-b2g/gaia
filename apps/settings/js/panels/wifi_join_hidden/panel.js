define(function(require) {
  'use strict';
  
  var SettingsPanel = require('modules/settings_panel');
  var WifiHelper = require('shared/wifi_helper');
  var WifiUtils = require('modules/wifi_utils');
  var WifiContext = require('modules/wifi_context');

  return function ctor_joinHiddenWifi() {
    var elements = {};
    var network;
    var isHomeKeyPressed = false;

    return SettingsPanel({
      onInit: function(panel) {
        elements.panel = panel;
        elements.ssid = panel.querySelector('input[name="ssid"]');
        elements.eap = panel.querySelector('select[name="eap"]');
        elements.password = panel.querySelector('input[name="password"]');
        elements.identity = panel.querySelector('input[name="identity"]');
        elements.securitySelect =
          panel.querySelector('select[name="security"]');
        elements.submitButton = panel.querySelector('button[type=submit]');
        elements.showPassword = panel.querySelector('input[name=show-pwd]');

        elements.ssid.oninput = this._onSSIDchange;
        elements.securitySelect.onchange = this._onSecurityChange;
      },
      onBeforeShow: function(panel, options) {
        if (!isHomeKeyPressed) {
          network = options.network;
          this._onSecurityChange.call(elements.securitySelect);
          WifiUtils.initializeAuthFields(panel, network);
        }
        isHomeKeyPressed = false;
      },
      onBeforeHide: function() {
        // set authOptions
        WifiContext.authOptions = {
          password: elements.password.value,
          identity: elements.identity.value,
          eap: elements.eap.value
        };

        // We have to keep these information in network object
        network.ssid = elements.ssid.value;
        network.hidden = true;
      },
      onHide: function() {
        isHomeKeyPressed = document.hidden;
        if (!isHomeKeyPressed) {
          elements.password = '';
          elements.identity = '';
          elements.showPassword.checked = false;
        }
      },
      _onSecurityChange: function() {
        var key = this.selectedIndex ? this.value : '';
        var password = elements.password.value;
        var identity = elements.identity.value;
        var eap = elements.eap.value;

        elements.panel.dataset.security = key;
        elements.submitButton.disabled =
          !WifiHelper.isValidInput(key, password, identity, eap);

        WifiHelper.setSecurity(network, [key]);
        WifiUtils.changeDisplay(elements.panel, key);
      },
      _onSSIDchange: function(event) {
        // Bug 1082394, during composition, we should not change the input
        // value. Otherwise, the input value will be cleared unexpectedly.
        // Besides, it seems unnecessary to change input value before
        // composition is committed.
        if (event.isComposing) {
          return;
        }
        // Make sure ssid length is no more than 32 bytes.
        var str = this.value;
        // Non-ASCII chars in SSID will be encoded by UTF-8, and length of
        // each char might be longer than 1 byte.
        // Use encodeURIComponent() to encode ssid, then calculate correct
        // length.
        var encoder = new TextEncoder('utf-8');
        while (encoder.encode(str).length > 32) {
          str = str.substring(0, str.length - 1);
        }
        if (str !== this.value) {
          this.value = str;
        }
      }
    });
  };
});
