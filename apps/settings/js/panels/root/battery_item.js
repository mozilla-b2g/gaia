/**
 * The moudle supports displaying battery information on an element.
 *
 * @module panels/root/battery_item
 */
define(function(require) {
  'use strict';

  var Battery = require('modules/battery');

  /**
   * @alias module:panels/root/battery_item
   * @class BatteryItem
   * @requires module:modules/battery
   * @param {HTMLElement} element
                          The element displaying the battery information
   * @returns {BatteryItem}
   */
  function BatteryItem(element) {
    this._enabled = false;
    this._element = element;
    this._boundRefreshText = this._refreshText.bind(this, element);
  }

  BatteryItem.prototype = {
    /**
     * Refresh the text based on the Battery module.
     *
     * @access private
     * @memberOf BatteryItem.prototype
     * @param {HTMLElement} element
                            The element displaying the battery information
     */
    _refreshText: function b_refreshText(element) {
      if (!navigator.mozL10n) {
        return;
      }

      navigator.mozL10n.localize(element,
        'batteryLevel-percent-' + Battery.state, { level: Battery.level });
      if (element.hidden) {
        element.hidden = false;
      }
    },

    /**
     * The value indicates whether the module is responding.
     *
     * @access public
     * @memberOf BatteryItem.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      if (this._enabled === value) {
        return;
      }
      
      this._enabled = value;
      if (this._enabled) {
        Battery.observe('level', this._boundRefreshText);
        Battery.observe('state', this._boundRefreshText);
        this._boundRefreshText();
      } else {
        Battery.unobserve('level', this._boundRefreshText);
        Battery.unobserve('state', this._boundRefreshText);
      }
    }
  };

  return function ctor_batteryItem(element) {
    return new BatteryItem(element);
  };
});
