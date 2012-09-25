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

  var setCacheView = function(current, next, transition) {
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
    });
  };

  var resetMirror = function resetMirror(view, transition) {
    var mirror = document.getElementById(view.dataset.mirror);
    mirror.classList.remove(transition.to);
    mirror.classList.add(transition.from);
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
        showPopup(nextView);
        break;

      default:
        setCacheView(current, next, transition);
        break;
    }
    stack.push({ view: _currentView, transition: transition});
    _currentView = nextView;
  };

  this.back = function back() {
    if (stack.length < 1)
      return;
    var current = document.getElementById(_currentView);
    var nextView = stack.pop();
    var next = document.getElementById(nextView.view);

    switch (nextView.transition) {
      case 'none':
        setAppView(current, next);
        break;

      case 'popup':
        hidePopup(_currentView);
        break;

      default:
        var reverted = revertTransition(nextView.transition);
        setCacheView(current, next, reverted);
        break;
    }
    _currentView = nextView.view;
  };

  this.home = function home() {
    if (stack.length < 1)
      return;

    while (stack.length > 1) {
      var currentObject = stack.pop();
      var currentView = document.getElementById(currentObject.view);
      resetMirror(currentView, transitions[currentObject.transition]);
    }
    // As stack.length == 1 next view is going to be
    // the home, so we can use back method
    this.back();
  };

  var showPopup = function c_showPopup(id) {
    var popup = document.getElementById(id);
    popup.classList.remove('view-bottom');
    popup.dataset['state'] = 'active';
  }

  var hidePopup = function c_hidePopup(id) {
    var popup = document.getElementById(id);
    popup.classList.add('view-bottom');
    popup.addEventListener('transitionend', function hideView() {
      popup.dataset['state'] = 'inactive';
      popup.removeEventListener('transitionend', hideView);
    });
  }

  this.currentView = function currentView() {
    return _currentView != null ? _currentView : '';
  };

}
