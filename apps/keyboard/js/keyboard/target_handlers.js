'use strict';

/* global KeyEvent */

(function(exports) {

// |target| is an abstract key object, not a DOM element

var DefaultTargetHandler = function(target, app) {
  this.target = target;
  this.app = app;

  this.ignoreCommitActions = false;
};
DefaultTargetHandler.prototype.activate = function() {
  this.app.console.log('DefaultTargetHandler.activate()');
  this.app.feedbackManager.triggerFeedback(this.target);
  this.app.visualHighlightManager.show(this.target);
};
DefaultTargetHandler.prototype.longPress = function() {
  this.app.console.log('DefaultTargetHandler.longPress()');
  // Does the key have an long press value?
  if (!('longPressValue' in this.target)) {
    return;
  }

  // Ignore any action when commit.
  this.ignoreCommitActions = true;

  var keyCode = this.target.longPressKeyCode;
  this.app.inputMethodManager.currentIMEngine.click(keyCode);
  this.app.visualHighlightManager.hide(this.target);
};
DefaultTargetHandler.prototype.moveOut = function() {
  this.app.console.log('DefaultTargetHandler.moveOut()');
  this.app.visualHighlightManager.hide(this.target);
};
DefaultTargetHandler.prototype.moveIn = function() {
  this.app.console.log('DefaultTargetHandler.moveIn()');
  this.app.visualHighlightManager.show(this.target);
};
DefaultTargetHandler.prototype.commit = function() {
  this.app.console.log('DefaultTargetHandler.commit()');
  if (this.ignoreCommitActions) {
    this.app.console.log('DefaultTargetHandler.commit()::return early');
    return;
  }

  var keyCode = this.target.keyCode;
  var keyCodeUpper = this.target.keyCodeUpper;
  var engine = this.app.inputMethodManager.currentIMEngine;

  /*
   * XXX: A hack to send both keycode and uppercase keycode to latin IME,
   * since latin IME would maintain a promise queue for each key, and
   * send correct keycode based on the current capitalization state.
   * See bug 1013570 and bug 987809 for details.
   * This hack should be removed and the state/input queue should be
   * maintained out of latin.js.
   */
  if (this.app.layoutManager.currentPage.imEngine === 'latin') {
    this.app.console.log('DefaultTargetHandler.commit()::latin::engine.click',
      keyCode, keyCodeUpper);
    engine.click(keyCode, keyCodeUpper);
  } else {
    var code =
      this.app.upperCaseStateManager.isUpperCase ? keyCodeUpper : keyCode;
    this.app.console.log('DefaultTargetHandler.commit()::engine.click', code);
    engine.click(code);
  }

  this.app.visualHighlightManager.hide(this.target);
};
DefaultTargetHandler.prototype.cancel = function() {
  this.app.console.log('DefaultTargetHandler.cancel()');
  this.app.visualHighlightManager.hide(this.target);
};
DefaultTargetHandler.prototype.doubleTap = function() {
  this.app.console.log('DefaultTargetHandler.doubleTap()');
  this.commit();
};

var NullTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);
};
NullTargetHandler.prototype = Object.create(DefaultTargetHandler.prototype);
NullTargetHandler.prototype.activate =
NullTargetHandler.prototype.moveIn =
NullTargetHandler.prototype.moveOut =
NullTargetHandler.prototype.commit =
NullTargetHandler.prototype.cancel =
NullTargetHandler.prototype.doubleTap = function() { };

var SpaceKeyTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);
};
SpaceKeyTargetHandler.prototype =
  Object.create(DefaultTargetHandler.prototype);
SpaceKeyTargetHandler.prototype.longPress = function() {
  this.app.targetHandlersManager.activeTargetsManager.clearAllTargets();
  navigator.mozInputMethod.mgmt.hide();

  this.app.visualHighlightManager.hide(this.target);
};

var CandidateSelectionTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);
};
CandidateSelectionTargetHandler.prototype =
  Object.create(DefaultTargetHandler.prototype);
CandidateSelectionTargetHandler.prototype.commit = function() {
  this.app.candidatePanelManager.hideFullPanel();

  // We use the target's data instead of target.text because the
  // text actually displayed to the user might have an ellipsis in it
  // to make it fit.
  var engine = this.app.inputMethodManager.currentIMEngine;
  if (typeof engine.select === 'function') {
    engine.select(this.target.text, this.target.data);
  }

  this.app.visualHighlightManager.hide(this.target);
};

var BackspaceTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);

  this.deleteTimeout = undefined;
  this.deleteInterval = undefined;

  this.ignoreCommitActions = false;
};
BackspaceTargetHandler.prototype =
  Object.create(DefaultTargetHandler.prototype);
// Backspace repeat delay and repeat rate
BackspaceTargetHandler.prototype.REPEAT_RATE = 75;
BackspaceTargetHandler.prototype.REPEAT_TIMEOUT = 700;

// Sends a delete code to remove last character
// The argument specifies whether this is an auto repeat or not.
BackspaceTargetHandler.prototype._sendDelete = function(isRepeat) {
  // Pass the isRepeat argument to the input method. It may not want
  // to compute suggestions, for example, if this is just one in a series
  // of repeating events.
  var engine = this.app.inputMethodManager.currentIMEngine;
  engine.click(KeyEvent.DOM_VK_BACK_SPACE, null, isRepeat);
};

BackspaceTargetHandler.prototype.activate = function() {
  this.app.feedbackManager.triggerFeedback(this.target);
  this.app.visualHighlightManager.show(this.target);
  // First repetition, after a delay
  this.deleteTimeout = setTimeout(function() {
    this._sendDelete(true);

    // Second, after shorter delay
    this.deleteInterval = setInterval(function() {
      this._sendDelete(true);
    }.bind(this), this.REPEAT_RATE);
  }.bind(this), this.REPEAT_TIMEOUT);
};

BackspaceTargetHandler.prototype.moveOut = function() {
  this.app.visualHighlightManager.hide(this.target);

  clearTimeout(this.deleteTimeout);
  clearInterval(this.deleteInterval);
};

BackspaceTargetHandler.prototype.moveIn = function() {
  // Do nothing and make sure commit does nothing.
  this.ignoreCommitActions = true;
};

BackspaceTargetHandler.prototype.commit = function() {
  if (this.ignoreCommitActions) {
    return;
  }

  clearTimeout(this.deleteTimeout);
  clearInterval(this.deleteInterval);

  this._sendDelete(false);

  this.app.visualHighlightManager.hide(this.target);
};

BackspaceTargetHandler.prototype.cancel = function() {
  clearTimeout(this.deleteTimeout);
  clearInterval(this.deleteInterval);

  this.app.visualHighlightManager.hide(this.target);
};

var CompositeTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);
};
CompositeTargetHandler.prototype =
  Object.create(DefaultTargetHandler.prototype);
CompositeTargetHandler.prototype.commit = function() {
  // Keys with this attribute set send more than a single character
  // Like ".com" or "2nd" or (in Catalan) "l·l".
  var compositeString = this.target.compositeKey;
  var engine = this.app.inputMethodManager.currentIMEngine;
  for (var i = 0; i < compositeString.length; i++) {
    engine.click(compositeString.charCodeAt(i));
  }

  this.app.visualHighlightManager.hide(this.target);
};

var PageSwitchingTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);
};
PageSwitchingTargetHandler.prototype =
  Object.create(DefaultTargetHandler.prototype);
PageSwitchingTargetHandler.prototype.commit = function() {
  var page = this.target.targetPage;

  this.app.setLayoutPage(page);
  this.app.visualHighlightManager.hide(this.target);

  // If needed, empty the candidate panel
  var currentIMEngine = this.app.inputMethodManager.currentIMEngine;
  if (typeof currentIMEngine.empty === 'function') {
    currentIMEngine.empty();
  }
};

var CapsLockTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);
};
CapsLockTargetHandler.prototype = Object.create(DefaultTargetHandler.prototype);
CapsLockTargetHandler.prototype.commit = function() {
  this.app.upperCaseStateManager.switchUpperCaseState({
    isUpperCase: !this.app.upperCaseStateManager.isUpperCase,
    isUpperCaseLocked: false
  });
  this.app.visualHighlightManager.hide(this.target);
};
CapsLockTargetHandler.prototype.doubleTap = function() {
  this.app.upperCaseStateManager.switchUpperCaseState({
    isUpperCaseLocked: true
  });
  this.app.visualHighlightManager.hide(this.target);
};

var SwitchKeyboardTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);
};
SwitchKeyboardTargetHandler.prototype =
  Object.create(DefaultTargetHandler.prototype);
SwitchKeyboardTargetHandler.prototype.longPress = function() {
  this.ignoreCommitActions = true;

  this.app.targetHandlersManager.activeTargetsManager.clearAllTargets();
  navigator.mozInputMethod.mgmt.showAll();
  this.app.visualHighlightManager.hide(this.target);
};
SwitchKeyboardTargetHandler.prototype.commit = function() {
  if (this.ignoreCommitActions) {
    return;
  }

  this.app.targetHandlersManager.activeTargetsManager.clearAllTargets();
  navigator.mozInputMethod.mgmt.next();
  this.app.visualHighlightManager.hide(this.target);
};

var ToggleCandidatePanelTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);
};
ToggleCandidatePanelTargetHandler.prototype =
  Object.create(DefaultTargetHandler.prototype);
ToggleCandidatePanelTargetHandler.prototype.commit = function() {
  this.app.candidatePanelManager.toggleFullPanel();

  this.app.visualHighlightManager.hide(this.target);
};

var DismissSuggestionsTargetHandler = function(target, app) {
  DefaultTargetHandler.apply(this, arguments);
};
DismissSuggestionsTargetHandler.prototype =
  Object.create(DefaultTargetHandler.prototype);
DismissSuggestionsTargetHandler.prototype.commit = function() {
  var engine = this.app.inputMethodManager.currentIMEngine;
  if (typeof engine.dismissSuggestions === 'function') {
    engine.dismissSuggestions();
  }

  this.app.visualHighlightManager.hide(this.target);
};

exports.DefaultTargetHandler = DefaultTargetHandler;
exports.NullTargetHandler = NullTargetHandler;
exports.SpaceKeyTargetHandler = SpaceKeyTargetHandler;
exports.CandidateSelectionTargetHandler = CandidateSelectionTargetHandler;
exports.BackspaceTargetHandler = BackspaceTargetHandler;
exports.CompositeTargetHandler = CompositeTargetHandler;
exports.PageSwitchingTargetHandler = PageSwitchingTargetHandler;
exports.CapsLockTargetHandler = CapsLockTargetHandler;
exports.SwitchKeyboardTargetHandler = SwitchKeyboardTargetHandler;
exports.ToggleCandidatePanelTargetHandler = ToggleCandidatePanelTargetHandler;
exports.DismissSuggestionsTargetHandler = DismissSuggestionsTargetHandler;

})(window);
