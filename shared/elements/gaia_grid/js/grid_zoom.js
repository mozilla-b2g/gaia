'use strict';

(function(exports) {

  const pinchThreshold = Math.round(window.innerWidth / 12);

  function GridZoom(gridView) {
    this.gridView = gridView;

    this.touches = 0;
    this.zoomStartTouches = [];
    this.zoomStartDistance = 0;

    this.container = document.getElementById('zoom');
    this.arrows = this.container.querySelector('.arrows');
    this.curtain = this.container.querySelector('.curtain');
    this.indicator = this.container.querySelector('.indicator');

    this.start();
    window.addEventListener('gaiagrid-dragdrop-begin', this.stop.bind(this));
    window.addEventListener('gaiagrid-dragdrop-finish', this.start.bind(this));
  }

  GridZoom.prototype = {

    /**
     * Starts listening for touchstart events.
     * This is what starts listening events to start the drag & drop operation.
     */
    start: function() {
      window.addEventListener('touchstart', this);
    },

    /**
     * Stops listening for touchstart events.
     * This will effectively disable pinch-to-zoom.
     */
    stop: function() {
      window.removeEventListener('touchstart', this);
    },

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

      var layout = this.gridView.layout;

      switch(e.type) {
        case 'touchstart':
          this.container.hidden = false;
          this.zoomStartTouches = touches;
          this.zoomStartDistance = touchDistance;

          if (layout.cols < layout.maxIconsPerRow) {
            this.arrows.classList.add('grow');
          } else {
            this.arrows.classList.add('shrink');
          }

          this.indicator.dataset.cols = layout.cols;
          this._attachGestureListeners();
          break;

        case 'touchmove':
          if (layout.cols < layout.maxIconsPerRow &&
              touchDistance < this.zoomStartDistance &&
              Math.abs(touchDistance - this.zoomStartDistance) >
                pinchThreshold) {
              this.gridView.cols = layout.maxIconsPerRow;
              this.zoomInProgress = true;
          } else if (layout.cols > layout.minIconsPerRow &&
                     touchDistance > this.zoomStartDistance &&
                     Math.abs(touchDistance - this.zoomStartDistance) >
                       pinchThreshold) {
            this.gridView.cols = layout.minIconsPerRow;
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

            this.gridView.render();

            // Reset zoom element state after a set time.
            var zoomHideTime = 400;
            setTimeout(this._resetState.bind(this), zoomHideTime);
          }.bind(this);

          this.arrows.addEventListener('transitionend', ontransitionend);

          this.indicator.dataset.cols = layout.cols;

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

  exports.GridZoom = GridZoom;

}(window));
