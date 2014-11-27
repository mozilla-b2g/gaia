/**
 * Panel is the basic element for navigation. Which defines Six basic
 * functions: show, hide, beforeShow, beforeHide, init, and uninit for
 * navigation. These functions are called by `SettingsService` during the
 * navigation.
 * Internal functions onShow, onHide, onBeforeShow, onBeforeHide, onInit,
 * and onUninit are called respectively in the basic functions.
 *
 * @module Panel
 */
define(function() {
  'use strict';

  var _emptyFunc = function panel_emptyFunc() {};

  /**
   * @alias module:Panel
   * @param {Object} options
   *                 Options are used to override the internal functions.
   * @returns {Panel}
   */
  var Panel = function ctor_panel(options) {
    var _initialized = false;

    options = options || {};
    options.onInit = options.onInit || _emptyFunc;
    options.onUninit = options.onUninit || _emptyFunc;
    options.onShow = options.onShow || _emptyFunc;
    options.onHide = options.onHide || _emptyFunc;
    options.onBeforeShow = options.onBeforeShow || _emptyFunc;
    options.onBeforeHide = options.onBeforeHide || _emptyFunc;

    return {
      /**
       * Get a value that indicates whether the panel has been initialized.
       *
       * @alias module:Panel#initialized
       * @return {Boolean}
       */
      get initialized() {
        return _initialized;
      },

      /**
       * Called at the first time when the beforeShow function is called.
       *
       * @alias module:Panel#init
       * @param {HTMLElement} panel
       * @param {Object} initOptions
       */
      init: function(panel, initOptions) {
        if (_initialized) {
          return;
        }
        _initialized = true;

        return options.onInit(panel, initOptions);
      },

      /**
       * Called when cleanup.
       *
       * @alias module:Panel#uninit
       */
      uninit: function() {
        if (!_initialized) {
          return;
        }
        _initialized = false;

        options.onUninit();
      },

      /**
       * Called when the panel is navigated into the viewport.
       *
       * @alias module:Panel#show
       * @param {HTMLElement} panel
       * @param {Object} showOptions
       */
      show: function(panel, showOptions) {
        // Initialize at the first call to show if necessary.
        return Promise.resolve(this.init(panel, showOptions)).then(function() {
          return options.onShow(panel, showOptions);
        });
      },

      /**
       * Called when the panel is navigated out of the viewport.
       *
       * @alias module:Panel#hide
       */
      hide: function() {
        return options.onHide();
      },

      /**
       * Called when the panel is about to be navigated to into the viewport.
       *
       * @alias module:Panel#beforeShow
       * @param {HTMLElement} panel
       * @param {Object} beforeShowOptions
       */
      beforeShow: function(panel, beforeShowOptions) {
        // Initialize at the first call to beforeShow.
        return Promise.resolve(this.init(panel, beforeShowOptions)).then(
          function() {
            return options.onBeforeShow(panel, beforeShowOptions);
        });
      },

      /**
       * Called when the panel is about to be navigated out of the viewport.
       *
       * @alias module:Panel#beforeHide
       * @param {HTMLElement} panel
       * @param {Object} beforeShowOptions
       */
      beforeHide: function() {
        return options.onBeforeHide();
      }
    };
  };
  return Panel;
});
