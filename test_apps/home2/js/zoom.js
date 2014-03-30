'use strict';

(function(exports) {

  // Maximum number of allowed icons per column.
  const maxIconsPerCol = 4;

  // Maximum number of allowed icons per row.
  const maxIconsPerRow = 4;

  // Minimum number of allowed icons per row.
  const minIconsPerRow = 3;

  // Height of the window.
  const windowHeight = window.innerHeight;

  // Width of the window.
  const windowWidth = window.innerWidth;

  // Number of pixels that the user must pinch to zoom.
  const touchZoomThreshold = windowWidth / 3;

  // Speed up the tracking of icons to the pinch motion
  const percentMultiplier = 1.75;

  function Zoom() {
    this.touches = 0;
    this.zoomStartDistance = 0;
    this.zoomStartTouches = [];

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
     * Horizontal center of screen where to track icons to during a pinch.
     */
    get centerScreenX() {
      return this._centerScreenX;
    },

    /**
     * Vertical Center of screen where to track icons to during a pinch.
     */
    get centerScreenY() {
      return this._centerScreenY;
    },

    /**
     * After we render a row we need to store the current position of the y-axis
     */
    stepYAxis: function(value) {
      this._offsetY += value;
    },

    /**
     * Tells the app object to snap icons to the grid.
     * Sets proper transform speeds of icons.
     */
    snapToGrid: function() {
      app.iconContainer.classList.remove('tracking');
      app.iconContainer.classList.add('snapping');
      setTimeout(app.render.bind(app));
    },

    /**
     * General Event Handler
     */
    handleEvent: function(e) {

      if (e.type === 'touchend' && this.zoomStartTouches) {
        this.zoomStartTouches = [];
        window.removeEventListener('touchmove', this);
        window.removeEventListener('touchend', this);
        this.snapToGrid();
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
          this.zoomStartTouches = touches;
          this.zoomStartDistance = touchDistance;

          this._centerScreenX = windowWidth / 2;
          this._centerScreenY = windowHeight / 2 +
            document.documentElement.scrollTop;

          window.addEventListener('touchmove', this);
          window.addEventListener('touchend', this);
          break;
        case 'touchmove':
          var distanceMoved = Math.abs(this.zoomStartDistance - touchDistance);

          // Track the touch by zooming to the center of the screen.
          // Move each item to the center of the screen based on a percentage.
          var animationPercent = distanceMoved /
            touchZoomThreshold * percentMultiplier;

          if (animationPercent > 1) {
            animationPercent = 1;
          }

          // If we have tracked touching past a certain threshold,
          // snap the icons to their spot
          if (Math.abs(1 - animationPercent) < 0.1) {
            if (this.perRow < maxIconsPerRow &&
                touchDistance < this.zoomStartDistance) {
                this.percent = 0.75;
                this.snapToGrid();
            } else if (this.perRow > minIconsPerRow &&
                       touchDistance > this.zoomStartDistance) {
              this.percent = 1;
              this.snapToGrid();
            } else {
              this.snapToGrid();
            }

            window.removeEventListener('touchmove', this);
            window.removeEventListener('touchend', this);
            return;
          }

          for (var i = 0, iLen = app.items.length; i < iLen; i++) {
            var item = app.items[i];

            // Only animate icons for now.
            if (!item.transform) {
              continue;
            }

            var x;
            var y;

            // Items know how wide and tall they are, and are poisitoned based
            // on coordinates. We need to calcualte a point to track to,
            // adjusting for the height and width of each grid item.
            var trackToX = this.centerScreenX - app.zoom.gridItemWidth / 2;
            var trackToY = this.centerScreenY - app.zoom.gridItemHeight / 2;

            if (item.x < trackToX) {
              x = (trackToX - item.x) * animationPercent + item.x;
            } else {
              x = item.x - (item.x - trackToX) * animationPercent;
            }

            if (item.y < trackToY) {
              y = (trackToY - item.y) * animationPercent + item.y;
            } else {
              y = item.y - (item.y - trackToY) * animationPercent;
            }

            item.transform(x, y, item.scale);
          }
          break;
      }
    }

  };

  exports.Zoom = Zoom;

}(window));
