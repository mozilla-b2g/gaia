/**
 * Panel is the basic element for navigation. Which defines Six basic
 * functions: show, hide, beforeShow, beforeHide, init, and uninit for
 * navigation. These functions are called by `SettingsService` during the
 * navigation.
 * Internal functions _onShow, _onHide, _onBeforeShow, _onBeforeHide, _onInit,
 * and _onUninit are called respectively in the basic functions.
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
    var _onInit = options.onInit || _emptyFunc;
    var _onUninit = options.onUninit || _emptyFunc;
    var _onShow = options.onShow || _emptyFunc;
    var _onHide = options.onHide || _emptyFunc;
    var _onBeforeShow = options.onBeforeShow || _emptyFunc;
    var _onBeforeHide = options.onBeforeHide || _emptyFunc;

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

        _onInit(panel, initOptions);
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

        _onUninit();
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
        this.init(panel, showOptions);
        _onShow(panel, showOptions);
      },

      /**
       * Called when the panel is navigated out of the viewport.
       *
       * @alias module:Panel#hide
       */
      hide: function() {
        _onHide();
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
        this.init(panel, beforeShowOptions);
        _onBeforeShow(panel, beforeShowOptions);
      },

      /**
       * Called when the panel is about to be navigated out of the viewport.
       *
       * @alias module:Panel#beforeHide
       * @param {HTMLElement} panel
       * @param {Object} beforeShowOptions
       */
      beforeHide: function() {
        _onBeforeHide();
      }
    };
  };
  return Panel;
});
