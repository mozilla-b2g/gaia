/**
 * SettingsService is a singleton that provides the navigation service. It
 * gets the corresponding panel module from PanelCache and call to its basic
 * functions when navigating.
 *
 * @module SettingsService
 */
define(['modules/page_transitions', 'modules/panel_cache',
        'shared/screen_layout', 'shared/lazy_loader'],
  function(PageTransitions, PanelCache, ScreenLayout, LazyLoader) {
    'use strict';

    var _rootPanelId = null;

    var _currentPanelId = null;
    var _currentPanel = null;
    var _navigating = false;

    var _pendingNavigation = null;

    var _isTabletAndLandscape = function ss_is_tablet_and_landscape() {
      return ScreenLayout.getCurrentLayout('tabletAndLandscaped');
    };

    var _transit = function ss_transit(oldPanel, newPanel, callback) {
      if (_isTabletAndLandscape()) {
        PageTransitions.twoColumn(oldPanel, newPanel, callback);
      } else {
        PageTransitions.oneColumn(oldPanel, newPanel, callback);
      }
    };

    var _loadPanel = function ss_loadPanel(panelId, callback) {
      var panelElement = document.getElementById(panelId);
      if (panelElement.dataset.rendered) { // already initialized
        callback();
        return;
      }
      panelElement.dataset.rendered = true;

      // XXX remove SubPanel loader once sub panel are modulized
      if (panelElement.dataset.requireSubPanels) {
        // load the panel and its sub-panels (dependencies)
        // (load the main panel last because it contains the scripts)
        var selector = 'section[id^="' + panelElement.id + '-"]';
        var subPanels = document.querySelectorAll(selector);
        for (var i = 0, il = subPanels.length; i < il; i++) {
          LazyLoader.load([subPanels[i]]);
        }
        LazyLoader.load([panelElement], callback);
      } else {
        LazyLoader.load([panelElement], callback);
      }
    };

    var _navigate = function ss_navigate(panelId, options, callback) {
      _loadPanel(panelId, function() {
        PanelCache.get(panelId, function(panel) {
          // Check if there is any pending navigation.
          if (_pendingNavigation) {
            callback();
            return;
          }

          var newPanelElement = document.getElementById(panelId);
          var currentPanelElement =
            _currentPanelId ? document.getElementById(_currentPanelId) : null;
          // Prepare options and calls to the panel object's before
          // show function.
          options = options || {};

          panel.beforeShow(newPanelElement, options);
          // We don't deactivate the root panel.
          if (_currentPanel && _currentPanelId !== _rootPanelId) {
            _currentPanel.beforeHide();
          }

          // Add a timeout for smoother transition.
          setTimeout(function doTransition() {
            _transit(currentPanelElement, newPanelElement,
              function transitionCompleted() {
                panel.show(newPanelElement, options);
                // We don't deactivate the root panel.
                if (_currentPanel && _currentPanelId !== _rootPanelId) {
                  _currentPanel.hide();
                }

                _currentPanelId = panelId;
                _currentPanel = panel;

                callback();
            });
          });
        });
      });
    };

    return {
      /**
       * Init SettingsService.
       *
       * @alias module:SettingsService#init
       * @param {String} rootPanelId
       *                 Panel with the specified id is assumed to be be kept on
       *                 on the screen always. We don't call to its hide and
       *                 beforeHide functions.
       */
      init: function ss_init(rootPanelId) {
        _rootPanelId = rootPanelId;
      },

      /**
       * Navigate to a panel with options. The navigation transition is
       * determined based on the current screen size and orientation.
       *
       * @alias module:SettingsService#navigate
       * @param {String} panelId
       * @param {Object} options
       * @param {Function} callback
       */
      navigate: function ss_navigate(panelId, options, callback) {
        // Cache the navigation request if it is navigating.
        if (_navigating) {
          _pendingNavigation = arguments;
          return;
        }

        _navigating = true;
        _navigate(panelId, options, (function() {
          _navigating = false;

          // Navigate to the pending navigation if any.
          if (_pendingNavigation) {
            var args = _pendingNavigation;
            _pendingNavigation = null;
            this.navigate.apply(this, args);
          }

          if (callback) {
            callback();
          }
        }).bind(this));
      }
    };
});
