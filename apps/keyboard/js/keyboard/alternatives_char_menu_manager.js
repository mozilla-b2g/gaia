'use strict';

(function(exports) {

/**
 * AlternativesCharMenuManager is responsible of manage the state of the
 * alternatives char menu. It also responsible of figure out the menu target
 * to redirect to if applicable.
 */
var AlternativesCharMenuManager = function(app) {
  this.app = app;
  this.isShown = false;
};

AlternativesCharMenuManager.prototype.start = function() {
};

AlternativesCharMenuManager.prototype.stop = function() {
};

AlternativesCharMenuManager.prototype.show = function(target) {
  var alternatives = this._getAlternativesForTarget(target);
  if (!alternatives) {
    return;
  }

  var renderingManager = this.app.layoutRenderingManager;
  renderingManager.showAlternativesCharMenu(target, alternatives);
  this.isShown = true;
};

AlternativesCharMenuManager.prototype._getAlternativesForTarget =
function _getAlternativesForTarget(key) {
  // Handle key alternatives
  var alternatives;
  var altMap = this.app.layoutManager.currentPage.alt;
  var origKey = null;

  if (this.app.upperCaseStateManager.isUpperCaseLocked) {
    origKey = key.uppercaseValue;
    alternatives = altMap[origKey] &&
      (altMap[origKey].upperCaseLocked || altMap[origKey]);
  } else if (this.app.upperCaseStateManager.isUpperCase) {
    origKey = key.uppercaseValue;
    alternatives = altMap[origKey];
  } else {
    origKey = key.lowercaseValue;
    alternatives = altMap[origKey];
  }

  if (!alternatives || !alternatives.length) {
    return false;
  }
  // Copy the array so render.js can't modify the original.
  return [].concat(origKey, alternatives);
};

AlternativesCharMenuManager.prototype.hide = function() {
  if (!this.isShown) {
    return;
  }

  this.app.layoutRenderingManager.hideAlternativesCharMenu();
  this.isShown = false;
};

AlternativesCharMenuManager.prototype.isMenuTarget = function(target) {
  if (!this.isShown) {
    return false;
  }

  return this.app.layoutRenderingManager.isMenuTarget(target);
};

AlternativesCharMenuManager.prototype.getMenuTarget = function(press) {
  if (!this.isShown) {
    throw new Error('AlternativesCharMenuManager: ' +
      'getMenuTarget called but menu is not shown');
  }

  return this.app.layoutRenderingManager.getMenuTarget(press);
};

AlternativesCharMenuManager.prototype.isInMenuArea = function(press) {
  if (!this.isShown) {
    return false;
  }

  return this.app.layoutRenderingManager.isInMenuArea(press);
};

exports.AlternativesCharMenuManager = AlternativesCharMenuManager;

})(window);
