'use strict';

function navigationStack(currentView) {
  // Each transition entry includes a 'forwards' property including the
  //  classes which will be added to the 'current' and 'next' view when the
  //  transition goes forwards, as well as a 'backwards' property including the
  //  classes which will be added to the 'current' and 'next' view when the
  //  transition goes backwards.
  this.transitions = {
    'none': {
      forwards: {},
      backwards: {}
    },
    'right-left': {
      forwards: {
        next: 'app-go-left-in'
      },
      backwards: {
        current: 'app-go-left-back-out'
      }
    },
    'popup': {
      forwards: {
        next: 'app-go-up-in'
      },
      backwards: {
        current: 'app-go-up-back-out'
      }
    },
    'go-deeper': {
      forwards: {
        current: 'app-go-deeper-out',
        next: 'app-go-deeper-in'
      },
      backwards: {
        current: 'app-go-deeper-back-out',
        next: 'app-go-deeper-back-in'
      }
    },
    'go-deeper-search': {
      forwards: {
        current: 'move-left-out',
        next: 'move-left-in'
      },
      backwards: {
        current: 'move-right-out',
        next: 'move-right-in'
      }
    }
  };

  var COMMS_APP_ORIGIN = document.location.protocol + '//' +
      document.location.host;
  var screenshotViewId = 'view-screenshot';
  var _currentView = currentView;
  this.stack = [];

  this.stack.push({view: _currentView, transition: 'popup', zIndex: 1});

  var waitForAnimation = function ng_waitForAnimation(view, callback) {
    if (!callback)
      return;

    view.addEventListener('animationend', function ng_onAnimationEnd() {
      view.removeEventListener('animationend', ng_onAnimationEnd);
      setTimeout(callback, 0);
    });
  };

  this.go = function go(nextView, transition) {
    if (_currentView === nextView)
      return;
    var parent = window.parent;
    if (nextView == 'view-contact-form') {
      parent.postMessage({type: 'hide-navbar'}, COMMS_APP_ORIGIN);
    }

    // Remove items that match nextView from the stack to prevent duplicates.
    this.stack = this.stack.filter(function(item) {
      return item.view != nextView;
    });

    var current;
    var currentClassList;
    // Performance is very bad when there are too many contacts so we use
    // -moz-element and animate this 'screenshot" element.
    if (transition.indexOf('go-deeper') === 0) {
      current = document.getElementById(screenshotViewId);

      // Load the screenshot dom content
      LazyLoader.load([current]);

      current.style.zIndex = this.stack[this.stack.length - 1].zIndex;
      currentClassList = current.classList;
      if (transition.indexOf('search') !== -1) {
        currentClassList.add('search');
      } else {
        currentClassList.add('contact-list');
      }
      currentClassList.remove('hide');
    } else {
      current = document.getElementById(_currentView);
      currentClassList = current.classList;
    }

    var forwardsClasses = this.transitions[transition].forwards;
    var backwardsClasses = this.transitions[transition].backwards;

    // Add forwards class to current view.
    currentClassList.add('block-item');
    if (forwardsClasses.current) {
      currentClassList.add(forwardsClasses.current);
    }

    var next = document.getElementById(nextView);
    // Add forwards class to next view.
    if (forwardsClasses.next) {
      next.classList.add('block-item');
      next.classList.add(forwardsClasses.next);
      next.addEventListener('animationend', function ng_onNextBackwards(ev) {
        next.removeEventListener('animationend', ng_onNextBackwards);
        next.classList.remove('block-item');
      });
    }

    var zIndex = this.stack[this.stack.length - 1].zIndex + 1;
    this.stack.push({ view: nextView, transition: transition,
                      zIndex: zIndex});
    next.style.zIndex = zIndex;
    _currentView = nextView;
  };

  this.back = function back(callback) {
    var self = this;

    if (this.stack.length < 2) {
      if (typeof callback === 'function') {
        setTimeout(callback, 0);
      }
      return;
    }

    var currentView = this.stack.pop();
    var current = document.getElementById(currentView.view);
    var currentClassList = current.classList;

    var nextView = this.stack[this.stack.length - 1];
    var transition = currentView.transition;

    var next = document.getElementById(nextView.view);
    var nextClassList;
    // Performance is very bad when there are too many contacts so we use
    // -moz-element and animate this 'screenshot" element.
    if (transition.indexOf('go-deeper') === 0) {
      next = document.getElementById(screenshotViewId);
    } else {
      next = document.getElementById(nextView.view);
    }
    nextClassList = next.classList;

    var forwardsClasses = this.transitions[transition].forwards;
    var backwardsClasses = this.transitions[transition].backwards;

    if (currentView.view == 'view-contact-form') {
      parent.postMessage({type: 'show-navbar'}, COMMS_APP_ORIGIN);
    }

    // Add backwards class to current view.
    if (backwardsClasses.current) {
      currentClassList.add('block-item');
      currentClassList.add(backwardsClasses.current);
      current.addEventListener('animationend',
        function ng_onCurrentBackwards() {
          current.removeEventListener('animationend', ng_onCurrentBackwards);
          // Once the backwards animation completes, delete the added classes
          // to restore the elements to their initial state.
          currentClassList.remove(forwardsClasses.next);
          currentClassList.remove(backwardsClasses.current);
          current.style.zIndex = null;
          currentClassList.remove('block-item');
          if (!backwardsClasses.next) {
            nextClassList.remove('block-item');
          }
        }
      );
    } else {
      current.style.zIndex = null;
      currentClassList.remove('block-item');
      if (!backwardsClasses.next) {
        nextClassList.remove('block-item');
      }
    }

    next.style.zIndex = nextView.zIndex;

    // Add backwards class to next view.
    if (backwardsClasses.next) {
      nextClassList.add(backwardsClasses.next);
      next.addEventListener('animationend', function ng_onNextBackwards() {
        next.removeEventListener('animationend', ng_onNextBackwards);
        // Once the backwards animation completes, delete the added classes
          // to restore the elements to their initial state.
        nextClassList.remove(forwardsClasses.current);
        nextClassList.remove(backwardsClasses.next);
        if (transition.indexOf('go-deeper') === 0) {
          // Hide the -moz-element element once the animation completes.
          nextClassList.add('hide');
          nextClassList.remove('search');
          nextClassList.remove('contact-list');
        }
        nextClassList.remove('block-item');
      });
    }

    if (!backwardsClasses.current && !backwardsClasses.next && callback) {
      setTimeout(callback, 0);
    } else {
      waitForAnimation(current, callback);
    }
    _currentView = nextView.view;
  };

  this.home = function home(callback) {
    if (this.stack.length < 2) {
      if (typeof callback === 'function') {
        setTimeout(callback, 0);
      }
      return;
    }

    while (this.stack.length > 1) {
      this.back(callback);
    }
  };

  this.currentView = function currentView() {
    return _currentView != null ? _currentView : '';
  };
}
