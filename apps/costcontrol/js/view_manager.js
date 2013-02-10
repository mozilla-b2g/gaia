/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// The ViewManager is in charge of simply manage the different views of the
// applications. ViewManager.changeViewTo() valid values are listed above
// these lines.
var ViewManager = function ViewManager(tabs) {
  tabs = tabs || [];

  this._tabs = {};
  tabs.forEach(function _registerTab(tabId) {
    this._tabs[tabId] = true;
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
ViewManager.prototype.changeViewTo = function _changeViewTo(viewId, callback) {
  this.closeCurrentView();

  var previousViewId, currentViewId;

  // Note here how we set the same value with different semantincs.
  // This is used at the end of the function and the names are the correct
  // because, depending on if the view is a tab or not, semantics may change.
  previousViewId = currentViewId = this._currentView ?
                                   this._currentView.id : null;
  var isTab = this._isTab(viewId);

  // Tabs are treated in a different way than overlay views
  if (isTab) {
    // Hide all
    for (var tabId in this._tabs) if (this._tabs.hasOwnProperty(tabId)) {
      document.getElementById(tabId).dataset.viewport = 'behind';
      document.getElementById(tabId + '-filter')
        .setAttribute('aria-selected', 'false');
    }

    // Show the proper one
    document.getElementById(viewId).dataset.viewport = '';
    document.getElementById(viewId + '-filter')
      .setAttribute('aria-selected', 'true');

    this._currentTab = viewId;

  // Overlay view
  } else {
    var view = document.getElementById(viewId);
    var previousViewId = this._currentView ? this._currentView.id : '';
    this._currentView = {
      id: viewId,
      defaultViewport: view.dataset.viewport
    };

    // With a combination of CSS, we actually animate and display the view
    view.dataset.viewport = '';
  }

  if (callback) {
    callback(isTab, viewId, isTab ? currentViewId : previousViewId);
  }
};

// Close the current view returning to the previous one
ViewManager.prototype.closeCurrentView = function _closeCurrentView() {
  // Tabs can not be closed
  if (!this._currentView || this._isTab(this._currentView.id)) {
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
