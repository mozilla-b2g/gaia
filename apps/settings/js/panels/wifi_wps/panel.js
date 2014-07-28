define(function(require) {
  'use strict';

  var _ = navigator.mozL10n.get;
  var SettingsPanel = require('modules/settings_panel');
  var WifiContext = require('modules/wifi_context');
  var WifiWps = require('panels/wifi_wps/wifi_wps');

  return function ctor_wpsWifi() {
    var wifiWps = WifiWps();
    var elements = {};

    return SettingsPanel({
      onInit: function(panel) {
        elements.panel = panel;
        elements.submitWpsButton = panel.querySelector('button[type=submit]');
        elements.apSelectionArea = panel.querySelector('.wifi-wps-pin-aps');
        elements.apSelect = elements.apSelectionArea.querySelector('select');
        elements.pinItem = panel.querySelector('.wifi-wps-pin-area');
        elements.pinDesc = elements.pinItem.querySelector('p');
        elements.pinInput = elements.pinItem.querySelector('input');
        elements.wpsMethodRadios = panel.querySelectorAll('input[type=radio]');

        // Check validWpsPin each time when typing
        elements.pinInput.oninput = function() {
          elements.submitWpsButton.disabled =
            !wifiWps._isValidWpsPin(elements.pinInput.value);
        };

        for (var i = 0; i < elements.wpsMethodRadios.length; i++) {
          elements.wpsMethodRadios[i].onchange = this._onWpsMethodChange;
        }
        this._onWpsMethodChange();
      },
      onBeforeShow: function(panel, options) {
        this._cleanupApList();
        this._updateApList(options.wpsAvailableNetworks);
      },
      onBeforeHide: function() {
        // Store information on the context to make them accessible from
        // other panels.
        WifiContext.wpsOptions.selectedAp = elements.apSelect.options[
          elements.apSelect.selectedIndex].value;

        WifiContext.wpsOptions.selectedMethod = elements.panel.querySelector(
          'input[type=\'radio\']:checked').value;

        WifiContext.wpsOptions.pin = elements.pinInput.value;
      },
      _cleanupApList: function() {
        var apSelect = elements.apSelect;
        while (apSelect.hasChildNodes()) {
          apSelect.removeChild(apSelect.firstChild);
        }
      },
      _updateApList: function(wpsAvailableNetworks) {
        // Add the first option
        var option = document.createElement('option');
        option.textContent = _('wpsAnyAp');
        option.value = 'any';
        elements.apSelect.appendChild(option);

        // Add the other networks
        for (var i = 0; i < wpsAvailableNetworks.length; i++) {
          option = document.createElement('option');
          option.textContent = wpsAvailableNetworks[i].ssid;
          option.value = wpsAvailableNetworks[i].bssid;
          elements.apSelect.appendChild(option);
        }
      },
      _onWpsMethodChange: function() {
        var method = elements.panel.querySelector(
          'input[type=\'radio\']:checked').value;

        if (method === 'apPin') {
          elements.submitWpsButton.disabled =
            !wifiWps._isValidWpsPin(elements.pinInput.value);
          elements.pinItem.hidden = false;
        } else {
          elements.submitWpsButton.disabled = false;
          elements.pinItem.hidden = true;
        }
        elements.apSelectionArea.hidden = method === 'pbc';
      }
    });
  };
});
