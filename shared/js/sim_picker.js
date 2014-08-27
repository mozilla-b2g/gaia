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

      var dialViaElt = document.getElementById('sim-picker-dial-via');
      if (phoneNumber) {
        navigator.mozL10n.setAttributes(dialViaElt,
                                        'sim-picker-dial-via-with-number',
                                        {phoneNumber: phoneNumber});
      } else {
        dialViaElt.setAttribute('data-l10n-id', 'sim-picker-select-sim');
      }

      this._buildDom();

      var simButtons = this._simPickerElt.querySelectorAll(
        'button[data-card-index]');

      for (var i = 0; i < simButtons.length; i++) {
        if (simButtons[i].dataset.cardIndex == defaultCardIndex) {
          simButtons[i].classList.add('is-default');
        } else {
          simButtons[i].classList.remove('is-default');
        }
      }

      // we want to wait for l10n to happen before we display the UI
      navigator.mozL10n.once(function() {
        this._simPickerElt.hidden = false;
        this._simPickerElt.focus();
      }.bind(this));
    },

    _buildDom: function() {
      if (this._domBuilt) {
        return;
      }

      this._domBuilt = true;

      var templateNode = document.getElementById(
          'sim-picker-button-template');

      for (var i = 0; i < navigator.mozIccManager.iccIds.length; i++) {
        var clonedNode = templateNode.cloneNode(true);
        clonedNode.dataset.cardIndex = i;

        var button = clonedNode.querySelector('.js-sim-picker-button');
        navigator.mozL10n.setAttributes(button,
                                        'sim-picker-button',
                                        {n: i + 1});
        templateNode.parentNode.insertBefore(clonedNode, templateNode);
      }
      templateNode.remove();

      this._simPickerElt.addEventListener('click', this);

      // because this code is not reacting to l10n.js Mutation Observer
      // we need to manually retranslate the content
      // XXX: Remove once bug 1040922 is fixed
      navigator.mozL10n.ready(function() {
        navigator.mozL10n.translateFragment(this._simPickerElt);
      }.bind(this));
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
