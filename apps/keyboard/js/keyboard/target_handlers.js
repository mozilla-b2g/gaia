'use strict';

/* global KeyEvent */

(function(exports) {

var DefaultTargetHandler = function(target, app) {
  this.target = target;
  this.app = app;

  this.ignoreCommitActions = false;
};
DefaultTargetHandler.prototype.activate = function() {
  this.app.feedbackManager.triggerFeedback(this.target);
  this.app.visualHighlightManager.show(this.target);
};
DefaultTargetHandler.prototype.longPress = function() {
  // Does the key have an long press value?
  if (!('longPressValue' in this.target.dataset)) {
    return;
  }

  // Ignore any action when commit.
  this.ignoreCommitActions = true;

  var keyCode = parseInt(this.target.dataset.longPressKeyCode, 10);
  this.app.inputMethodManager.currentIMEngine.click(keyCode);
  this.app.visualHighlightManager.hide(this.target);
};
DefaultTargetHandler.prototype.moveOut = function() {
  this.app.visualHighlightManager.hide(this.target);
};
DefaultTargetHandler.prototype.moveIn = function() {
  this.app.visualHighlightManager.show(this.target);
};
DefaultTargetHandler.prototype.commit = function() {
  if (this.ignoreCommitActions) {
    return;
  }

  var keyCode = parseInt(this.target.dataset.keycode, 10);
  var upperCaseKeyCode = parseInt(this.target.dataset.keycodeUpper, 10);
  var engine = this.app.inputMethodManager.currentIMEngine;

  /*
   * XXX: A hack to send both keycode and uppercase keycode to latin IME,
   * since latin IME would maintain a promise queue for each key, and
   * send correct keycode based on the current capitalization state.
   * See bug 1013570 and bug 987809 for details.
   * This hack should be removed and the state/input queue should be
   * maintained out of latin.js.
   */
  if (this.app.layoutManager.currentModifiedLayout.imEngine === 'latin') {
    engine.click(keyCode, upperCaseKeyCode);
  } else {
    engine.click(
      this.app.upperCaseStateManager.getUpperCase() ?
      upperCaseKeyCode : keyCode);
  }

  this.app.visualHighlightManager.hide(this.target);
};
DefaultTargetHandler.prototype.cancel = function() {
  this.app.visualHighlightManager.hide(this.target);
};
DefaultTargetHandler.prototype.doubleTap = function() {
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

  // We use dataset.data instead of target.textContent because the
  // text actually displayed to the user might have an ellipsis in it
  // to make it fit.
  var engine = this.app.inputMethodManager.currentIMEngine;
  if (typeof engine.select === 'function') {
    engine.select(this.target.textContent, this.target.dataset.data);
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
  var compositeString = this.target.dataset.compositeKey;
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
  var keyCode = parseInt(this.target.dataset.keycode, 10);

  var page;
  switch (keyCode) {
    case this.app.layoutManager.KEYCODE_BASIC_LAYOUT:
      // Return to default page
      page = this.app.layoutManager.LAYOUT_PAGE_DEFAULT;
      break;

    case this.app.layoutManager.KEYCODE_ALTERNATE_LAYOUT:
      // Switch to numbers+symbols page
      page = this.app.layoutManager.LAYOUT_PAGE_SYMBOLS_I;
      break;

     case this.app.layoutManager.KEYCODE_SYMBOL_LAYOUT:
      page = this.app.layoutManager.LAYOUT_PAGE_SYMBOLS_II;
      break;

    case KeyEvent.DOM_VK_ALT:
      // alternate between pages 1 and 2 of SYMBOLS
      if (this.app.layoutManager.currentLayoutPage ===
          this.app.layoutManager.LAYOUT_PAGE_SYMBOLS_I) {
        page = this.app.layoutManager.LAYOUT_PAGE_SYMBOLS_II;
      } else {
        page = this.app.layoutManager.LAYOUT_PAGE_SYMBOLS_I;
      }
      break;
  }

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

CapsLockTargetHandler.prototype.activate = function() {

  this.app.feedbackManager.triggerFeedback(this.target);
  this.app.visualHighlightManager.show(this.target);

  this.app.upperCaseStateManager.switchUpperCaseState({
    isUpperCasePressed: true
  });
};

CapsLockTargetHandler.prototype.commit = function() {
  this.app.upperCaseStateManager.switchUpperCaseState({
    isUpperCase: !this.app.upperCaseStateManager.isUpperCase,
    isUpperCaseLocked: false,
    isUpperCasePressed: false
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
