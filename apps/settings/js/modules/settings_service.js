/**
 * SettingsService is a singleton that provides the navigation service. It
 * gets the corresponding panel module from PanelCache and call to its basic
 * functions when navigating.
 *
 * @module SettingsService
 */
define(function(require) {
    'use strict';

    var PageTransitions = require('modules/page_transitions');
    var PanelCache = require('modules/panel_cache');
    var ScreenLayout = require('shared/screen_layout');
    var Settings = require('settings');

    var _rootPanelId = null;
    /**
     * _currentNavigation caches information of the current panel including id,
     * element, module, and options.
     */
    var _currentNavigation = null;
    var _navigating = false;
    var _pendingNavigationRequest = null;

    var _cachedNavigation = null;
    var _cachedNavigationOptions = {};

    var _activityHandler = null;

    var _getAppNameToLink = function ss_get_app_name_to_link(panelId) {
      var reAppName = /app:(\w+)/;
      var name = reAppName.exec(panelId);
      return name && name[1];
    };

    var _getAppInfo = function ss_get_app_info(appName) {
      // We can customize the path for specific apps
      var _supportedAppInFrame = {
        keyboard: {},
        bluetooth: {}
      };

      var appInfo = _supportedAppInFrame[appName];
      if (!appInfo) {
        return false;
      }

      var prefix = 'app://' + appName + '.gaiamobile.org/';
      var defaultSrc = prefix + 'settings.html';
      var appMozapp = prefix + 'manifest.webapp';
      var appSrc = appInfo.src ? prefix + appInfo.src : defaultSrc;

      return {
        src: appSrc,
        mozapp: appMozapp
      };
    };

    var _isTabletAndLandscape = function ss_is_tablet_and_landscape() {
      return ScreenLayout.getCurrentLayout('tabletAndLandscaped');
    };

    var _retriveParentPanelId = function ss_retriveParentPanelId(panelId) {
      var headerSelector = '#' + panelId + ' > gaia-header';
      var header = document.querySelector(headerSelector);
      return (header && header.dataset.href || '').replace('#', '');
    };

    var _shallCloseActivity = function ss_shallCloseActivity(panelId) {
      // If we're handling an activity and the 'back' button is hit, close the
      // activity if the panel id to be navigated equals the parent panel id.

      // This is for the root panel
      if (panelId === 'home') {
        return true;
      }

      if (!_currentNavigation) {
        return false;
      }

      // Get the parent panel id of the current panel.
      var parentPanelId = _retriveParentPanelId(_currentNavigation.panelId);

      // Close the activity if the current panel is the original target panel,
      // and the new panel is the parent panel of the current panel.
      return _currentNavigation.panelId === _activityHandler.targetPanelId &&
        panelId === parentPanelId;
    };

    var _transit = function ss_transit(oldPanel, newPanel, callback) {
      var promise = new Promise(function(resolve) {
        var wrappedCallback = function() {
          if (typeof callback === 'function') {
            callback();
          }
          resolve();
        };

        if (_isTabletAndLandscape()) {
          PageTransitions.twoColumn(oldPanel, newPanel, wrappedCallback);
        } else {
          PageTransitions.oneColumn(oldPanel, newPanel, wrappedCallback);
        }
      });
      return promise;
    };

    var _loadPanel = function ss_loadPanel(panelId) {
      var panelElement = document.getElementById(panelId);
      if (panelElement.dataset.rendered) { // already initialized
        return;
      }
      panelElement.dataset.rendered = true;

      panelElement.innerHTML = panelElement.firstChild.textContent;
    };

    var _loadSubpanels = function(panel, callback) {
      requestAnimationFrame(function() {
        var sub = document.querySelector('section[id^="' + panel.id + '-"]');
        [].forEach.call(sub, function(p) {
          _loadPanel(p.id);
        });

        if (callback) {
          requestAnimationFrame(callback);
        }
      });
    };

    var _onVisibilityChange = function ss_onVisibilityChange() {
      _handleVisibilityChange(!document.hidden);
    };

    /**
     * When the app becomes invisible, we should call to beforeHide and hide
     * functions of the current panel. When the app becomes visible, we should
     * call to beforeShow and show functions of the current panel with the
     * cached options.
     */
    var _handleVisibilityChange = function ss_onVisibilityChange(visible) {
      if (!_currentNavigation) {
        return;
      }

      var panel = _currentNavigation.panel;
      var element = _currentNavigation.panelElement;
      var options = _currentNavigation.options;

      if (!panel) {
        return;
      }

      if (visible) {
        panel.beforeShow(element, options);
        panel.show(element, options);
      } else {
        panel.beforeHide();
        panel.hide();
      }
    };

    var _navigate = function ss_navigate(panelId, options, callback) {
      // Early return if the panel to be navigated is the same as the
      // current one.
      if (_currentNavigation && _currentNavigation.panelId === panelId) {
        callback();
        return;
      }

      function go() {
        var newPanelElement = document.getElementById(panelId);
        var isFirstRender = !newPanelElement.dataset.rendered;

        _loadPanel(panelId);

        var currentPanelId =
           _currentNavigation && _currentNavigation.panelId;
        var currentPanel = _currentNavigation && _currentNavigation.panel;
        var currentPanelElement =
          _currentNavigation && _currentNavigation.panelElement;

        _cachedNavigation = _currentNavigation;
        _cachedNavigationOptions = options;

        options = options || {};

        if (isFirstRender) {
          newPanelElement.dataset.firstTransition = true;
        }

        requestAnimationFrame(function() {
          var transitAnim = _transit(currentPanelElement, newPanelElement);

          PanelCache.get(panelId, function(panel) {
            var hideEvents = currentPanel && currentPanelId !== _rootPanelId;

            var showHideChain = Promise.resolve().then(function() {
              return hideEvents && currentPanel.beforeHide();
            }).then(function() {
              return panel.beforeShow(newPanelElement, options);
            }).then(function() {
              return panel.show(newPanelElement, options);
            }).then(function() {
              delete newPanelElement.dataset.firstTransition;
            }).then(function() {
              return hideEvents && currentPanel.hide();
            }).then(function() {
              callback();
            });

            if (newPanelElement.dataset.requireSubPanels) {
              Promise.all([ showHideChain, transitAnim ]).then(function() {
                _loadSubpanels(newPanelElement);
              });
            }

            _currentNavigation = {
              panelId: panelId,
              panel: panel,
              panelElement: newPanelElement,
              options: options
            };

            // XXX we need to remove this line in the future
            // to make sure we won't manipulate Settings
            // directly
            Settings._currentPanel = '#' + panelId;
          });
        });
      }

      if (navigator.mozL10n.readyState === 'complete') {
        go();
      } else {
        navigator.mozL10n.once(go);
      }
    };

    return {
      reset: function ss_reset() {
        _rootPanelId = null;
        _currentNavigation = null;
        _cachedNavigation = null;
        _cachedNavigationOptions = {};
        _activityHandler = null;
        _navigating = false;
        _pendingNavigationRequest = null;
        window.removeEventListener('visibilitychange', _onVisibilityChange);
      },

      /**
       * Init SettingsService.
       *
       * @alias module:SettingsService#init
       * @param {Object} options
       * @param {String} options.rootPanelId
       *                 Panel with the specified id is assumed to be be kept on
       *                 on the screen always. We don't call to its hide and
       *                 beforeHide functions.
       * @param {Object} options.context
       *                 The launch context specifying the default panel and the
       *                 activity handler if the app is invoked by web
       *                 activities.
       * @param {String} options.context.initialPanelId
       * @param {ActivityHandler} options.context.activityHandler
       */
      init: function ss_init(options) {
        if (options) {
          _rootPanelId = options.rootPanelId || 'root';
          _activityHandler = options.context && options.context.activityHandler;
        }

        window.addEventListener('visibilitychange', _onVisibilityChange);
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
        // Check if the app is invoked by web activity and shall post result.
        if (_activityHandler && _shallCloseActivity(panelId)) {
          _activityHandler.postResult();
          return;
        }

        // Cache the navigation request if it is navigating.
        if (_navigating) {
          _pendingNavigationRequest = arguments;
          return;
        }

        // If we find out the link includes information about app's name,
        // it means that we are going to embed the app into our app.
        //
        // In this way, we have to navigate to `frame` panel and embed it.
        var appName = _getAppNameToLink(panelId);
        if (appName) {
          var appInfo = _getAppInfo(appName);

          if (!appInfo) {
            console.error('We only embed trust apps.');
            return;
          }

          panelId = 'frame';
          options = options || {};
          options.mozapp = appInfo.mozapp;
          options.src = appInfo.src;
        }

        _navigating = true;
        _navigate(panelId, options, (function() {
          _navigating = false;

          // Navigate to the pending navigation if any.
          if (_pendingNavigationRequest) {
            var args = _pendingNavigationRequest;
            _pendingNavigationRequest = null;
            this.navigate.apply(this, args);
          }

          if (callback) {
            callback();
          }
        }).bind(this));
      },

      /**
       * Go back to previous panel
       *
       * @alias module:SettingsService#back
       */
      back: function ss_back() {
        if (_cachedNavigation) {
          this.navigate(_cachedNavigation.panelId, _cachedNavigationOptions);
          _cachedNavigation = null;
          _cachedNavigationOptions = {};
        }
      }
    };
});
