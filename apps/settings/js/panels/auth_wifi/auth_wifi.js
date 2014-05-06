define(function(require) {
  'use strict';
  var _ = navigator.mozL10n.get;
  var WifiAuth = function() {
    return {
      onInit: function(panel) {
        this._elements = {};
        this._elements.ssid = panel.querySelector('[data-ssid]');
        this._elements.signal = panel.querySelector('[data-signal]');
        this._elements.security = panel.querySelector('[data-security]');
      },
      onBeforeShow: function(panel, options) {
        panel.dataset.security = options.security;
        this._elements.ssid.textContent = options.network.ssid;
        this._elements.signal.textContent = _('signalLevel' + options.sl);
        this._elements.security.textContent =
          options.security || _('securityNone');
      },
      onShow:function() {

      },
      onBeforeHide: function() {

      }
    };
  };
  return WifiAuth;
});
