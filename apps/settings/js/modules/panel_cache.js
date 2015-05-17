/**
 * PanelCache is a singleton that loads a panel module based on the panel id
 * and caches the loaded modules.
 *
 * @module PanelCache
 */
define(function(require) {
    'use strict';

    var SettingsPanel = require('modules/settings_panel');
    var LazyLoader = require('shared/lazy_loader');

    var _panelCache = {};
    var _panelStylesheetsLoaded = false;

    // experiment result shows
    // load all related styles once is time saver
    var _loadPanelStylesheetsIfNeeded = function loadPanelCSS() {
      if (_panelStylesheetsLoaded) {
        return;
      }

      LazyLoader.load(['shared/style/action_menu.css',
                       'shared/style/confirm.css',
                       'shared/style/progress_activity.css',
                       'shared/js/component_utils.js',
                       'shared/elements/gaia_buttons/script.js',
                       'shared/elements/gaia_confirm/script.js',
                       'style/apps.css',
                       'style/screen_lock.css',
                       'style/simcard.css',
                       'style/updates.css',
                       'style/downloads.css',
                       'style/developer_service_workers.css'],
      function callback() {
        _panelStylesheetsLoaded = true;
      });
    };

    // load styles in idle time after document loaded
    navigator.addIdleObserver({
      time: 3,
      onidle: _loadPanelStylesheetsIfNeeded
    });

    return {
      // this is for unit test
      reset: function spc_reset() {
        _panelCache = {};
        _panelStylesheetsLoaded = false;
      },

      /**
       * Get the panel module of a specified id. If there is no corresponding
       * panel module of the id, it returns SettingsPanel.
       *
       * @alias module:PanelCache#get
       * @param {String} panelId
       *                 The id of the to be loaded panel.
       * @param {Function} callback
       *                   The function to be called when the panel is loaded.
       */
      get: function spc_get(panelId, callback) {
        if (!panelId && !callback) {
          return;
        }

        if (panelId !== 'root') {
          _loadPanelStylesheetsIfNeeded();
        }

        var cachedPanel = _panelCache[panelId];
        if (cachedPanel) {
          if (callback) {
            callback(cachedPanel);
          }
        } else {
          // Get the path of the panel creation function
          var panelElement = document.getElementById(panelId);
          if (panelElement) {
            var pathElement = panelElement.querySelector('panel');
            var path = pathElement ? pathElement.dataset.path : null;

            var panelFuncLoaded = function(panelFunc) {
              var panel = panelFunc();
              _panelCache[panelId] = panel;
              if (callback) {
                callback(panel);
              }
            };

            if (path) {
              require([path], function(panelFunc) {
                // Create a new panel object for static panels.
                panelFuncLoaded(panelFunc ? panelFunc : SettingsPanel);
              });
            } else {
              panelFuncLoaded(SettingsPanel);
            }
          } else {
            if (callback) {
              callback(null);
            }
          }
        }
      }
    };
});
