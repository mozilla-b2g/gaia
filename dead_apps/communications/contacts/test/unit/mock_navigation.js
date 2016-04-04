'use strict';
/* exported MockNavigationStack */

var MockNavigationStack = function(view) {
  this._currentView = view;
  this.stack = [{
    view: view
  }];

  this.go = function(view, transition) {
    this._currentView = view;
    this.currentTransition = transition;
    this.stack.push({
      view: view,
      transition: transition
    });
  };

  this.back = function() {
    this.stack.pop();
    var entry = this.stack[this.stack.length - 1];
    if (entry) {
      this._currentView = entry.view;
      this.currentTransition = entry.transition;
    } else {
      delete this._currentView;
      delete this.currentTransition;
    }
  };

  this.home = function() {
    var entry = this.stack[0];
    if (entry) {
      this._currentView = entry.view;
      this.currentTransition = entry.transition;
    } else {
      delete this._currentView;
      delete this.currentTransition;
    }
    this.stack.splice(1, this.stack.length - 1);
  };

  this.getCurrentView = function() {
    return this._currentView;
  };

  this.getCurrentTransition = function() {
    return this.currentTransition;
  };

  this.currentView = function() {
    return this._currentView;
  };
};
