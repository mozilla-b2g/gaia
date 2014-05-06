define(function(require) {
  'use strict';
  var SettingsUtils = require('modules/settings_utils');
  var WifiHelper = require('shared/wifi_helper');

  var WifiJoinHidden = function() {
    return {
      onInit: function(panel, options) {
        this._network = options.network;
        this._elements = {};
        this._elements.panel = panel;
        this._elements.ssid = panel.querySelector('input[name="ssid"]');
        this._elements.ssid.oninput = this._onSSIDchange;
        this._elements.eap = panel.querySelector('select[name="eap"]');
        this._elements.password = panel.querySelector('input[name="password"]');
        this._elements.identity = panel.querySelector('input[name="identity"]');
        this._elements.securitySelect =
          panel.querySelector('select[name="security"]');
        this._elements.securitySelect.onchange =
          this._onSecurityChange.bind(this);

        this._onSecurityChange();
      },
      onBeforeShow: function(panel, options) {
      },
      onBeforeHide: function() {

      },
      _onSSIDchange: function() {
        // Make sure ssid length is less then 32 bytes.
        var str = this.value;
        // Non-ASCII chars in SSID will be encoded by UTF-8, and length of
        // each char might be longer than 1 byte.
        // Use encodeURIComponent() to encode ssid, then calculate correct
        // length.
        if (encodeURIComponent(str).replace(/%[\w\d]{2}/g, '1').length > 32) {
          this.value = str.substring(0, str.length - 1);
        }
      },
      _onSecurityChange: function() {
        var select = this._elements.securitySelect;
        var key = select.selectedIndex ? select.value : '';

        WifiHelper.setSecurity(this._network, [key]);
        this._elements.panel.dataset.security = key;
        WifiHelper.checkPassword(this._elements.panel, {
          key: key,
          password: this._elements.password.value,
          identity: this._elements.identity.value,
          eap: this._elements.eap.value
        });
        SettingsUtils.changeDisplay('wifi-joinHidden', key);
      }
    };
  };
  return WifiJoinHidden;
});
