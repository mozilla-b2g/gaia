/**
 * Handle display panel functionality, which will change the value of
 * screen.automatic-brightness of settings.
 *
 * @module display/display
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SliderHandler = require('panels/display/slider_handler');

  const AUTO_BRIGHTNESS_SETTING = 'screen.automatic-brightness';
  const SCREEN_BRIGHTNESS = 'screen.brightness';
  /**
   * @alias module:display/display
   * @class Display
   * @returns {Display}
   */
  var Display = function() {
    this.elements = null;
  };

  Display.prototype = {
    /**
     * Init Display module with doms and data of device-features.json.
     *
     * @access public
     * @memberOf Display.prototype
     * @param {HTMLElement} elements
     * @param {Object} data
     *                 content of resources/device-features.json.
     */
    init: function d_init(elements, data) {
      this.elements = elements;
      this.initBrightnessItems(data);
      SliderHandler().init(
        elements.brightnessManualInput,
        SCREEN_BRIGHTNESS);
    },

    /**
     * Decide whether to show brightnessAuto and brightnessManual options.
     *
     * @access public
     * @memberOf Display.prototype
     * @param {Object} data
     *                 content of resources/device-features.json.
     */
    initBrightnessItems: function d_init_brightness_items(data) {
      var brightnessAuto = this.elements.brightnessAuto;
      var brightnessAutoCheckbox = this.elements.brightnessAutoCheckbox;
      var brightnessManual = this.elements.brightnessManual;
      var brightnessManualInput = this.elements.brightnessManualInput;

      if (data.ambientLight) {
        brightnessAuto.hidden = false;
        // Observe auto brightness setting
        SettingsListener.observe(AUTO_BRIGHTNESS_SETTING, false,
          function(value) {
            brightnessAutoCheckbox.checked = value;
            brightnessManual.hidden = value;
          }.bind(this));
      } else {
        brightnessAuto.hidden = true;
        brightnessManual.hidden = false;
        var cset = {};
        cset[AUTO_BRIGHTNESS_SETTING] = false;
        SettingsListener.getSettingsLock().set(cset);
      }
      // Observe screen brightness setting
      SettingsListener.observe(SCREEN_BRIGHTNESS, 0.5, function(value) {
        brightnessManualInput.value = value;
      }.bind(this));
    }
  };

  return function ctor_display() {
    return new Display();
  };
});
