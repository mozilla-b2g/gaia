'use strict';
/* global AppWindow, layoutManager */

(function(exports) {
  /**
   * @mixin SheetTransitionController
   */
  var SheetTransitionController = {
    COMMIT_TIMEOUT: 800,
    DURATION: 300,
    resetTransform: function() {
      this.debug('reset transform');

      if (this.element) {
        this.element.style.transform = '';
        this._transformed = false;
        this.element.removeAttribute('sheet-state');
      }
    },

    place_center: function() {
      this._edgeState = 'center';
      this.element.setAttribute('sheet-state', 'center');
      this.element.style.transform = this.getTransformString('center');
      this.publish('sheet-transitionbegin');
    },

    place_left: function() {
      this._edgeState = 'left';
      this.element.setAttribute('sheet-state', 'left');
      this.element.style.transform = this.getTransformString('left');
      this.publish('sheet-transitionbegin');
    },

    place_right: function() {
      this._edgeState = 'right';
      this.element.setAttribute('sheet-state', 'right');
      this.element.style.transform = this.getTransformString('right');
      this.publish('sheet-transitionbegin');
    },

    moveHorizontally: function(distance, noTransition) {
      this.resetDuration();
      if (distance > 0) {
        this._movingDirection = 'ltr';
      } else {
        this._movingDirection = 'rtl';
      }
      if (noTransition) {
        this.resetDuration();
      }
      var degree = this.getRotationDegree();

      this.debug('move', distance, 'with', degree);
      this.element.classList.add('edge-transitioning');
      this.element.style.transform =
        this.getTransformString(this._edgeState) +
        ' translateX(' +
        distance * Math.cos(Math.PI * degree / 180) + 'px) translateY(' +
        distance * ( - Math.sin(Math.PI * degree / 180)) + 'px)';
    },

    getTransformString: function(state) {
      var degree = this.getRotationDegree();
      var diffX = layoutManager.fullWidth - this.width;
      var diffY = layoutManager.fullHeight - this.height;
      var string = 'translateX(' + diffX / 2 + 'px) ' +
                    'translateY(' + diffY / 2 + 'px) ' +
                    'rotate(' + degree + 'deg) ';
      var stringLeft = 'translateX(' +
                    100 * (- Math.cos(Math.PI * degree / 180)) + '%) ' +
                   'translateY(' +
                    100 * Math.sin(Math.PI * degree / 180) + '%)' +
                    'translateX(' +
        -20 * Math.cos(Math.PI * degree / 180) + 'px) translateY(' +
        -20 * ( - Math.sin(Math.PI * degree / 180)) + 'px)';

      var stringRight = 'translateX(' +
                    100 * Math.cos(Math.PI * degree / 180) + '%) ' +
                   'translateY(' +
                    100 * ( - Math.sin(Math.PI * degree / 180)) + '%)' +
                            'translateX(' +
        20 * Math.cos(Math.PI * degree / 180) + 'px) translateY(' +
        20 * ( - Math.sin(Math.PI * degree / 180)) + 'px)';

      switch (this._edgeState) {
        case 'center':
          return string;
        case 'right':
          return string + stringRight;
        case 'left':
          return string + stringLeft;
      }
    },

    move_right: function() {
      this.debug('move to right');
      this.setDuration();
      this.place_right();
    },

    move_left: function() {
      this.debug('move to left');
      this.setDuration();
      this.place_left();
    },

    move_center: function() {
      this.debug('move to center');
      this.setDuration();
      this.place_center();
      return true;
    },

    /**
     * Set the duration of the app sheet.
     * @param {Number} duration     The time to complete this transition.
     * @param {Boolean} commit Commit the transition right away.
     *                          Commit means we need to be in opened state
     *                          after the transition is ended.
     *                          Otherwise, someone (StackManager)
     *                          will do that for us.
     */
    setDuration: function(duration, commit) {
      if (!this.element) {
        return;
      }

      if (!duration) {
        duration = this.DURATION;
      }

      var self = this;

      this.element.addEventListener('transitionend', function wait(evt) {
        if (evt.propertyName !== 'transform') {
          return;
        }
        if (commit || self._edgeState !== 'center') {
          self._commitSheetState();
        } else {
          self._commitTimer = setTimeout(function() {
            self._commitSheetState();
          }, self.COMMIT_TIMEOUT);
        }

        self.element.removeEventListener('transitionend', wait);
        self['place_' + [self._edgeState]]();
        self.publish('sheet-transitionend');
      });

      this.element.style.transition = 'transform ' + duration + 'ms linear';
    },

    _commitSheetState: function() {
      switch (this._edgeState) {
        case 'center':
          this._handle__swipein();
          break;
        case 'right':
        case 'left':
          this._handle__swipeout();
          break;
      }
      this.element.classList.remove('edge-transitioning');
      this.resetDuration();
      this.resetTransform();
    },

    resetDuration: function() {
      if (!this.element) {
        return;
      }

      this.element.style.transition = '';
      this.clearCommitTimer();
    },

    clearCommitTimer: function() {
      if (this._commitTimer) {
        window.clearTimeout(this._commitTimer);
        this._commitTimer = null;
      }
    },

    /**
     * Snap the app sheet back to it previous position.
     * @memberOf AppWindow.prototype
     */
    snapBack: function(duration) {
      this.setDuration(duration);
      switch (this._edgeState) {
        case 'center':
          this.move_center();
          break;
        case 'left':
          this.move_left();
          break;
        case 'right':
          this.move_right();
          break;
      }
    },

    /**
     * Snap the app sheet forward to it next position.
     * @memberOf AppWindow.prototype
     */
    snapForward: function(duration) {
      this.setDuration(duration);
      switch (this._edgeState) {
        case 'center':
          this._movingDirection == 'ltr' ?
            this.move_right(): this.move_left();
          break;
        case 'left':
          this.move_center();
          break;
        case 'right':
          this.move_center();
          break;
      }
    },

    /**
     * The states of sheets are listed below:
     * * left
     * * center
     * * right
     * @type {String|Null}
     */
    _edgeState: 'center'
  };
  AppWindow.addMixin(SheetTransitionController);
}(window));