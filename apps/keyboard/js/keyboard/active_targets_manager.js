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
 * The caller of ActiveTargetsManager can set the following properties to alter
 * its behavior:
 *   blockNewUserPress: when set to true, any new press is not handled.
 *   blockTargetMovedOut: when set to true, presses won't be able to move out
 *   of current target.
 */
var ActiveTargetsManager = function(app) {
  this.app = app;
  this.activeTargets = null;

  this.blockNewUserPress = false;
  this.blockTargetMovedOut = false;

  this.userPressManager = null;
  this.alternativesCharMenuManager = null;

  this.longPressTimer = undefined;

  this.doubleTapTimer = undefined;
  this.doubleTapPreviousTarget = null;
};

ActiveTargetsManager.prototype.ontargetactivated = null;
ActiveTargetsManager.prototype.ontargetlongpressed = null;
ActiveTargetsManager.prototype.ontargetmoved = null;
ActiveTargetsManager.prototype.ontargetmovedout = null;
ActiveTargetsManager.prototype.ontargetmovedin = null;
ActiveTargetsManager.prototype.ontargetcommitted = null;
ActiveTargetsManager.prototype.ontargetcancelled = null;
ActiveTargetsManager.prototype.ontargetdoubletapped = null;
ActiveTargetsManager.prototype.onnewtargetwillactivate = null;

// Show accent char menu (if there is one) or do other stuff
// after LONG_PRESS_TIMEOUT
ActiveTargetsManager.prototype.LONG_PRESS_TIMEOUT = 700;

// Taps the shift key twice within DOUBLE_TAP_TIMEOUT
// to lock the keyboard at upper case state.
ActiveTargetsManager.prototype.DOUBLE_TAP_TIMEOUT = 450;

ActiveTargetsManager.prototype.start = function() {
  this.app.console.log('ActiveTargetsManager.start()');
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
  this.app.console.log('ActiveTargetsManager.stop()');
  this.activeTargets = null;

  this.userPressManager.stop();
  this.userPressManager = null;

  this.alternativesCharMenuManager.stop();
  this.alternativesCharMenuManager = null;

  clearTimeout(this.longPressTimer);
  this.doubleTapTimer = undefined;
  this.doubleTapPreviousTarget = null;
};

ActiveTargetsManager.prototype.clearAllTargets = function() {
  this.app.console.log('ActiveTargetsManager.clearAllTargets()');
  if (this.activeTargets.size) {
    console.warn('ActiveTargetsManager: clear ' +
      this.activeTargets.size + ' active target(s).');
  }

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
  this.app.console.log('ActiveTargetsManager._handlePressStart()');

  // Ignore any new user press when blockNewUserPress property is true or
  // alternatives menu is shown.
  if (this.blockNewUserPress || this.alternativesCharMenuManager.isShown) {
    return;
  }

  // Notify current targets about the new touch.
  if (typeof this.onnewtargetwillactivate === 'function') {
    this.activeTargets.forEach(function(target, id) {
      this.onnewtargetwillactivate(target);
    }, this);
  }

  var target = press.target;
  this.activeTargets.set(id, target);

  if (typeof this.ontargetactivated === 'function') {
    this.ontargetactivated(target, press);
  }

  clearTimeout(this.longPressTimer);
  if (this.activeTargets.size === 1) {
    this.longPressTimer =
      setTimeout(this._handleLongPress.bind(this, press, id),
        this.LONG_PRESS_TIMEOUT);
  }
};

ActiveTargetsManager.prototype._handlePressMove = function(press, id) {
  this.app.console.log('ActiveTargetsManager._handlePressMove()');
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
  if (press.moved && ('selection' in oldTarget)) {
    this.activeTargets.delete(id);
    this.ontargetcancelled(oldTarget);

    this.alternativesCharMenuManager.hide();
    clearTimeout(this.longPressTimer);

    return;
  }

  if (target === oldTarget) {
    if (typeof this.ontargetmoved === 'function') {
      this.ontargetmoved(target, press);
    }
    return;
  }

  if (this.blockTargetMovedOut) {
    return;
  }

  this.activeTargets.set(id, target);

  if (typeof this.ontargetmovedout === 'function') {
    this.ontargetmovedout(oldTarget, press);
  }

  if (typeof this.ontargetmovedin === 'function') {
    this.ontargetmovedin(target, press);
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
  this.app.console.log('ActiveTargetsManager._handleLongPress()');
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
  this.app.console.log('ActiveTargetsManager._handlePressEnd()');
  if (!this.activeTargets.has(id)) {
    return;
  }

  var target = this.activeTargets.get(id);
  this.activeTargets.delete(id);

  this.alternativesCharMenuManager.hide();
  clearTimeout(this.longPressTimer);

  // Target should be either committed or doubled tapped here.
  if (this.doubleTapTimer && this.doubleTapPreviousTarget === target) {
    window.clearTimeout(this.doubleTapTimer);
    this.doubleTapTimer = undefined;

    if (typeof this.ontargetdoubletapped === 'function') {
      this.ontargetdoubletapped(target);
    }
  } else {
    this.doubleTapTimer = window.setTimeout(function() {
      this.doubleTapTimer = undefined;
      this.doubleTapPreviousTarget = null;
    }.bind(this), this.DOUBLE_TAP_TIMEOUT);

    this.doubleTapPreviousTarget = target;

    if (typeof this.ontargetcommitted === 'function') {
      this.ontargetcommitted(target);
    }
  }
};

exports.ActiveTargetsManager = ActiveTargetsManager;

})(window);
