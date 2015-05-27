'use strict';

/* globals GestureDetector */
/* exported Swipeable */

(function(exports) {
  var Swipeable = function(container, eltSelector, options) {
    this._container = container.querySelector('.swipeable-container');
    this._eltSelector = eltSelector;

    this.updateElements();
    this._createProgress();
    
    this._gestureDetector = new GestureDetector(this._container,
                                                { holdEvents: false });
    this._panHandler = e => this._handlePan(e);
    this._swipeHandler = e => this._handleSwipe(e);

    this._container.addEventListener('tap', (e) => {
      if(this._tapCallback) {
        this._tapCallback(this._elts[this._activeEltIdx].id);
      }
    });

    options = options || {};
    this._elWidth = options['element-width'] || this._elts[0].offsetWidth;
    this._triggerPoint = options['auto-scroll-trigger'] || this._triggerPoint;
    this._minSpeed = options['min-speed'] || this._minSpeed;
  };

  Swipeable.prototype = {
    _gestureDetector: null,
    _container: null,
    _eltSelector: null,
    _elts: [],
    _progressElts: null,

    _elWidth: 0,
    _triggerPoint: 0.25,
    _minSpeed: 1.0,

    _inTransition: false,
    _offset: 0,
    _activeEltIdx: 0,

    _tapCallback: null,
    _swipeCallback: null,
    _vertSwipeCallback: null,

    set ontap(callback) {
      this._tapCallback = callback;
    },

    set onswipe(callback) {
      this._swipeCallback = callback;
    },

    set onvertswipe(callback) {
      this._vertSwipeCallback = callback;
    },

    enable: function() {
      this._gestureDetector.startDetecting();
      this.unpauseSwipe();
    },

    disable: function() {
      this._gestureDetector.stopDetecting();
    },

    pauseSwipe: function() {
      this._container.removeEventListener('pan', this._panHandler);
      this._container.removeEventListener('swipe', this._swipeHandler);
    },

    unpauseSwipe: function() {
      this._container.addEventListener('pan', this._panHandler);
      this._container.addEventListener('swipe', this._swipeHandler);
    },

    updateElements: function() {
      var nodeList = this._container.querySelectorAll('.swipeable > ' + this._eltSelector);
      this._elts = Array.prototype.slice.call(nodeList);
    },

    _createProgress: function() {
      if(!this._elts || !this._elts.length) {
        return;
      }

      var progressDiv = this._container.querySelector('.swipeable-progress');
      if(!progressDiv) {
        return;
      }

      var progressFragment = document.createDocumentFragment();
      this._progressElts = this._elts.map(() => {
        var div = document.createElement('div');
        progressFragment.appendChild(div);
        return div;
      });

      this._progressElts[0].classList.add('swipeable-progress-active');
      progressDiv.innerHTML = '';
      progressDiv.appendChild(progressFragment);
    },

    _updateProgress: function() {
      this._progressElts.forEach((elt, idx) => {
        if(idx === this._activeEltIdx) {
          elt.classList.add('swipeable-progress-active');
        } else if(elt.classList.contains('swipeable-progress-active')) {
          elt.classList.remove('swipeable-progress-active');
        }
      });
    },

    progressSelect: function progressSelect(idx, select) {
      var pElt = this._progressElts[idx];
      if(!pElt) {
        return;
      }

      if(select) {
        pElt.classList.add('swipeable-progress-selected');
      } else if(pElt.classList.contains('swipeable-progress-selected')) {
        pElt.classList.remove('swipeable-progress-selected');
      }
    },

    _handlePan: function(event) {
      if(this._inTransition) {
        return;
      }

      if (Math.abs(event.detail.relative.dx) > Math.abs(event.detail.relative.dy)) {
        this._offset += event.detail.relative.dx;
        this._animate();
      }
    },

    _handleSwipe: function(event) {
      if(this._vertSwipeCallback &&
         ['up', 'down'].indexOf(event.detail.direction) !== -1) {
        var id = this._elts[this._activeEltIdx].id;
        this._vertSwipeCallback(event.detail.direction, id);
      }

      var elPos = Math.abs(this._offset)%this._elWidth;
      var triggerPassed = elPos > this._elWidth * this._triggerPoint;

      var velocity = event.detail.vx;
      var fastEnough = Math.abs(velocity) > this._minSpeed;

      var direction = (event.detail.direction === 'left') ? 1 : -1;
      var newIdx = this._computeNewIndex(direction);

      // Make sure that that the speed and pan amount are in the same direction
      //var samedirection = velocity === 0 || this._offset / velocity >= 0;

      if((triggerPassed || fastEnough) && newIdx !== this._activeEltIdx) {
        var speed = Math.max(Math.abs(velocity), this._minSpeed);
        var time = (this._elWidth - Math.abs(this._offset%this._elWidth)) / speed;
        
        this._activeEltIdx = newIdx;
        this._performScroll(time);
        this._updateProgress();
        if (this._swipeCallback) {
          this._swipeCallback(this._activeEltIdx);
        }
      } else if(this._offset !== 0){
        var time = Math.abs(this._offset%this._elWidth) / this._minSpeed;
        this._performScroll(time);
        if (this._swipeCallback) {
          this._swipeCallback(this._activeEltIdx);
        }
      }
    },

    _animate: function(time) {
      var handler = (e) => {
        e.target.style.transition = null;
        e.target.removeEventListener('transitionend', handler);
      };
      this._elts.forEach((el) => {
        if(time) {
          el.style.transition = 'transform ' + time + 'ms ease';
          el.addEventListener('transitionend', handler);
        }
        el.style.transform = 'translate3d('+this._offset+'px,0,0)';
      });
    },

    _performScroll: function(time) {
      this._inTransition = true;
      this._offset = -1 * this._activeEltIdx * this._elWidth;
      this._animate(time);
      setTimeout(() => { this._inTransition = false; }, time);
    },

    _computeNewIndex: function(direction) {
      var index = this._activeEltIdx + direction;
      var offBounds = index < 0 || index >= this._elts.length;
      return offBounds ? this._activeEltIdx : index;
    }
  };

  exports.Swipeable = Swipeable;
}((typeof exports === 'undefined') ? window : exports));
