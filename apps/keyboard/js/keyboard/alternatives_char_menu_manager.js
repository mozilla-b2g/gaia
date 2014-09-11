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
  this._currentMenuView = null;
};

AlternativesCharMenuManager.prototype.stop = function() {
  this._currentMenuView = null;
};

AlternativesCharMenuManager.prototype.show = function(target) {
  var alternatives = this._getAlternativesForTarget(target);
  if (!alternatives) {
    return;
  }

  // Get the targetRect before menu is shown.
  var targetRect = target.getBoundingClientRect();

  // XXX: Remove reference to IMERender in the global in the future.
  this._currentMenuView = IMERender.showAlternativesCharMenu(target,
                                                             alternatives);
  this.isShown = true;

  this._originalTarget = target;
  this._hasMovedAwayFromOriginalTarget = false;

  // XXX: We probably introduced a sync reflow here.
  var menuRect = this._currentMenuView.getBoundingClientRect();

  // The menu area the area right under the menu where we should redirect
  // the active target from what's under the finger to a key on the menu.

  // This ensures there is no gap between the menu and the area.
  this._menuAreaTop = menuRect.top;
  // Ensure the target key is entire covered by picking the leftmost value
  this._menuAreaLeft = Math.min(targetRect.left, menuRect.left);

  // Extend a little bit for usability
  this._menuAreaLeft -= targetRect.width;

  // Simply the bottom of the target key.
  this._menuAreaBottom = targetRect.bottom;
  // Ensure the target key is entire covered by picking the rightmost value
  this._menuAreaRight = Math.max(targetRect.right, menuRect.right);

  // Extend a little bit for usability
  this._menuAreaRight += targetRect.width;
};

AlternativesCharMenuManager.prototype._getAlternativesForTarget =
function _getAlternativesForTarget(target) {
  // Handle key alternatives
  var alternatives;
  var altMap = this.app.layoutManager.currentPage.alt;
  var origKey = null;

  if (this.app.upperCaseStateManager.isUpperCaseLocked) {
    origKey = target.dataset.uppercaseValue;
    alternatives = altMap[origKey].upperCaseLocked ||
                   altMap[origKey];
  } else if (this.app.upperCaseStateManager.isUpperCase) {
    origKey = target.dataset.uppercaseValue;
    alternatives = altMap[origKey];
  } else {
    origKey = target.dataset.lowercaseValue;
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

  // XXX: Remove reference to IMERender in the global in the future.
  IMERender.hideAlternativesCharMenu();
  this.isShown = false;

  this._originalTarget = null;
  this._hasMovedAwayFromOriginalTarget = false;
  this._menuAreaTop =
    this._menuAreaLeft =
    this._menuAreaRight =
    this._menuAreaBottom = 0;
  this._currentMenuView = null;
};

AlternativesCharMenuManager.prototype.isMenuTarget = function(target) {
  if (!this._currentMenuView) {
    return false;
  }

  var menuContainer = this._currentMenuView.getMenuContainer();
  return (target.parentNode === menuContainer ||
          target === menuContainer);
};

AlternativesCharMenuManager.prototype.getMenuTarget = function(press) {
  if (!this.isShown) {
    throw new Error('AlternativesCharMenuManager: ' +
      'getMenuTarget called but menu is not shown');
  }

  var menuContainer = this._currentMenuView.getMenuContainer();
  var children = menuContainer.children;
  // If the press.target is still the original target, we should always
  // return the first alternative (the one on top of the key).
  if (!this._hasMovedAwayFromOriginalTarget &&
      press.target === this._originalTarget) {
    // Return the alternative right on the top of the target key.
    // The alternative should always be the first element in the DOM.
    return children[0];
  }

  this._hasMovedAwayFromOriginalTarget = true;

  return this._currentMenuView.getMenuTarget(press.clientX, press.clientY);
};

AlternativesCharMenuManager.prototype.isInMenuArea = function(press) {
  if (!this.isShown) {
    return false;
  }

  return (press.clientY >= this._menuAreaTop &&
          press.clientY <= this._menuAreaBottom &&
          press.clientX >= this._menuAreaLeft &&
          press.clientX <= this._menuAreaRight);
};

exports.AlternativesCharMenuManager = AlternativesCharMenuManager;

})(window);
