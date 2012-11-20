'use strict';

function navigationStack(currentView) {
  var transitions = {
    'left-right': { from: 'view-left', to: 'view-right'},
    'top-bottom': { from: 'view-bottom', to: 'view-top'},
    'right-left': { from: 'view-right', to: 'view-left'},
    'bottom-top': { from: 'view-top', to: 'view-bottom'},
    'popup': { from: 'popup', to: 'popup'},
    'none': { from: 'none', to: 'none'}
  };

  var _currentView = currentView;
  var app = document.getElementById('app');
  var cache = document.getElementById('cache');
  var transitionTimeout = 0;

  var stack = [];

  stack.push({view: currentView, transition: 'none'});

  var revertTransition = function(transition) {
    return {
      from: transitions[transition].to,
      to: transitions[transition].from
    };
  };

  var setAppView = function(current, next) {
    current.dataset.state = 'inactive';
    next.dataset.state = 'active';
  };

  var setCacheView = function(current, next, transition, callback) {
    current.classList.add('transitioning');
    next.classList.add('transitioning');
    var currentMirror = document.getElementById(current.dataset.mirror);
    var nextMirror = document.getElementById(next.dataset.mirror);
    var move = transitions[transition] || transition;

    cache.dataset.state = 'active';
    clearTimeout(transitionTimeout);
    transitionTimeout = setTimeout(function animate() {
      currentMirror.classList.add(move.to);
      nextMirror.classList.remove(move.from);
    }, 1);

    nextMirror.addEventListener('transitionend', function nocache() {
      setAppView(current, next);
      app.dataset.state = 'active';
      cache.dataset.state = 'inactive';
      nextMirror.removeEventListener('transitionend', nocache);
      current.classList.remove('transitioning');
      next.classList.remove('transitioning');
      if (typeof callback === 'function') {
        setTimeout(callback, 0);
      }
    });
  };

  this.go = function go(nextView, transition) {
    if (_currentView === nextView)
      return;
    var current = document.getElementById(_currentView);
    var next = document.getElementById(nextView);

    switch (transition) {
      case 'none':
        setAppView(current, next);
        break;

      case 'popup':
        showPopup(current, next);
        break;

      default:
        setCacheView(current, next, transition);
        break;
    }
    stack.push({ view: nextView, transition: transition});
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
    var next = document.getElementById(nextView.view);

    switch (currentView.transition) {
      case 'none':
        setAppView(current, next);
        if (typeof callback === 'function') {
          setTimeout(callback, 0);
        }
        break;

      case 'popup':
        hidePopup(current, next, callback);
        break;

      default:
        var reverted = revertTransition(currentView.transition);
        setCacheView(current, next, reverted, callback);
        break;
    }
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

  var showPopup = function c_showPopup(current, next) {
    next.dataset.state = 'active';
    var nextMirror = document.getElementById(next.dataset.mirror);
    var currentMirror = document.getElementById(current.dataset.mirror);
    next.classList.remove('view-bottom');
    next.addEventListener('transitionend', function hideView() {
      currentMirror.style.display = 'none';
      nextMirror.classList.remove('view-bottom');
      next.removeEventListener('transitionend', hideView);
    });
  }

  var hidePopup = function c_hidePopup(current, next, callback) {
    next.dataset.state = 'active';
    current.classList.add('view-bottom');
    var nextMirror = document.getElementById(next.dataset.mirror);
    var currentMirror = document.getElementById(current.dataset.mirror);
    nextMirror.style.display = '';
    current.addEventListener('transitionend', function hideView() {
      currentMirror.classList.add('view-bottom');
      if (typeof callback === 'function') {
        setTimeout(callback, 0);
      }
      current.removeEventListener('transitionend', hideView);
    });
  }

  this.currentView = function currentView() {
    return _currentView != null ? _currentView : '';
  };

}
