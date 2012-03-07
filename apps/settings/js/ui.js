/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  var _isTransitionActive = false;

  Gaia.UI = {
    views: [],
    get activeView() {
      var views = this.views;
      return views[views.length - 1];
    },
    get isTransitionActive() {
      return _isTransitionActive;
    },
    init: function() {
      // Initialize Views.
      var views = document.getElementsByClassName('view');

      if (views.length > 0) {
        views[0].classList.add('active');
        this.push(new Gaia.UI.View(views[0]));
      }

      // Add event listeners for push/pop links.
      document.addEventListener('click', this);

      window.addEventListener('keyup', this, true);
    },
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'click':
          var target = evt.originalTarget;

          if (target.tagName !== 'A')
            return;

          var href = target.getAttribute('href');
          var classList = target.classList;
          var isPop = classList.contains('pop');

          if (!isPop && !classList.contains('push'))
            return;

          var transition;

          if (classList.contains('slideHorizontal'))
            transition = 'slideHorizontal';

          if (!transition)
            return;

          if (isPop && href === '#') {
            this.pop(transition);
          }

          else {
            var view = this.getView(href) || new Gaia.UI.View(href);

            if (isPop) {
              this.pop(view, transition);
            }

            else {
              this.push(view, transition);
            }
          }

          evt.preventDefault();
          break;
        case 'keyup':
          if (Gaia.UI.views.length === 1)
            return;

          if (_isTransitionActive) {
            evt.preventDefault();
            evt.stopPropagation();
            return;
          }

          if (evt.keyCode === evt.DOM_VK_ESCAPE) {
            evt.preventDefault();
            evt.stopPropagation();
            this.pop('slideHorizontal');
          }
          break;
        case 'transitionend':
          var activeViewElement = document.querySelector('.view.active');
          var newActiveViewElement = Gaia.UI.activeView.element;
          var activeViewClassList = activeViewElement.classList;
          var newActiveViewClassList = newActiveViewElement.classList;

          activeViewClassList.remove('active');
          activeViewClassList.remove('push');
          activeViewClassList.remove('pop');
          activeViewClassList.remove('transition');
          activeViewClassList.remove('slideHorizontal');

          newActiveViewClassList.add('active');
          newActiveViewClassList.remove('push');
          newActiveViewClassList.remove('pop');
          newActiveViewClassList.remove('transition');
          newActiveViewClassList.remove('slideHorizontal');

          newActiveViewElement.removeEventListener('transitionend', this);
          _isTransitionActive = false;
          break;
        default:
          break;
      }
    },
    getView: function(viewOrHref) {
      var views = this.views;
      var view, i;

      if (typeof viewOrHref === 'string') {
        for (i = 0; i < views.length; i++) {
          view = views[i];

          if (view.href === viewOrHref) {
            return view;
          }
        }
      } else {
        for (i = 0; i < views.length; i++) {
          view = views[i];

          if (view === viewOrHref) {
            return view;
          }
        }
      }

      return null;
    },
    push: function(view, transition) {
      var views = this.views;
      var activeView, newActiveView;

      view.isRoot = views.length === 0;

      if (!view.isRoot) {
        activeView = this.activeView;
        newActiveView = view;
      }

      views.push(view);

      if (!view.isRoot) {
        var activeViewElement = activeView.element;
        var newActiveViewElement = newActiveView.element;
        var activeViewClassList = activeViewElement.classList;
        var newActiveViewClassList = newActiveViewElement.classList;

        _isTransitionActive = true;

        activeViewClassList.add(transition);
        activeViewClassList.add('push');
        newActiveViewClassList.add(transition);
        newActiveViewClassList.add('push');

        newActiveViewElement.addEventListener('transitionend', this);

        setTimeout(function() {
          activeViewClassList.add('transition');
          newActiveViewClassList.add('transition');
        }, 100);
      }
    },
    pop: function(viewOrTransition, transition) {
      var views = this.views;
      var activeView, newActiveView;

      if (views.length > 1) {
        activeView = this.activeView;

        if (typeof viewOrTransition === 'string') {
          transition = viewOrTransition;
        } else {
          newActiveView = viewOrTransition;
        }

        if (newActiveView) {
          var isOnStack = this.getView(newActiveView) !== null;

          if (isOnStack) {
            while (this.activeView !== newActiveView) {
              views.pop();
            }
          }
        }

        else {
          views.pop();
          newActiveView = this.activeView;
        }

        var activeViewElement = activeView.element;
        var newActiveViewElement = newActiveView.element;
        var activeViewClassList = activeViewElement.classList;
        var newActiveViewClassList = newActiveViewElement.classList;

        _isTransitionActive = true;

        activeViewClassList.add(transition);
        activeViewClassList.add('pop');
        newActiveViewClassList.add(transition);
        newActiveViewClassList.add('pop');

        newActiveViewElement.addEventListener('transitionend', this);

        setTimeout(function() {
          activeViewClassList.add('transition');
          newActiveViewClassList.add('transition');
        }, 100);
      }
    }
  };

  Gaia.UI.View = function(elementOrHref) {
    var element;

    if (typeof elementOrHref === 'string') {
      var isHash = elementOrHref.charAt(0) === '#';

      // Target view is a <div/>.
      if (isHash) {
        element = document.querySelector(elementOrHref);
      }

      // Target view is a new <iframe/>.
      else {
        element = document.createElement('iframe');
        element.className = 'view';
        element.src = elementOrHref;

        document.body.appendChild(element);
      }

      this.href = elementOrHref;
    }

    else if (elementOrHref.classList.contains('view')) {
      element = elementOrHref;

      // Target view is a <div/>.
      if (element.tagName === 'DIV') {
        this.href = '#' + element.id;
      }

      // Target view is a new <iframe/>.
      else {
        this.href = element.getAttribute('src');
      }
    }

    if (element) {
      element.view = this;
      this.element = element;
      this.title = element.getAttribute('data-title') || '';
    }
  };

  Gaia.UI.View.prototype = {
    element: null,
    isRoot: false,
    href: '',
    title: ''
  };

  Gaia.UI.NavigationBar = function(element) {
    if (element) {
      this.element = element;

      var headers = element.getElementsByTagName('h1');
      var header;

      if (headers.length > 0) {
        header = headers[0];
      } else {
        header = document.createElement('h1');
        element.appendChild(header);
      }

      this.header = header;
    }
  };

  Gaia.UI.NavigationBar.prototype = {
    element: null,
    header: null,
    set title(value) {
      this.header.innerHTML = value;
    }
  };
  
  Gaia.UI.AnimationLoop = function(renderCallback) {
    var isRunning = true;
    var lastFrame = Date.now();
    var requestAnimationFrame = function(animFrameCallback) {
      if (window.mozRequestAnimationFrame)
        window.mozRequestAnimationFrame(animFrameCallback);
      else if (window.webkitRequestAnimationFrame)
        window.webkitRequestAnimationFrame(animFrameCallback);
      else if (window.requestAnimationFrame)
        window.requestAnimationFrame(animFrameCallback);
    };

    (function loop(currentFrame) {
      if (isRunning !== false) {
        requestAnimationFrame(loop);
        isRunning = renderCallback(currentFrame - lastFrame);
        lastFrame = currentFrame;
      }
    })(lastFrame);
  };

  window.addEventListener('load', function() {
    Gaia.UI.init();
  });

})();
