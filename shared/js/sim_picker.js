/* exported SimPicker */

'use strict';

(function(exports) {
  /**
   * SimPicker is a helper for dynamically generating menus for selecting SIM
   * cards when making calls, sending SMS, etc. It also returns any currently
   * in-use SIMs if there is an active call, but only when an app has
   * mozTelephony permissions.
   */
  var SimPicker = {
    _domBuilt: false,
    _simPickerElt: null,

    getOrPick: function hk_getOrPick(defaultCardIndex,
                                     phoneNumber,
                                     simSelectedCallback) {
      this._simSelectedCallback = simSelectedCallback;
      this._simPickerElt = document.getElementById('sim-picker');

      if (window.TelephonyHelper) {
        var inUseSim = window.TelephonyHelper.getInUseSim();
        if (inUseSim !== null) {
          simSelectedCallback(inUseSim);
          return;
        }
      }

      this._buildDom();
      var self = this;
      navigator.mozL10n.ready(function() {
        var dialViaElt = document.getElementById('sim-picker-dial-via');
        if (phoneNumber) {
          navigator.mozL10n.localize(
            dialViaElt, 'sim-picker-dial-via-with-number',
            {phoneNumber: phoneNumber});
        } else {
          navigator.mozL10n.localize(dialViaElt, 'sim-picker-select-sim');
        }

        var simButtons = self._simPickerElt.querySelectorAll(
          'button[data-card-index]');

        for (var i = 0; i < simButtons.length; i++) {
          if (simButtons[i].dataset.cardIndex == defaultCardIndex) {
            simButtons[i].classList.add('is-default');
          } else {
            simButtons[i].classList.remove('is-default');
          }
        }

        self._simPickerElt.hidden = false;
        self._simPickerElt.focus();
      });
    },

    _buildDom: function() {
      if (this._domBuilt) {
        return;
      }

      this._domBuilt = true;
      var self = this;
      navigator.mozL10n.ready(function() {
        var templateNode = document.getElementById(
          'sim-picker-button-template');

        for (var i = 0; i < navigator.mozIccManager.iccIds.length; i++) {
          var clonedNode = templateNode.cloneNode(true);
          clonedNode.dataset.cardIndex = i;

          var button = clonedNode.querySelector('.js-sim-picker-button');
          navigator.mozL10n.localize(button, 'sim-picker-button', {n: i + 1});
          templateNode.parentNode.insertBefore(clonedNode, templateNode);
        }
        templateNode.remove();

        self._simPickerElt.addEventListener('click', self);
      });
    },

    handleEvent: function(e) {
      if (e) {
        e.preventDefault();
      }
      if (e.target.nodeName !== 'BUTTON') {
        return;
      }

      if (e.target.dataset.cardIndex) {
        this._simSelectedCallback(e.target.dataset.cardIndex);
      }
      document.getElementById('sim-picker').hidden = true;
    }
  };

  exports.SimPicker = SimPicker;

})(window);
