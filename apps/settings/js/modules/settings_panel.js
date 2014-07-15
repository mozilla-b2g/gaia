/**
 * SettingsPanel extends Panel with basic settings services. It presets the UI
 * elements based on the values in mozSettings and add listeners responding to
 * mozSettings changes in onReady. In onInit it parses the panel element for
 * activating links. It also removes listeners in onDone so that we can avoid
 * unwanted UI updates when the panel is outside of the viewport.
 *
 * @module SettingsPanel
 */
define(function(require) {
    'use strict';

    var Panel = require('modules/panel');
    var SettingsCache = require('modules/settings_cache');
    var PanelUtils = require('modules/panel_utils');

    var _emptyFunc = function panel_emptyFunc() {};

    /**
     * @alias module:SettingsPanel
     * @param {Object} options
     *                 Options are used to override the internal functions of
     *                 Panel.
     * @returns {SettingsPanel}
     */
    var SettingsPanel = function ctor_SettingsPanel(options) {
      /**
       * The root element of the panel.
       *
       * @type {HTMLElement}
       */
      var _panel = null;

      /**
       * The handler is called when settings change.
       *
       * @param {Event} event
       */
      var _settingsChangeHandler = function(event) {
        PanelUtils.onSettingsChange(_panel, event);
      };

      /**
       * Add listeners to make the panel be able to respond to setting changes
       * and user interactions.
       *
       * @param {HTMLElement} panel
       */
      var _addListeners = function panel_addListeners(panel) {
        if (!panel) {
          return;
        }

        SettingsCache.addEventListener('settingsChange',
          _settingsChangeHandler);
        panel.addEventListener('change', PanelUtils.onInputChange);
        panel.addEventListener('click', PanelUtils.onLinkClick);
      };

      /**
       * Remove all listeners.
       *
       * @param {HTMLElement} panel
       */
      var _removeListeners = function panel_removeListeners(panel) {
        if (!panel) {
          return;
        }

        SettingsCache.removeEventListener('settingsChange',
          _settingsChangeHandler);
        panel.removeEventListener('change', PanelUtils.onInputChange);
        panel.removeEventListener('click', PanelUtils.onLinkClick);
      };

      options = options || {};
      options.onInit = options.onInit || _emptyFunc;
      options.onUninit = options.onUninit || _emptyFunc;
      options.onShow = options.onShow || _emptyFunc;
      options.onHide = options.onHide || _emptyFunc;
      options.onBeforeShow = options.onBeforeShow || _emptyFunc;

      return Panel({
        onInit: function(panel, initOptions) {
          if (!panel) {
            return;
          }

          _panel = panel;
          PanelUtils.activate(panel);

          return options.onInit(panel, initOptions);
        },
        onUninit: function() {
          _removeListeners(_panel);
          _panel = null;

          options.onUninit();
        },
        onShow: function(panel, showOptions) {
          return options.onShow(panel, showOptions);
        },
        onHide: function() {
          // Remove listeners.
          _removeListeners(_panel);

          return options.onHide();
        },
        onBeforeShow: function(panel, beforeShowOptions) {
          // Preset the panel every time when it is presented.
          PanelUtils.preset(panel);
          _addListeners(panel);
          return options.onBeforeShow(panel, beforeShowOptions);
        },
        onBeforeHide: function() {
          return options.onBeforeHide();
        }
      });
    };
    return SettingsPanel;
});
