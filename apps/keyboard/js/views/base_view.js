'use strict';
(function(exports) {

/**
 * BaseView is the base of all simple views in the keyboard app.
 * It provides the common interface like, highlight() and hide().
 */
function BaseView(target, options, viewManager) {
  this.target = target;
  this.options = options;
  this.viewManager = viewManager;
}

//  element property is the DOM element created by this View instance.
BaseView.prototype.element = null;

BaseView.prototype.highlight = function() {
  this.element.classList.add('highlighted');
};

BaseView.prototype.unHighlight = function() {
  this.element.classList.remove('highlighted');
};

BaseView.prototype.show = function() {
  this.element.classList.remove('hide');
};

BaseView.prototype.hide = function() {
  this.element.classList.add('hide');
};

exports.BaseView = BaseView;

})(window);
