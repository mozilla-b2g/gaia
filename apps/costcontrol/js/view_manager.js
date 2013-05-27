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

  };

  // Return true if the passed view is a tab
  ViewManager.prototype._isTab = function _isTab(view) {
    return this._tabs.hasOwnProperty(view);
  };

  // Make target enter screen's main area and call callback after, passing as
  // arguments if the new view is a tab, the new view id and a third parameter
  // depending on if the view was a tab or not:
  //   If it is a tab: it returns the current overlay view id or null
  //   If it is not a tab: it returns the previous ovrlay view or null
  ViewManager.prototype.changeViewTo = function _changeViewTo(viewId,
                                                              callback) {
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

    // lazy load HTML of the panel
    this.loadPanel(view);

    // Tabs are treated in a different way than overlay views
    var isTab = this._isTab(viewId);
    if (isTab) {

      // Disposing the current view
      var disposingTab = null;
      if (this._currentTab) {
        disposingTab = document.getElementById(this._currentTab);
      }
      if (disposingTab) {
        disposingTab.dataset.viewport = this._tabs[disposingTab.id];
        document.getElementById(disposingTab.id + '-filter')
          .setAttribute('aria-selected', 'false');
      }

      // Showing the new one
      view.dataset.viewport = '';
      document.getElementById(view.id + '-filter')
        .setAttribute('aria-selected', 'true');

      this._currentTab = viewId;

    // Overlay view
    } else {
      this.closeCurrentView();
      var previousViewId = this._currentView ? this._currentView.id : '';
      this._currentView = {
        id: viewId,
        defaultViewport: view.dataset.viewport
      };

      // With a combination of CSS, we actually animate and display the view
      delete view.dataset.viewport;
    }

    if (callback) {
      callback(isTab, viewId, isTab ? currentViewId : previousViewId);
    }
    notifyViewChange(isTab, viewId);
  };

  function notifyViewChange(isTab, current) {
    var type = isTab ? 'tabchanged' : 'viewchanged';
    var event = new CustomEvent(type, { detail: current });
    window.dispatchEvent(event);
  }

  ViewManager.prototype.loadPanel = function _loadPanel(panel) {
    if (!panel || panel.hidden === false) return;

    // apply the HTML markup stored in the first comment node
    for (var i = 0; i < panel.childNodes.length; i++) {
      if (panel.childNodes[i].nodeType == document.COMMENT_NODE) {
        // XXX: Note we use innerHTML precisely because we need to parse the
        // content and we want to avoid overhead introduced by DOM
        // manipulations.
        panel.innerHTML = panel.childNodes[i].nodeValue;
        break;
      }
    }

    //activate all styles
    var styles = panel.querySelectorAll('link');
    for (var i = 0; i < styles.length; i++) {
      var styleHref = styles[i].href;
      if (!document.getElementById(styleHref)) {
        var style = document.createElement('link');
        style.href = style.id = styleHref;
        style.rel = 'stylesheet';
        style.type = 'text/css';
        style.media = 'all';
        document.head.appendChild(style);
      }
    }

    // translate content
    navigator.mozL10n.translate(panel);

    // activate all scripts
    var scripts = panel.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src');
      if (!document.getElementById(src)) {
        var script = document.createElement('script');
        script.type = 'application/javascript';
        script.src = script.id = src;
        document.head.appendChild(script);
      }
    }

    //add listeners
    var closeButtons = panel.querySelectorAll('.close-dialog');
    [].forEach.call(closeButtons, function(closeButton) {
      closeButton.addEventListener('click', function() {
        window.parent.location.hash = '#';
      });
    });

    panel.hidden = false;
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

  return ViewManager;
}());
