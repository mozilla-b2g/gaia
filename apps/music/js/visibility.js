/* global TilesView, ListView, SubListView */

'use strict';

var Visibility = {
  init: function() {
    this._views = [TilesView, ListView, SubListView];
    this._views.forEach(function(view) {
      view._innerHTML = '';
    });

    window.addEventListener(
      'visibilitychange', this._visibilityHandler.bind(this)
    );
  },

  _visibilityHandler: function(event) {
    document.body.hidden = document.hidden;

    this._swapInnerHTML();
  },

  _swapInnerHTML: function() {
    this._views.forEach(function(view) {
      var innerHTML = view._innerHTML;
      view._innerHTML = view.anchor.innerHTML;
      view.anchor.innerHTML = innerHTML;
    });
  }
};

Visibility.init();
