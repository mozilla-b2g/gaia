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

    window.addEventListener('touchstart', this);
    window.addEventListener('touchmove', this);
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

      if (e.type === 'touchend') {
        console.log('touchend: ', e.touches.length);
      }

      if (!e.touches || e.touches.length !== 2) {
        return;
      }

      // Sort touches by ascending pageX position.
      var touches = [e.touches[0], e.touches[1]].sort(function(a, b) {
        return a.pageX - b.pageX;
      });

      switch(e.type) {
        case 'touchstart':
          this.zoomStartTouches = touches;
          break;
        case 'touchmove':
          if (this.perRow < maxIconsPerRow &&
              touches[1].pageX < this.zoomStartTouches[1].pageX) {
              this.percent = 0.75;
              app.render();
          } else if (this.perRow > minIconsPerRow &&
                     touches[1].pageX > this.zoomStartTouches[1].pageX) {
            this.percent = 1;
            app.render();
          }

          break;
      }
    }

  };

  exports.Zoom = Zoom;

}(window));
