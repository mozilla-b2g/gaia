'use strict';

(function(exports) {

  const maxIconsPerRow = 4;

  // 320 / 5 = 64px | 480 / 5 = 96px | 540 / 5 = 108px | ...
  const iconScaleFactorMaxIconsPerRow = 5;

  const minIconsPerRow = 3;

  // 320 / 3.8 = 84px | 480 / 3.8 = 126px | 540 / 3.8 = 142px | ...
  const iconScaleFactorMinIconsPerRow = 3.8;

  const distanceBetweenIconsWithMinIconsPerRow = 32;

  const distanceBetweenIconsWithMaxIconsPerRow = 44;

  const windowWidth = window.innerWidth;

  function GridLayout(gridView) {
    this.gridView = gridView;
    window.addEventListener('appzoom', this);
  }

  GridLayout.prototype = {

    perRow: minIconsPerRow,

    minIconsPerRow: minIconsPerRow,

    maxIconsPerRow: maxIconsPerRow,

    _offsetY: 0,

    _percent: 1,

    /**
     * The visible height of each divider.
     * Calculated by the divider class and cached here.
     */
    _dividerLineHeight: 0,

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
     */
    get gridItemHeight() {
      return this.gridIconSize +
            (this.perRow === minIconsPerRow ?
                             distanceBetweenIconsWithMinIconsPerRow :
                             distanceBetweenIconsWithMaxIconsPerRow);
    },

    /**
     * The width of each grid item.
     * This number changes based on current zoom level.
     */
    get gridItemWidth() {
      return windowWidth / this.perRow;
    },

    /**
     * Returns the maximum size in pixels for an icon image. It is the size when
     * the grid is displayed with the minimum number of columns plus the scale
     * applied in dragdrop
     */
    get gridMaxIconSize() {
      return (windowWidth / iconScaleFactorMinIconsPerRow) *
              this.gridView.dragdrop.maxActiveScale;
    },

    /**
     * Returns the icon image size depending on grid configuration and screen
     * characteristics.
     */
    get gridIconSize() {
      var numCols = this.perRow;

      var size = windowWidth / numCols;
      if (numCols === minIconsPerRow) {
        size = windowWidth / iconScaleFactorMinIconsPerRow;
      } else if (numCols === maxIconsPerRow) {
        size = windowWidth / iconScaleFactorMaxIconsPerRow;
      }

      return size;
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
     * General event handler.
     */
    handleEvent: function(e) {
      if (e.type === 'appzoom') {
        document.body.dataset.cols = this.perRow;
      }
    }
  };

  exports.GridLayout = GridLayout;

}(window));
