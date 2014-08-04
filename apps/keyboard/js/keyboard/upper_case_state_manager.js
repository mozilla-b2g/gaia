'use strict';

(function(exports) {

var UpperCaseStateManager = function() {
  this.isUpperCase = undefined;
  this.isUpperCaseLocked = undefined;
};

UpperCaseStateManager.prototype.onstatechange = null;

UpperCaseStateManager.prototype.start =
UpperCaseStateManager.prototype.reset = function() {
  this.isUpperCase = false;
  this.isUpperCaseLocked = false;
};

UpperCaseStateManager.prototype.stop = function() {
  this.isUpperCase = undefined;
  this.isUpperCaseLocked = undefined;
};

UpperCaseStateManager.prototype.switchUpperCaseState = function(state) {
  if (!state) {
    return;
  }

  // User can switch the two states independently, and the one unspecified
  // will be kept with the original state.
  var newIsUpperCase = (typeof state.isUpperCase === 'boolean') ?
    state.isUpperCase : this.isUpperCase;
  var newIsUpperCaseLocked = (typeof state.isUpperCaseLocked === 'boolean') ?
    state.isUpperCaseLocked : this.isUpperCaseLocked;

  // It doesn't really make any sense to set isUpperCase to false but
  // change/keep isUpperCaseLocked to true.
  // This also means isUpperCaseLocked can overwrite isUpperCase changes,
  // and literally keep the caps "lock".
  if (newIsUpperCaseLocked) {
    newIsUpperCase = true;
  }

  var statechanged = (this.isUpperCase !== newIsUpperCase) ||
    (this.isUpperCaseLocked !== newIsUpperCaseLocked);

  // Don't do anything if the state is unchanged.
  if (!statechanged) {
    return;
  }

  // Set the new states.
  this.isUpperCase = newIsUpperCase;
  this.isUpperCaseLocked = newIsUpperCaseLocked;

  // Call onstatechange callback.
  if (typeof this.onstatechange === 'function') {
    this.onstatechange();
  }
};

exports.UpperCaseStateManager = UpperCaseStateManager;

})(window);
