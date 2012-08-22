/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var VIEW_TOPUP = 'topup-view';
var DIALOG_SERVICE_UNAVAILABLE = 'service-unavailable-info-dialog';
var DIALOG_APPLICATION_ERROR = 'application-error-info-dialog';

// The ViewManager is in charge of simply manage the different views of the
// applications. VeewManager,changeViewTo() valid values are lister above
// these lines.
var ViewManager = (function cc_setUpViewManager() {

  var _currentView = null;

  // Make target enter screen's main area.
  function _changeViewTo(viewId) {
    _closeCurrentView();

    var view = document.getElementById(viewId);
    _currentView = {
      id: viewId,
      defaultViewport: view.dataset.viewport
    };

    // With a combination of CSS, we actually animate and display the view
    view.dataset.viewport = '';
  }

  // Close the current view returning to the previous one
  function _closeCurrentView() {
    if (!_currentView)
      return;

    var view = document.getElementById(_currentView.id);

    // With a combination of CSS, Restoring the last viewport we actually
    // animate and hide the current view
    view.dataset.viewport = _currentView.defaultViewport;
    _currentView = null;
  }

  return {
    changeViewTo: _changeViewTo,
    closeCurrentView: _closeCurrentView
  };
}());
