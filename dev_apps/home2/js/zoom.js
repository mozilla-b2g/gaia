'use strict';

(function(exports) {

  const maxIconsPerCol = 4;

  const maxIconsPerRow = 4;

  const minIconsPerRow = 3;

  const windowHeight = window.innerHeight;

  const windowWidth = window.innerWidth;

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

    perRow: minIconsPerRow,

    minIconsPerRow: minIconsPerRow,

    maxIconsPerRow: maxIconsPerRow,

    _offsetY: 0,

    _percent: minIconsPerRow / minIconsPerRow,

    get percent() {
      return this._percent;
    },

    set percent(value) {

      // Reset the y-offset because we will re-render everything anyway.
      this._offsetY = 0;

      this._percent = value;
      this.perRow = maxIconsPerRow + minIconsPerRow - maxIconsPerRow * value;
    },

    /**
     * The height of each grid item.
     * This number changes based on current zoom level.
     */
    get gridItemHeight() {
      return windowHeight / maxIconsPerCol * this.percent;
    },

    /**
     * The width of each grid item.
     * This number changes based on current zoom level.
     */
    get gridItemWidth() {
      return windowWidth / this.perRow;
    },

    /**
     * Gets the current offset of the Y-axis for the current zoom level.
     * This value is updated by calling zoom.stepYAxis. For example, each
     * group of three icons, or a divider, should increment this value.
     * The value is reset and recalculated when the zoom level changes.
     */
    get offsetY() {
      return this._offsetY;
    },

    set offsetY(value) {
      this._offsetY = value;
    },

    /**
     * After we render a row we need to store the current position of the y-axis
     */
    stepYAxis: function(value) {
      this._offsetY += value;
    },

    /**
     * General Event Handler
     */
    handleEvent: function(e) {

      function stopGestureListeners() {
        /* jshint validthis: true */
        window.removeEventListener('touchmove', this);
        window.removeEventListener('touchend', this);
      }

      function resetState() {
        /* jshint validthis: true */
        this.zoomInProgress = false;

        this.container.hidden = true;
        this.indicator.classList.remove('active');
        this.arrows.classList.remove('shrink');
        this.arrows.classList.remove('grow');
        this.arrows.style.transform = '';

        window.addEventListener('touchstart', this);
      }

      if (e.type === 'touchend' && this.zoomStartTouches) {
        if (!this.zoomInProgress) {
          resetState.call(this);
        }

        stopGestureListeners();
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

          window.addEventListener('touchmove', this);
          window.addEventListener('touchend', this);
          break;
        case 'touchmove':
          if (this.perRow < maxIconsPerRow &&
              touchDistance < this.zoomStartDistance) {
              this.percent = 0.75;
              this.zoomInProgress = true;
              stopGestureListeners();
          } else if (this.perRow > minIconsPerRow &&
                     touchDistance > this.zoomStartDistance) {
            this.percent = 1;
            this.zoomInProgress = true;
            stopGestureListeners();
          } else {
            return;
          }

          // For now just implement a canned animation
          stopGestureListeners();

          this.arrows.addEventListener('transitionend',
            function ontransitionend() {
            this.arrows.removeEventListener('transitionend', ontransitionend);

            // Change the indicator color at the end.
            this.indicator.classList.add('active');

            // Reset zoom element state after a set time.
            app.render();

            var zoomHideTime = 400;
            setTimeout(resetState.bind(this), zoomHideTime);
          }.bind(this));

          this.indicator.dataset.cols = this.perRow;

          if (this.zoomInProgress && touchDistance < this.zoomStartDistance) {
            this.arrows.classList.add('grow');
            // Force a sync reflow
            document.body.clientHeight;
            this.arrows.style.transform = 'scale(0.4)';
          } else {
            this.arrows.classList.add('shrink');
            // Force a sync reflow
            document.body.clientHeight;
            this.arrows.style.transform = 'scale(1)';
          }

          break;
      }
    }

  };

  exports.Zoom = Zoom;

}(window));
