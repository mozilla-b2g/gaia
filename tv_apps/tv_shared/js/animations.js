(function(exports) {
  'use strict';

  exports.Animations = {

    createCircleAnimation: function (container) {

      var winHalfWidth = window.innerWidth / 2;
      var winHeight = window.innerHeight;
      var finalSize = 2 * Math.ceil(Math.sqrt(winHalfWidth * winHalfWidth +
                                          winHeight * winHeight));

      /**
       * circleSize is the base size of circle element with any scaling.
       * It must be the same as width length in animation-circle css class.
       * Lower circleSize value can achieve better performance, but may have
       * bad resolution on circle border.
       * @type {Number}
       */
      const circleSize = 500;
      var scale = finalSize / circleSize;
      var isPlaying = false;
      var play = function (param, callback) {
        isPlaying = true;
        // initialize circle element scaling
        var circleElem = document.createElement('div');
        circleElem.className = 'animation-circle';
        param.type = param.type || 'grow';
        switch(param.type) {
          case 'shrink':
            circleElem.classList.add('shrink');
            circleElem.style.transform = 'scale(' + scale + ')';
            break;
          case 'grow':
            circleElem.classList.add('grow');
            circleElem.style.transform = 'scale(0)';
            break;
        }
        if (param.backgroundColor) {
          circleElem.style.backgroundColor = param.backgroundColor;
        }
        container.appendChild(circleElem);

        // force reflow the circle element style
        getComputedStyle(circleElem).width;

        // start transition
        switch(param.type) {
          case 'shrink':
            circleElem.style.transform = 'scale(0)';
            break;
          case 'grow':
            circleElem.style.transform = 'scale(' + scale + ')';
            break;
        }

        // remove the circle element
        circleElem.addEventListener('transitionend', function(evt) {
          if (evt.target === circleElem) {
            container.removeChild(circleElem);
            if (callback) {
              callback();
            }
            isPlaying = false;
          }
        });
      };

      return {
        play: play,
        isPlaying: function() {
          return isPlaying;
        }
      };
    },

    _findChildInViewport: function(container, selector) {
      // find the elements in viewport
      var child;
      var childRect;
      var children = container.querySelectorAll(selector);
      var childrenInViewport = [];
      var i;

      for(i = 0; i < children.length; i++) {
        child = children[i];
        childRect = child.getBoundingClientRect();
        if (childRect.right >= 0 &&
          childRect.left <= window.innerWidth) {
          childrenInViewport.push({
            left: childRect.left,
            child: child
          });
        }
      }

      // sort child indexes. Card position may not be the same as index
      // after a new child is pinned to home
      childrenInViewport.sort(function(childObj1, childObj2) {
        if (childObj1.left > childObj2.left) {
          return 1;
        }
        if (childObj1.left < childObj2.left) {
          return -1;
        }
        return 0;
      });

      return childrenInViewport;
    },

    /**
     * Perform bubbling animation on the children elements 'relative to' the
     * container.
     * @param  {HTMLElement} container       Container for bubble animation.
     * @param  {Object}      querySelector   Representation for querySelector
     * @param  {Number}      bubbleInterval  Time interval between two bubbles.
     * @param  {Function}    callback        The function that will be called
     *                                       once all the children finish
     *                                       bubbling animation.
     */
    doBubbleAnimation: function(container, querySelector, bubbleInterval,
                                callback) {

      // only do the animation on elements in viewport
      var childrenInViewport = this._findChildInViewport(
                                            container, querySelector);

      var endBubble = function() {
        for(i = 0; i < childrenInViewport.length; i++) {
          child = childrenInViewport[i].child;
          child.classList.remove('animation-bubble-start');
          child.removeEventListener('animationend', onBubbleEnd);
        }
        if (callback) {
          callback();
        }
      }.bind(this);

      // Need to wait until the last element has finished bubbling.
      // Note: The class also overrides transform properties on the child,
      // so we should not remove it until all the animations end.
      var childTransitionEndCount = 0;
      var onBubbleEnd = function(evt) {
        childTransitionEndCount++;
        if (childTransitionEndCount === childrenInViewport.length) {
          endBubble();
        }
      };

      // start adding bubble animation class on every child
      var child;
      var i;
      for(i = 0; i < childrenInViewport.length; i++) {
        child = childrenInViewport[i].child;
        child.classList.add('animation-bubble-start');
        child.style.animationDelay = ((i + 1) * bubbleInterval / 1000) + 's';
        child.addEventListener('animationend', onBubbleEnd);
      }

      return endBubble;
    }
  };
})(window);
