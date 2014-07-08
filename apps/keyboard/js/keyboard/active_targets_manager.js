'use strict';

/* global UserPressManager, AlternativesCharMenuManager */

(function(exports) {

/**
 * ActiveTargetsManager converts user press from UserPress instance,
 * figure out the active target to handle, and run the callback(s) accordingly.
 *
 * It is also responsible of triggering alternative char menu and block new
 * touches for the alternative char menu.
 * It is not responsible of user feedbacks because they can be depend on
 * the properties of target itself.
 *
 */
var ActiveTargetsManager = function(app) {
  this.app = app;
  this.activeTargets = null;

  this.userPressManager = null;
  this.alternativesCharMenuManager = null;

  this.longPressTimer = undefined;
};

ActiveTargetsManager.prototype.ontargetactivated = null;
ActiveTargetsManager.prototype.ontargetlongpressed = null;
ActiveTargetsManager.prototype.ontargetmovedout = null;
ActiveTargetsManager.prototype.ontargetmovedin = null;
ActiveTargetsManager.prototype.ontargetcommitted = null;
ActiveTargetsManager.prototype.ontargetcancelled = null;

// Show accent char menu (if there is one) or do other stuff
// after LONG_PRESS_TIMEOUT
ActiveTargetsManager.prototype.LONG_PRESS_TIMEOUT = 700;

ActiveTargetsManager.prototype.start = function() {
  this.activeTargets = new Map();

  var userPressManager =
    this.userPressManager = new UserPressManager(this.app);
  userPressManager.onpressstart = this._handlePressStart.bind(this);
  userPressManager.onpressmove = this._handlePressMove.bind(this);
  userPressManager.onpressend = this._handlePressEnd.bind(this);
  userPressManager.start();

  this.alternativesCharMenuManager =
    new AlternativesCharMenuManager(this.app);
  this.alternativesCharMenuManager.start();
};

ActiveTargetsManager.prototype.stop = function() {
  this.activeTargets = null;

  this.userPressManager.stop();
  this.userPressManager = null;

  this.alternativesCharMenuManager.stop();
  this.alternativesCharMenuManager = null;

  clearTimeout(this.longPressTimer);
};

ActiveTargetsManager.prototype.clearAllTargets = function() {
  this.activeTargets.forEach(function(target, id) {
    if (typeof this.ontargetcancelled === 'function') {
      this.ontargetcancelled(target);
    }
  }, this);
  // clear activeTargets ensure _handle* functions will no longer
  // process existing touches.
  this.activeTargets.clear();

  this.alternativesCharMenuManager.hide();
  clearTimeout(this.longPressTimer);
};

ActiveTargetsManager.prototype._handlePressStart = function(press, id) {
  var target = press.target;
  this.activeTargets.set(id, target);

  // Ignore new touches if menu is shown
  if (this.alternativesCharMenuManager.isShown) {
    return;
  }

  if (typeof this.ontargetactivated === 'function') {
    this.ontargetactivated(target);
  }

  clearTimeout(this.longPressTimer);
  if (this.activeTargets.size === 1) {
    this.longPressTimer =
      setTimeout(this._handleLongPress.bind(this, press, id),
        this.LONG_PRESS_TIMEOUT);
  }
};

ActiveTargetsManager.prototype._handlePressMove = function(press, id) {
  if (!this.activeTargets.has(id)) {
    return;
  }

  var target = press.target;

  // Control locked zone for menu; overwrite target to alt char.
  if (this.alternativesCharMenuManager.isShown &&
      this.alternativesCharMenuManager.isInMenuArea(press)) {
    target = this.alternativesCharMenuManager.getMenuTarget(press);
  }

  // Ignore moment of new touches if the menu is shown and
  // this is not the touch bind to the menu.
  if (this.alternativesCharMenuManager.isShown &&
      !this.alternativesCharMenuManager.isMenuTouch(id)) {
    return;
  }

  // Do nothing if press reports we have moved to empty space.
  if (!target) {
    return;
  }

  var oldTarget = this.activeTargets.get(id);

  // Do nothing if the element is unchanged.
  if (target === oldTarget) {
    return;
  }

  this.activeTargets.set(id, target);

  if (typeof this.ontargetmovedout === 'function') {
    this.ontargetmovedout(oldTarget, press);
  }

  if (typeof this.ontargetmovedin === 'function') {
    this.ontargetmovedin(target);
  }

  // Hide of alternatives menu if the touch moved out of it
  if (!this.alternativesCharMenuManager.isMenuTarget(target) &&
      !this.alternativesCharMenuManager.isInMenuArea(press)) {
    this.alternativesCharMenuManager.hide();
  }

  clearTimeout(this.longPressTimer);
  if (this.activeTargets.size === 1) {
    this.longPressTimer =
      setTimeout(this._handleLongPress.bind(this, press, id),
        this.LONG_PRESS_TIMEOUT);
  }
};

ActiveTargetsManager.prototype._handleLongPress = function(press, id) {
  if (!this.activeTargets.has(id)) {
    return;
  }

  var target = this.activeTargets.get(id);

  if (typeof this.ontargetlongpressed === 'function') {
    this.ontargetlongpressed(target);
  }

  this.alternativesCharMenuManager.show(target, id);
  // Press is considered "moved" after menu is shown
  if (this.alternativesCharMenuManager.isShown) {
    this._handlePressMove(press, id);
  }
};

ActiveTargetsManager.prototype._handlePressEnd = function(press, id) {
  if (!this.activeTargets.has(id)) {
    return;
  }

  var target = this.activeTargets.get(id);
  this.activeTargets.delete(id);

  // Ignore press end of new touches if the menu is shown and
  // this is not the touch bind to the menu.
  if (this.alternativesCharMenuManager.isShown &&
      !this.alternativesCharMenuManager.isMenuTouch(id)) {
    return;
  }

  this.alternativesCharMenuManager.hide();
  clearTimeout(this.longPressTimer);

  // selections on candidate panel should not be committed if the
  // press is moved because the user might simply just want to scroll the panel.
  if (press.moved && ('selection' in target.dataset)) {
    this.ontargetcancelled(target);

    return;
  }

  if (typeof this.ontargetcommitted === 'function') {
    this.ontargetcommitted(target);
  }
};

exports.ActiveTargetsManager = ActiveTargetsManager;

})(window);
