'use strict';

/* global IMERender */

(function(exports) {

/**
 * AlternativesCharMenuManager is responsible of manage the state of the
 * alternatives char menu. It also responsible of figure out the menu target
 * to redirect to if applicable.
 */
var AlternativesCharMenuManager = function(app) {
  this.app = app;

  this.isShown = false;

  this._originalTarget = null;
  this._hasMovedAwayFromOriginalTarget = false;
  this._menuAreaTop =
    this._menuAreaLeft =
    this._menuAreaRight =
    this._menuAreaBottom = 0;
};

AlternativesCharMenuManager.prototype.start = function() {
  this._menuContainer = this.app.getMenuContainer();
};

AlternativesCharMenuManager.prototype.stop = function() {
  this._menuContainer = null;
};

AlternativesCharMenuManager.prototype.show = function(target) {
  var alternatives = this._getAlternativesForTarget(target);
  if (!alternatives) {
    return;
  }

  // Get the targetRect before menu is shown.
  var targetRect = target.getBoundingClientRect();

  // XXX: Remove reference to IMERender in the global in the future.
  IMERender.showAlternativesCharMenu(target, alternatives);
  this.isShown = true;

  this._originalTarget = target;
  this._hasMovedAwayFromOriginalTarget = false;

  // XXX: We probably introduced a sync reflow here.
  var menuRect = this._menuContainer.getBoundingClientRect();

  // The menu area the area right under the menu where we should redirect
  // the active target from what's under the finger to a key on the menu.

  // This ensures there is no gap between the menu and the area.
  this._menuAreaTop = Math.min(targetRect.top, menuRect.bottom);
  // Ensure the target key is entire covered by picking the leftmost value
  this._menuAreaLeft = Math.min(targetRect.left, menuRect.left);
  // Simply the bottom of the target key.
  this._menuAreaBottom = targetRect.bottom;
  // Ensure the target key is entire covered by picking the rightmost value
  this._menuAreaRight = Math.max(targetRect.right, menuRect.right);
};

AlternativesCharMenuManager.prototype._getAlternativesForTarget =
function _getAlternativesForTarget(target) {
  // Handle key alternatives
  var alternatives;
  var altMap = this.app.layoutManager.currentModifiedLayout.alt;

  if (this.app.upperCaseStateManager.isUpperCaseLocked) {
    alternatives = (altMap[target.dataset.uppercaseValue].upperCaseLocked) ?
      altMap[target.dataset.uppercaseValue].upperCaseLocked :
      altMap[target.dataset.uppercaseValue];
  } else if (this.app.upperCaseStateManager.isUpperCase) {
    alternatives = altMap[target.dataset.uppercaseValue];
  } else {
    alternatives = altMap[target.dataset.lowercaseValue];
  }

  if (!alternatives || !alternatives.length) {
    return false;
  }
  // Copy the array so render.js can't modify the original.
  return [].concat(alternatives);
};

AlternativesCharMenuManager.prototype.hide = function() {
  if (!this.isShown) {
    return;
  }

  // XXX: Remove reference to IMERender in the global in the future.
  IMERender.hideAlternativesCharMenu();
  this.isShown = false;

  this._originalTarget = null;
  this._hasMovedAwayFromOriginalTarget = false;
  this._menuAreaTop =
    this._menuAreaLeft =
    this._menuAreaRight =
    this._menuAreaBottom = 0;
};

AlternativesCharMenuManager.prototype.isMenuTarget = function(target) {
  return (target.parentNode === this._menuContainer);
};

AlternativesCharMenuManager.prototype.getMenuTarget = function(press) {
  if (!this.isShown) {
    throw new Error('AlternativesCharMenuManager: ' +
      'getMenuTarget called but menu is not shown');
  }

  var children = this._menuContainer.children;
  var xOffset = press.pageX - this._menuAreaLeft - 1;
  var menuWidth = this._menuAreaRight - this._menuAreaLeft;

  // If the press.target is still the original target, we should always
  // return the first alternative (the one on top of the key).
  if (!this._hasMovedAwayFromOriginalTarget &&
      press.target === this._originalTarget) {
    // Return the alternative right on the top of the target key.
    // The alternative can be either the last one in the DOM or the first one.
    // We figure out which one with math and rounding.
    return children[Math.round(xOffset / menuWidth) * (children.length - 1)];
  }

  this._hasMovedAwayFromOriginalTarget = true;

  // Simply get and return the nth children with linear math.
  return children[Math.floor(xOffset / menuWidth * children.length)];
};

AlternativesCharMenuManager.prototype.isInMenuArea = function(press) {
  if (!this.isShown) {
    return false;
  }

  return (press.pageY >= this._menuAreaTop &&
          press.pageY <= this._menuAreaBottom &&
          press.pageX >= this._menuAreaLeft &&
          press.pageX <= this._menuAreaRight);
};

exports.AlternativesCharMenuManager = AlternativesCharMenuManager;

})(window);
