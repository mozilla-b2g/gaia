'use strict';
/* global GridItem */

(function(exports) {

  /**
   * The placeholder represents an empty place on the grid.
   * This is generally used to detect distance from an empty spot on the grid.
   */
  function Placeholder() {
    this.detail = {
      type: 'placeholder',
      index: 0
    };
  }

  Placeholder.prototype = {

    __proto__: GridItem.prototype,

    /**
     * Returns the height in pixels of each icon.
     */
    get pixelHeight() {
      return this.grid.layout.gridItemHeight;
    },

    /**
     * Width in grid units for each icon.
     */
    gridWidth: 1,

    /**
     * Placeholders do not save. They are re-generated on render calls.
     */
    persistToDB: false,

    get name() {
      return '';
    },

    /**
     * Renders a transparent placeholder.
     * @param {Array} coordinates Grid coordinates to render to.
     * @param {Number} index The index of the items list of this item.
     */
    render: function(coordinates, index) {
      this.scale = this.grid.layout.percent;

      // Generate an element if we need to
      if (!this.element) {
        var tile = document.createElement('div');
        //tile.style.backgroundColor = '#ff0000'; // Useful for debugging.
        tile.className = 'icon placeholder';
        tile.style.height = this.grid.layout.gridItemHeight + 'px';
        this.element = tile;
        this.grid.element.appendChild(tile);
      }

      var x = this.x = coordinates[0] * this.grid.layout.gridItemWidth;
      var y = this.y = this.grid.layout.offsetY;
      this.setPosition(index);

      this.transform(x, y, this.grid.layout.percent);
    },
  };

  exports.Placeholder = Placeholder;

}(window));
