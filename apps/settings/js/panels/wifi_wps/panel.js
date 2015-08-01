define(function(require) {
  'use strict';

  var DialogPanel = require('modules/dialog_panel');
  var WifiWps = require('panels/wifi_wps/wifi_wps');

  return function ctor_wpsWifi() {
    var wifiWps = WifiWps();
    var elements = {};

    return DialogPanel({
      onInit: function(panel) {
        elements.panel = panel;
        elements.submitWpsButton = panel.querySelector('button[type=submit]');
        elements.apSelectionArea = panel.querySelector('.wifi-wps-pin-aps');
        elements.apSelect = elements.apSelectionArea.querySelector('select');
        elements.pinItem = panel.querySelector('.wifi-wps-pin-area');
        elements.pinDesc = elements.pinItem.querySelector('p');
        elements.pinInput = elements.pinItem.querySelector('input');
        elements.wpsMethodRadios = panel.querySelectorAll('gaia-radio');

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
        options.wpsAvailableNetworks().then((networks) => {
          this._updateApList(networks);
        });
      },
      onSubmit: function() {
        var selectedAp = elements.apSelect.options[
          elements.apSelect.selectedIndex].value;
        var selectedMethod = elements.panel.querySelector(
          'gaia-radio[checked]').value;
        var pin = elements.pinInput.value;

        return Promise.resolve({
          selectedAp: selectedAp,
          selectedMethod: selectedMethod,
          pin: pin
        });
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
        option.setAttribute('data-l10n-id', 'wpsAnyAp');
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
          'gaia-radio[checked]').value;

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
