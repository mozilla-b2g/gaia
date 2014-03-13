'use strict';
/* exported MockNavigationStack */

var MockNavigationStack = function(view) {
  this.currentView = view;
  this.stack = [{
    view: view
  }];

  this.go = function(view, transition) {
    this.currentView = view;
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
      this.currentView = entry.view;
      this.currentTransition = entry.transition;
    } else {
      delete this.currentView;
      delete this.currentTransition;
    }
  };

  this.home = function() {
    var entry = this.stack[0];
    if (entry) {
      this.currentView = entry.view;
      this.currentTransition = entry.transition;
    } else {
      delete this.currentView;
      delete this.currentTransition;
    }
    this.stack.splice(1, this.stack.length - 1);
  };

  this.getCurrentView = function() {
    return this.currentView;
  };

  this.getCurrentTransition = function() {
    return this.currentTransition;
  };
};
