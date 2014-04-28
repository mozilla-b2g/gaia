/* global EdgeSwipeDetector */
/* jshint nonew: false */
'use strict';

(function(exports) {
  var sheetTransitionManager = function(stack) {
    this.stack = stack;
    new EdgeSwipeDetector(this);
  };
  sheetTransitionManager.prototype = {
    _current: null,
    _new: null,
    _stack: null,

    // The overlay is used to cover the homescreen because
    // homescreen window's size may not fit current dimension.
    overlay: document.getElementById('sheet-transition-overlay'),

    screen: document.getElementById('screen'),

    start: function() {
      window.addEventListener('appsheet-transitionend', this);
      window.addEventListener('appopened', this);
      window.addEventListener('homescreenopening', this);
    },

    stop: function() {
      window.removeEventListener('appsheet-transitionend', this);
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'homescreenopening':
        case 'appsheet-transitionend':
        case 'appopened':
          this.end(evt);
          break;
      }
    },

    begin: function st_begin(direction) {
      var currentSheet = this.stack.getCurrent();
      if (!currentSheet) {
        return;
      }

      this.overlay.classList.add('visible');
      this.screen.classList.add('sheet-transitioning');

      var newSheet = (direction == 'ltr') ?
        this.stack.getPrev() : this.stack.getNext();

      this._currentApp = currentSheet;
      this._newApp = newSheet;

      if (this._currentApp) {
        this._currentApp.resetDuration();
      }

      if (this._newApp) {
        this._newApp.resetDuration();
        direction == 'ltr' ?
        this._newApp.place_right() : this._newApp.place_left();
      }
    },

    moveInDirection:
      function st_moveInDirection(direction, progress, distance) {
        var overflowing = !this._newApp;
        if (overflowing && (progress > 0.20)) {
          progress = 0.20 + (progress - 0.20) / (2 + progress);
        }
        this._adjustedProgress = progress;

        var factor = (direction == 'ltr') ? 1 : -1;
        if (factor < 0) {
          distance = - distance;
        }

        this._currentApp && this._currentApp.moveHorizontally(distance);
        if (this._newApp) {
          factor < 0 ? this._newApp.place_right() : this._newApp.place_left();
          this._newApp.moveHorizontally(distance);
        }
      },

    end: function st_end(evt) {
      this.overlay.classList.remove('visible');
      this.screen.classList.remove('sheet-transitioning');
    },

    snapBack: function st_snapBack() {
      var TIMEOUT = 300;
      var duration = TIMEOUT - (TIMEOUT * (1 - this._adjustedProgress));
      duration = Math.max(duration, 90);
      this._currentApp && this._currentApp.snapBack(duration);
      this._newApp && this._newApp.snapBack(duration);
    },

    snapForward: function st_snapForward(speed) {
      if (this._newApp) {
        var durationLeft = (1 - this._adjustedProgress) / speed;
        durationLeft /= 1.2; // boost

        var duration =
          Math.min(durationLeft, ((1 - this._adjustedProgress) * 300));
        this._currentApp && this._currentApp.snapForward(duration);
        this._newApp.snapForward(duration);
      } else {
        this.snapBack();
      }
    }
  };

  exports.SheetTransitionManager =
    new sheetTransitionManager(window.stackManager);
  exports.SheetTransitionManager.start();
}(window));
