'use strict';
/* exported MockShrinkingUI */

function MockShrinkingUI(foregroundElement, backgroundElement) {
  this.mStarted = false;
  this.mActive = false;
  this.elements.foregroundElement = foregroundElement;
  this.elements.backgroundElement = backgroundElement;
}
MockShrinkingUI.prototype.elements = {};
MockShrinkingUI.prototype.start = function() {
  this.mStarted = true;
};
MockShrinkingUI.prototype.stop = function() {
  this.mStarted = false;
};

MockShrinkingUI.prototype.isActive = function() {
  return this.mActive;
};

MockShrinkingUI.prototype.respondToHierarchyEvent = function() {};
