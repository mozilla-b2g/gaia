/* global TilesView, ListView, SubListView, SearchView */

'use strict';

var Visibility = {
  get _isPlayerLoaded() {
    return (typeof PlayerView !== 'undefined');
  },

  init: function() {
    // Push the PlayerView to views later because it's lazy loaded.
    this._views = [TilesView, ListView, SubListView, SearchView];
    this._views.forEach(function(view) {
      view._innerHTML = '';
    });

    window.addEventListener(
      'visibilitychange', this._visibilityHandler.bind(this)
    );
  },

  _visibilityHandler: function(event) {
    // Does hiding the body helps to trigger the memory gc in gecko?
    document.body.hidden = document.hidden;
    // Swap the anchors' innerHTML to temp strings when it's invisible, then
    // switch back when they are visible again.
    this._swapInnerHTML();
  },

  _swapInnerHTML: function() {
    if (this._isPlayerLoaded && this._views.indexOf(PlayerView) === -1) {
      PlayerView._innerHTML = '';
      this._views.push(PlayerView);
    }

    this._views.forEach(function(view) {
      var anchor;
      // Check the views and point the anchor to the right parent.
      if (this._isPlayerLoaded && view === PlayerView) {
        anchor = view.cover;
      } else if (view === SearchView) {
        anchor = view.view;
      } else {
        anchor = view.anchor;
      }

      var tempHTML = view._innerHTML;
      view._innerHTML = anchor.innerHTML;
      anchor.innerHTML = tempHTML;
    }.bind(this));
  }
};

Visibility.init();
