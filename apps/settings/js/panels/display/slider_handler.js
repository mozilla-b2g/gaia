/**
 * Update setting value based on slider position.
 * Base on sound panel's implementation.
 *
 * @module SliderHandler
 */
define(function(require) {
  'use strict';

  const INTERVAL = 300;

  var SliderHandler = function() {
    this._element = null;
    this._key = '';
    this._isFirstInput = false;
    this._intervalID = null;
  };

  SliderHandler.prototype = {
    /**
     * initialization
     *
     * The sliders listen to input, touchstart and touchend events to fit
     * the ux requirements, and when the user tap or drag the sliders, the
     * sequence of the events is:
     * touchstart -> input -> input(more if dragging) -> touchend -> input
     *
     * @access public
     * @memberOf SliderHandler.prototype
     * @param  {Object} element html elements
     * @param  {String} settings key
     */
    init: function d_init(element, key) {
      this._element = element;
      this._key = key;

      this._boundSetSliderValue = function(value) {
        this._setSliderValue(value);
      }.bind(this);

      // We can't use the input change event because it does not fire
      // when the slider is being dragged, and will only fire when released.
      this._element.addEventListener('touchstart',
        this._touchStartHandler.bind(this));
      this._element.addEventListener('input',
        this._inputHandler.bind(this));
      this._element.addEventListener('touchend',
        this._touchEndHandler.bind(this));
    },

    /**
     * Change slider's value
     *
     * @access private
     * @memberOf SliderHandler.prototype
     * @param {Number} value slider value
     */
    _setSliderValue: function d_setSliderValue(value) {
      this._element.value = value;
    },

    /**
     * Handle touchstart event
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _touchStartHandler: function d_touchStartHandler(event) {
      this._isFirstInput = true;
    },

    /**
     * Update setting
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _updateSetting: function d_updateSetting() {
      var value = this._element.value;
      var settingObject = {};
      settingObject[this._key] = value;

      // Only set the new value if it does not equal to the previous one
      if (value !== this._previous) {
        navigator.mozSettings.createLock().set(settingObject);
        this._previous = value;
      }
    },

    /**
     * Handle input event
     *
     * The mozSettings api is not designed to call rapidly, so we use
     * setInterval() as a timer to ease the number of calling, or we
     * will see the queued callbacks try to update the slider's value
     * which we are unable to avoid and make bad ux for the users.
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _inputHandler: function d_inputHandler(event) {
      if (this._isFirstInput) {
        this._isFirstInput = false;
        this._updateSetting();
        this._intervalID =
          setInterval(this._updateSetting.bind(this), INTERVAL);
      }
    },

    /**
     * Handle touchend event
     *
     * @access private
     * @memberOf SliderHandler.prototype
     */
    _touchEndHandler: function d_touchEndHandler(event) {
      clearInterval(this._intervalID);
      this._updateSetting();
    }
  };

  return function ctor_sliderHandler() {
    return new SliderHandler();
  };
});
