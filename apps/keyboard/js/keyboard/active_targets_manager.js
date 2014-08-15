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

  this.doubleTapTimers = null;
};

ActiveTargetsManager.prototype.ontargetactivated = null;
ActiveTargetsManager.prototype.ontargetlongpressed = null;
ActiveTargetsManager.prototype.ontargetmovedout = null;
ActiveTargetsManager.prototype.ontargetmovedin = null;
ActiveTargetsManager.prototype.ontargetcommitted = null;
ActiveTargetsManager.prototype.ontargetcancelled = null;
ActiveTargetsManager.prototype.ontargetdoubletapped = null;

// Show accent char menu (if there is one) or do other stuff
// after LONG_PRESS_TIMEOUT
ActiveTargetsManager.prototype.LONG_PRESS_TIMEOUT = 700;

// Taps the shift key twice within DOUBLE_TAP_TIMEOUT
// to lock the keyboard at upper case state.
ActiveTargetsManager.prototype.DOUBLE_TAP_TIMEOUT = 450;

ActiveTargetsManager.prototype.start = function() {
  this.activeTargets = new Map();
  this.doubleTapTimers = new WeakMap();

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
  // Ignore new touches if menu is shown
  if (this.alternativesCharMenuManager.isShown) {
    return;
  }

  // Ignore new touches when user is writing.
  if (this.app.handwritingPadsManager &&
      !this.app.handwritingPadsManager.handlePressStart(press)) {
    return;
  }

  // All targets before the new touch need to be committed,
  // according to UX requirement.
  this.activeTargets.forEach(function(target, id) {
    this._handlePressEnd(press, id);
  }, this);

  var target = press.target;
  this.activeTargets.set(id, target);

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

  // Do nothing if press reports we have moved to empty space.
  if (!target) {
    return;
  }

  var oldTarget = this.activeTargets.get(id);

  // Special handling for selection: since selections are scrollable,
  // if the press is moved, the press is consider ended and should be ignored.
  if (press.moved && ('selection' in oldTarget.dataset)) {
    this.activeTargets.delete(id);
    this.ontargetcancelled(oldTarget);

    this.alternativesCharMenuManager.hide();
    clearTimeout(this.longPressTimer);

    return;
  }

  // If the element is unchanged, handle it with handwriting pads manager.
  if (target === oldTarget) {
    if (this.app.handwritingPadsManager) {
      this.app.handwritingPadsManager.handlePressMove(press);
    }
    return;
  }

  // For UX team's requirement
  // When moving out from handwriting pad, keep event's target to handwriting
  // pad, ensure handwritingPadsManager handle the press end event and avoid
  // invoking ontargetmovedin for the new target.
  if (this.app.handwritingPadsManager &&
      this.app.handwritingPadsManager.handleMoveOut(oldTarget)) {
    return;
  }

  this.activeTargets.set(id, target);

  // When moving in handwriting pad, update event's target to handwriting pad
  // and ensure invoking ontargetmovedout for the original target.
  if (this.app.handwritingPadsManager) {
    this.app.handwritingPadsManager.handleMoveIn(press);
  }

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

  this.alternativesCharMenuManager.show(target);
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

  if (this.app.handwritingPadsManager &&
      this.app.handwritingPadsManager.handlePressEnd(target)) {
    return;
  }

  this.alternativesCharMenuManager.hide();
  clearTimeout(this.longPressTimer);

  // Target should be either committed or doubled tapped here.
  var timer;
  if (this.doubleTapTimers.has(target)) {
    timer = this.doubleTapTimers.get(target);
    clearTimeout(timer);
    this.doubleTapTimers.delete(target);

    if (typeof this.ontargetdoubletapped === 'function') {
      this.ontargetdoubletapped(target);
    }
  } else {
    timer = setTimeout(function() {
      this.doubleTapTimers.delete(target);
    }.bind(this), this.DOUBLE_TAP_TIMEOUT);
    this.doubleTapTimers.set(target, timer);

    if (typeof this.ontargetcommitted === 'function') {
      this.ontargetcommitted(target);
    }
  }
};

exports.ActiveTargetsManager = ActiveTargetsManager;

})(window);
