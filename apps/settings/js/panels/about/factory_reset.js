/**
 * Handle factory reset functionality
 *
 * @module about/FactoryReset
 */
define(function(require) {
  'use strict';

  /**
   * @alias module:about/FactoryReset
   * @class FactoryReset
   * @returns {FactoryReset}
   */
  var FactoryReset = function() {
    this._elements = null;
  };

  FactoryReset.prototype = {
    /**
     * initialization
     *
     * @access public
     * @memberOf FactoryReset.prototype
     * @param {HTMLElement} elements
     */
    init: function fr_init(elements) {
      this._elements = elements;
      if (navigator.mozPower) {
        this._elements.resetButton.disabled = false;
        this._elements.resetButton.addEventListener('click',
          this._resetClick.bind(this));
      } else {
        // disable button if mozPower is undefined or can't be used
        this._elements.resetButton.disabled = true;
      }
    },

    /**
     * click handler.
     *
     * @access private
     * @memberOf FactoryReset.prototype
     */
    _resetClick: function fr__resetClick() {
      this._elements.resetDialog.hidden = false;
      this._elements.resetCancel.onclick = function() {
        this._elements.resetDialog.hidden = true;
      }.bind(this);
      this._elements.resetConfirm.onclick = function() {
        this._factoryReset();
        this._elements.resetDialog.hidden = true;
      }.bind(this);
    },

    /**
     * call mozPower API to reset device
     *
     * @access private
     * @memberOf FactoryReset.prototype
     */
    _factoryReset: function fr__factoryReset() {
      var power = navigator.mozPower;
      if (!power) {
        console.error('Cannot get mozPower');
        return;
      }

      if (!power.factoryReset) {
        console.error('Cannot invoke mozPower.factoryReset()');
        return;
      }

      power.factoryReset();
    }
  };

  return function ctor_factoryReset() {
    return new FactoryReset();
  };
});
