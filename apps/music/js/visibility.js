/* global TilesView, ListView, SubListView */

'use strict';

var Visibility = {
  get _isPlayerLoaded() {
    return (typeof PlayerView !== 'undefined');
  },

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
    if (this._isPlayerLoaded) {
      if (this._views.indexOf(PlayerView) === -1) {
        PlayerView._innerHTML = '';
        this._views.push(PlayerView);
      }
    }

    this._views.forEach(function(view) {
      var anchor = (this._isPlayerLoaded && view === PlayerView) ?
        view.cover : view.anchor;
      var tempHTML = view._innerHTML;
      view._innerHTML = anchor.innerHTML;
      anchor.innerHTML = tempHTML;
    }.bind(this));
  }
};

Visibility.init();
