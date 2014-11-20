/* global AccessibilityHelper, LazyLoader */
/* exported ViewManager */
/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ViewManager = (function() {

  // The ViewManager is in charge of simply manage the different views of the
  // applications. ViewManager.changeViewTo() valid values are listed above
  // these lines.
  function ViewManager(tabs) {
    tabs = tabs || [];

    this._tabs = {};
    tabs.forEach(function _registerTab(tabItem) {
      if (typeof tabItem !== 'object') {
        tabItem = { id: tabItem };
      }
      this._tabs[tabItem.id] = tabItem.tab || 'left';
    }, this);

    this._currentView = null;
    this._currentTab = null;

  }

  // Return true if the passed view is a tab
  ViewManager.prototype._isTab = function _isTab(view) {
    return this._tabs.hasOwnProperty(view);
  };

  // Make target enter screen's main area and call callback after, passing as
  // arguments if the new view is a tab, the new view id and a third parameter
  // depending on if the view was a tab or not:
  //   If it is a tab: it returns the current overlay view id or null
  //   If it is not a tab: it returns the previous ovrlay view or null
  ViewManager.prototype.changeViewTo = function _changeViewTo(viewHash,
                                                              obstructed,
                                                              callback) {
    var hashParts = viewHash.split('?');
    var viewId = hashParts[0];
    if (this.isCurrentView(viewId)) {
      return;
    }

    // Note here how we set the same value with different semantincs.
    // This is used at the end of the function and the names are the correct
    // because, depending on if the view is a tab or not, semantics may change.
    var previousViewId, currentViewId;
    previousViewId = currentViewId = this._currentView ?
                                     this._currentView.id : null;

    var view = document.getElementById(viewId);
    var params = parseQueryParams(hashParts[1]);
    var self = this;

    // lazy load HTML of the panel
    this.loadPanel(view, function() {
      // Tabs are treated in a different way than overlay views
      var isTab = self._isTab(viewId);
      if (isTab) {

        // Disposing the current view
        var disposingTab = null;
        if (self._currentTab) {
          disposingTab = document.getElementById(self._currentTab);
        }
        if (disposingTab) {
          disposingTab.dataset.viewport = self._tabs[disposingTab.id];
          document.getElementById(disposingTab.id + '-filter').classList.remove(
            '.selected');
        }
        // Showing the new one
        view.dataset.viewport = '';
        document.getElementById(view.id + '-filter').classList.add('.selected');
        AccessibilityHelper.setAriaSelected(
          document.getElementById(view.id + '-control'),
          document.querySelectorAll('[role="tab"]'));

        self._currentTab = viewId;

      // Overlay view
      } else {
        self.closeCurrentView();
        previousViewId = self._currentView ? self._currentView.id : '';
        self._currentView = {
          id: viewId,
          defaultViewport: view.dataset.viewport,
          obstructed: obstructed
        };

        // With a combination of CSS, we actually animate and display the view
        delete view.dataset.viewport;
        if (obstructed) {
          document.querySelector(obstructed).classList.add('behind');
        }
      }

      if (typeof callback === 'function') {
        callback(isTab, viewId, isTab ? currentViewId : previousViewId);
      }
      notifyViewChange(isTab, viewId, params);
    });
  };

  function notifyViewChange(isTab, current, params) {
    var type = isTab ? 'tabchanged' : 'viewchanged';
    var event = new CustomEvent(type, {
      detail: {
        id: current,
        params: params
      }
    });
    window.dispatchEvent(event);
  }

  ViewManager.prototype.loadPanel = function _loadPanel(panel, callback) {
    if (!panel || panel.hidden === false) {
      if (typeof callback === 'function') {
        callback();
      }
      return;
    }

    LazyLoader.load(panel, function() {
      var resourceRemaining = 0;

      function loadResource(node) {
        node.onload = onResourceLoaded;
        document.head.appendChild(node);
        resourceRemaining++;
      }

      // activate all styles
      Array.from(panel.querySelectorAll('link')).forEach((node) => {
        if (!document.querySelector('head > link[href="' + node.href + '"]')) {
          var styleLink = document.createElement('link');
          styleLink.href = node.href;
          styleLink.media = node.media;
          styleLink.rel = node.rel;
          styleLink.type = node.type;

          loadResource(styleLink);
        }
        node.remove();
      });

      // activate all scripts
      Array.from(panel.querySelectorAll('script')).forEach((node) => {
        if (!document.querySelector('head > script[src="' + node.src + '"]')) {
          var scriptLink = document.createElement('script');
          scriptLink.src = node.src;
          scriptLink.type = node.type;

          loadResource(scriptLink);
        }
        node.remove();
      });

      // add listeners
      var headers = Array.from(
        panel.querySelectorAll('gaia-header[action="close"]')
      );
      headers.forEach((headerWithClose) => {
        headerWithClose.addEventListener('action', function() {
          window.parent.location.hash = '#';
        });
      });

      panel.hidden = false;

      checkCallback();

      function checkCallback() {
        if (resourceRemaining === 0 && typeof callback === 'function') {
          callback();
        }
      }

      function onResourceLoaded() {
        resourceRemaining--;
        checkCallback();
      }
    });
  };

  // Close the current view returning to the previous one
  ViewManager.prototype.closeCurrentView = function _closeCurrentView() {
    if (!this._currentView) {
      return;
    }

    var view = document.getElementById(this._currentView.id);

    // With a combination of CSS, Restoring the last viewport we actually
    // animate and hide the current view
    view.dataset.viewport = this._currentView.defaultViewport;

    if (this._currentView.obstructed) {
      var obstructed = document.querySelector(this._currentView.obstructed);
      obstructed.classList.remove('behind');
    }
    this._currentView = null;
  };

  // Test if the current view is the one passed as parameter
  ViewManager.prototype.isCurrentView = function _isCurrentView(view) {
    return this._currentView && this._currentView.id === view;
  };

  // Return the current view id or null if not current view
  ViewManager.prototype.getCurrentView = function _getCurrentView() {
    return this._currentView ? this._currentView.id : null;
  };

  // Return true if the tab id passed is the current tab
  ViewManager.prototype.isCurrentTab = function _isCurrentTab(tab) {
    return this._currentTab && this._currentTab === tab;
  };

  // Return the current tab
  ViewManager.prototype.getCurrentTab = function _getCurrentTab() {
    return this._currentTab;
  };

  function parseQueryParams(queryParams) {
    var params = {};

    queryParams = (queryParams || '').split('&');
    queryParams.forEach(function(param) {
      if (!param) { return; }

      var pair = param.split('=');
      var key = pair[0];
      var value = pair[1];

      if (params[key]) {
        if (!Array.isArray(params[key])) {
          params[key] = [params[key]];
        }

        params[key].push(value);
        return;
      }

      params[key] = value;
    });

    return params;
  }

  return ViewManager;
}());
