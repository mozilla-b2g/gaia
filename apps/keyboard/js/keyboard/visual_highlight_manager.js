'use strict';

(function(exports) {

/**
 * VisualHighlightManager show and hide visual highlight of keys.
 */
var VisualHighlightManager = function(app) {
  this.app = app;

  this.highlightDelayTimers = new Map();
};

VisualHighlightManager.prototype.HIGHTLIGHT_DELAY_MS = 85;

VisualHighlightManager.prototype.start = function() {
};

VisualHighlightManager.prototype.stop = function() {
};

VisualHighlightManager.prototype.show = function(target) {
  this.highlightDelayTimers.forEach(function(timer, target) {
    clearTimeout(timer);
    this.highlightDelayTimers.delete(target);
    this.app.viewManager.unHighlightKey(target);
  }, this);

  this.app.viewManager.highlightKey(target);
};

VisualHighlightManager.prototype.hide = function(target) {
  if (this.highlightDelayTimers.has(target)) {
    clearTimeout(this.highlightDelayTimers.get(target));
  }

  var timer = setTimeout(function() {
    this.highlightDelayTimers.delete(target);
    this.app.viewManager.unHighlightKey(target);
  }.bind(this), this.HIGHTLIGHT_DELAY_MS);

  this.highlightDelayTimers.set(target, timer);
};

exports.VisualHighlightManager = VisualHighlightManager;

})(window);
