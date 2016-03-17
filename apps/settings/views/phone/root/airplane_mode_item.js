/**
 * This module is used to control the background stuff when users
 * toggle on/off airplane mode checkbox.
 *
 * @module views/phone/root/airplane_mode_item
 */
define(function(require) {
  'use strict';

  var AirplaneModeHelper = require('shared/airplane_mode_helper');

  /**
   * @alias module:views/phone/root/airplane_mode_item
   * @class AirplaneModeItem
   * @param {HTMLElement} element the checkbox for airplane mode
   * @returns {AirplaneModeItem}
   */
  function AirplaneModeItem(element) {
    this._itemEnabled = false;
    this._element = element;
    this.init();
    this._boundAPMStateChange = this._onAPMStateChange.bind(this);
  }

  AirplaneModeItem.prototype = {
    /**
     * The value indicates whether the module is responding.
     *
     * @access public
     * @memberOf AirplaneModeItem.prototype
     * @type {Boolean}
     */
    set enabled(value) {
      if (this._itemEnabled === value) {
        return;
      } else {
        this._itemEnabled = value;
        if (this._itemEnabled) {
          AirplaneModeHelper.addEventListener('statechange',
            this._boundAPMStateChange);
        } else {
          AirplaneModeHelper.removeEventListener('statechange',
            this._boundAPMStateChange);
        }
      }
    },

    /**
     * The value indicates whether the module is responding.
     *
     * @access public
     * @memberOf AirplaneModeItem.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._itemEnabled;
    },

    /**
     * This function is used to reflect current status of APM to checkbox
     *
     * @access private
     * @memberOf AirplaneModeItem.prototype
     * @param {String} status current status of APM
     * @type {Function}
     */
    _onAPMStateChange: function ami_onAPMStateChange(status) {
      if (status === 'enabled' || status === 'disabled') {
        this._element.checked = (status === 'enabled') ? true : false;
        this._element.disabled = false;
      } else {
        this._element.disabled = true;
      }
    },

    /**
     * Initialize function
     *
     * @access public
     * @memberOf AirplaneModeItem.prototype
     * @type {Function}
     */
    init: function ami_init() {
      AirplaneModeHelper.ready(function() {
        // handle change on radio
        this._element.addEventListener('change', () => {
          this._element.setAttribute('disabled', true);
          AirplaneModeHelper.setEnabled(this._element.checked);
        });

        // initial status
        var status = AirplaneModeHelper.getStatus();
        this._element.checked = (status === 'enabled') ? true : false;
        // Bug 1217717 disable the Airplane mode interaction
        // before the wifi panel is ready
        this._element.disabled = true;
        window.addEventListener('wificontext-ready', this);
      }.bind(this));
    },

    handleEvent: function ami_handleEvent(evt) {
      switch (evt.type) {
        // Bug 1217717 enable the Airplane mode interaction
        // once the wifi panel is ready
        case 'wificontext-ready':
          window.removeEventListener('wificontext-ready', this);
          this._element.disabled = false;
          break;
      }
    }
  };

  return function ctor_airplane_mode_item(element) {
    return new AirplaneModeItem(element);
  };
});
