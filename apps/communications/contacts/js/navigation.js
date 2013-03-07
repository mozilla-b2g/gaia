'use strict';

function navigationStack(currentView) {
  var transitions = {
    'right-left': 'view-right',
    'popup': 'view-bottom'
  };

  var _currentView = currentView;
  var stack = [];

  stack.push({view: currentView, transition: 'popup'});

  var waitForTransition = function(view, callback) {
    if (!callback)
      return;

    view.addEventListener('transitionend', function onTransitionEnd() {
      view.removeEventListener('transitionend', onTransitionEnd);
      setTimeout(callback, 0);
    });
  };

  this.go = function go(nextView, transition) {
    if (_currentView === nextView)
      return;

    // Remove items that match nextView from the stack to prevent duplicates.
    stack = stack.filter(function(item) {
      return item.view != nextView;
    });

    var next = document.getElementById(nextView);
    next.classList.remove(transitions[transition] || transition);
    stack.push({ view: nextView, transition: transition});
    next.style.zIndex = stack.length;
    _currentView = nextView;
  };

  this.back = function back(callback) {
    if (stack.length < 2) {
      if (typeof callback === 'function') {
        setTimeout(callback, 0);
      }
      return;
    }

    var currentView = stack.pop();
    var current = document.getElementById(currentView.view);
    var nextView = stack[stack.length - 1];
    var transition = currentView.transition;
    current.classList.add(transitions[transition] || transition);
    waitForTransition(current, callback);
    _currentView = nextView.view;
  };

  this.home = function home(callback) {
    if (stack.length < 2) {
      if (typeof callback === 'function') {
        setTimeout(callback, 0);
      }
      return;
    }

    while (stack.length > 1) {
      this.back(callback);
    }
  };

  this.currentView = function currentView() {
    return _currentView != null ? _currentView : '';
  };
}
