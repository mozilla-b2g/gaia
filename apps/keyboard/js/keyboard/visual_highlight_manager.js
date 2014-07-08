'use strict';

/* global IMERender */

(function(exports) {

/**
 * VisualHighlightManager show and hide visual highlight of keys.
 */
var VisualHighlightManager = function(app) {
  this.app = app;
};

VisualHighlightManager.prototype.start = function() {
};

VisualHighlightManager.prototype.stop = function() {
};

VisualHighlightManager.prototype.show = function(target) {
  var showUpperCase = this.app.isCapitalized();
  IMERender.highlightKey(target, { showUpperCase: showUpperCase });
};

VisualHighlightManager.prototype.hide = function(target) {
  IMERender.unHighlightKey(target);
};

exports.VisualHighlightManager = VisualHighlightManager;

})(window);
