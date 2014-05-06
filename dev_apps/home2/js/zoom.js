'use strict';
/* global Layout */

(function(exports) {

  const pinchThreshold = Math.round(window.innerWidth / 12);

  function Zoom() {
    this.touches = 0;
    this.zoomStartTouches = [];
    this.zoomStartDistance = 0;

    this.container = document.getElementById('zoom');
    this.arrows = this.container.querySelector('.arrows');
    this.curtain = this.container.querySelector('.curtain');
    this.indicator = this.container.querySelector('.indicator');

    window.addEventListener('touchstart', this);
  }

  Zoom.prototype = {
    _attachGestureListeners: function() {
      window.addEventListener('touchmove', this);
      window.addEventListener('touchend', this);
    },

    _stopGestureListeners: function() {
      window.removeEventListener('touchmove', this);
      window.removeEventListener('touchend', this);
    },

    _resetState: function() {
      this.zoomInProgress = false;

      this.container.hidden = true;
      this.indicator.classList.remove('active');
      this.arrows.classList.remove('zooming', 'grow', 'shrink');
      this.arrows.style.transform = '';
    },

    /**
     * General Event Handler
     */
    handleEvent: function(e) {
      if (e.type === 'touchend' && this.zoomStartTouches) {
        if (!this.zoomInProgress) {
          this._resetState();
        }

        this._stopGestureListeners();
        return;
      }

      if (!e.touches || e.touches.length !== 2) {
        return;
      }

      // Sort touches by ascending pageX position.
      var touches = [e.touches[0], e.touches[1]].sort(function(a, b) {
        return a.pageX - b.pageX;
      });

      var touchDistance = Math.sqrt(
        (touches[0].pageX - touches[1].pageX) *
        (touches[0].pageX - touches[1].pageX) +
        (touches[0].pageY - touches[1].pageY) *
        (touches[0].pageY - touches[1].pageY));

      switch(e.type) {
        case 'touchstart':
          this.container.hidden = false;
          this.zoomStartTouches = touches;
          this.zoomStartDistance = touchDistance;

          if (Layout.perRow < Layout.maxIconsPerRow) {
            this.arrows.classList.add('grow');
          } else {
            this.arrows.classList.add('shrink');
          }

          this.indicator.dataset.cols = Layout.perRow;
          this._attachGestureListeners();
          break;

        case 'touchmove':
          if (Layout.perRow < Layout.maxIconsPerRow &&
              touchDistance < this.zoomStartDistance &&
              Math.abs(touchDistance - this.zoomStartDistance) >
                pinchThreshold) {
              Layout.percent = 0.75;
              this.zoomInProgress = true;
          } else if (Layout.perRow > Layout.minIconsPerRow &&
                     touchDistance > this.zoomStartDistance &&
                     Math.abs(touchDistance - this.zoomStartDistance) >
                       pinchThreshold) {
            Layout.percent = 1;
            this.zoomInProgress = true;
          } else {
            return;
          }

          // For now just implement a canned animation
          this._stopGestureListeners();

          var ontransitionend = function() {
            this.arrows.removeEventListener('transitionend', ontransitionend);
            // Change the indicator color at the end.
            this.indicator.classList.add('active');

            app.render();

            // Reset zoom element state after a set time.
            var zoomHideTime = 400;
            setTimeout(this._resetState.bind(this), zoomHideTime);
          }.bind(this);

          this.arrows.addEventListener('transitionend', ontransitionend);

          this.indicator.dataset.cols = Layout.perRow;

          this.arrows.classList.add('zooming');
          // Force a sync reflow
          document.body.clientHeight;
          var scaleTransform = 'scale(1)';
          if (this.zoomInProgress && touchDistance < this.zoomStartDistance) {
            scaleTransform = 'scale(0.4)';
          }
          this.arrows.style.transform = scaleTransform;

          break;
      }
    }

  };

  exports.Zoom = new Zoom();

}(window));
