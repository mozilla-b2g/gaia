define(function(require) {
  'use strict';
  var _ = navigator.mozL10n.get;

  var WifiWps = function() {
    return {
      onInit: function(panel) {
        this._elements = {};
        this._elements.panel = panel;
        this._elements.submitWpsButton =
          panel.querySelector('button[type=submit]');

        this._elements.apSelectionArea =
          panel.querySelector('#wifi-wps-pin-aps');
        this._elements.apSelect =
          this._elements.apSelectionArea.querySelector('select');

        this._elements.pinItem =
          panel.querySelector('#wifi-wps-pin-area');
        this._elements.pinDesc =
          this._elements.pinItem.querySelector('p');
        this._elements.pinInput =
          this._elements.pinItem.querySelector('input');

        this._elements.wpsMethodRadios =
          panel.querySelectorAll('input[type=radio]');

        // Check validWpsPin each time when typing
        this._elements.pinInput.oninput = function() {
          this._elements.submitWpsButton.disabled =
            !this._isValidWpsPin(this._elements.pinInput.value);
        }.bind(this);

        for (var i = 0; i < this._elements.wpsMethodRadios.length; i++) {
          this._elements.wpsMethodRadios[i].onchange =
            this._onWpsMethodChange.bind(this);
        }

        this._onWpsMethodChange();
      },
      onBeforeShow: function(panel, options) {
        this._cleanupApList();
        this._updateApList(options.wpsAvailableNetworks);
      },
      onBeforeHide: function() {

      },
      _cleanupApList: function() {
        while (this._elements.apSelect.hasChildNodes()) {
          this._elements.apSelect.removeChild(
            this._elements.apSelect.firstChild
          );
        }
      },
      _updateApList: function(wpsAvailableNetworks) {
        // Add the first option
        var option = document.createElement('option');
        option.textContent = _('wpsAnyAp');
        option.value = 'any';
        this._elements.apSelect.appendChild(option);

        // Add the other networks
        for (var i = 0; i < wpsAvailableNetworks.length; i++) {
          option = document.createElement('option');
          option.textContent = wpsAvailableNetworks[i].ssid;
          option.value = wpsAvailableNetworks[i].bssid;
          this._elements.apSelect.appendChild(option);
        }
      },
      _isValidWpsPin: function(pin) {
        if (pin.match(/[^0-9]+/)) {
          return false;
        }
        if (pin.length === 4) {
          return true;
        }
        if (pin.length !== 8) {
          return false;
        }
        var num = pin - 0;
        return this._pinChecksum(Math.floor(num / 10)) === (num % 10);
      },
      _pinChecksum: function(pin) {
        var accum = 0;
        while (pin > 0) {
          accum += 3 * (pin % 10);
          pin = Math.floor(pin / 10);
          accum += pin % 10;
          pin = Math.floor(pin / 10);
        }
        return (10 - accum % 10) % 10;
      },
      _onWpsMethodChange: function() {
        var method = this._elements.panel.querySelector(
          "input[type='radio']:checked").value;

        if (method === 'apPin') {
          this._elements.submitWpsButton.disabled =
            !this._isValidWpsPin(this._elements.pinInput.value);
          this._elements.pinItem.hidden = false;
        } else {
          this._elements.submitWpsButton.disabled = false;
          this._elements.pinItem.hidden = true;
        }
        this._elements.apSelectionArea.hidden = method === 'pbc';
      }
    };
  };

  return WifiWps;
});
