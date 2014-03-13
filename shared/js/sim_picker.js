/* global LazyL10n */
/* exported SimPicker */

'use strict';

(function(exports) {
  /*
   * SimPicker is a helper to dynamically generate menus for selecting SIM
   * cards when making calls, sending SMS, etc.
   */
  var SimPicker = {
    _domBuilt: false,
    _simPickerElt: null,

    show: function hk_show(defaultCardIndex, phoneNumber, simSelectedCallback) {
      this._simSelectedCallback = simSelectedCallback;
      this._simPickerElt = document.getElementById('sim-picker');

      this._buildDom();
      var self = this;
      LazyL10n.get(function() {
        var dialViaElt = document.getElementById('sim-picker-dial-via');
        navigator.mozL10n.localize(
          dialViaElt, 'sim-picker-dial-via', {phoneNumber: phoneNumber});

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
      });
    },

    _buildDom: function() {
      if (this._domBuilt) {
        return;
      }

      this._domBuilt = true;
      var self = this;
      LazyL10n.get(function() {
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

        var simPickerElt = document.getElementById('sim-picker');
        simPickerElt.addEventListener('click', self);
      });
    },

    handleEvent: function(e) {
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
