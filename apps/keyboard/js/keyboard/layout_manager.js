'use strict';

/* global Promise, KeyboardEvent, LayoutLoader */

/** @fileoverview These are special keyboard layouts.
 * Language-specific layouts are in individual js files in layouts/ .
 */

(function(exports) {

/**
 * LayoutManager do one and only simply job: Allow you to switch currentLayout,
 * tell you when it is ready, and give you access to it.
 */
var LayoutManager = function() {
  this.currentLayout = null;
};

LayoutManager.prototype.start = function() {
  this.loader = new LayoutLoader();
  this.loader.start();

  this._switchStateId = 0;
};

/*
 * Switch switchCurrentLayout() will switch the current method to the
 * desired layout.
 *
 * This method returns a promise and it resolves when the layout is ready.
 *
 */
LayoutManager.prototype.switchCurrentLayout = function(layoutName) {
  var switchStateId = ++this._switchStateId;

  var loaderPromise = this.loader.getLayoutAsync(layoutName);

  var p = loaderPromise.then(function(layout) {
    if (switchStateId !== this._switchStateId) {
      console.log('LayoutManager: ' +
        'Promise is resolved after another switchCurrentLayout() call. ' +
        'Reject the promise instead.');

      return Promise.reject(new Error(
        'LayoutManager: switchCurrentLayout() is called again before ' +
        'resolving.'));
    }

    this.currentLayout = layout;

    // resolve to undefined
    return;
  }.bind(this), function(error) {
    return Promise.reject(error);
  }.bind(this));

  return p;
};

exports.LayoutManager = LayoutManager;

})(window);
