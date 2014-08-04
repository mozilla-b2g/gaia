'use strict';
/* global GaiaGrid */

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

    __proto__: GaiaGrid.GridItem.prototype,

    /**
     * Returns the height in pixels of each icon.
     */
    get pixelHeight() {
      var itemHeight = this.grid.layout.gridItemHeight;

      // For placeholders which are there for edge group creation, give them
      // the minimum height necessary to render. The divider will already
      // have a spacing buffer.
      if (this.createsGroupOnDrop) {
        itemHeight = 1;
      }

      return itemHeight;
    },

    /**
     * When the placeholder is rendered in the last row, for group creation
     * purposes, there is special handling required for height.
     */
    createsGroupOnDrop: false,

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
        tile.className = 'icon placeholder';
        tile.style.height = this.pixelHeight + 'px';
        this.element = tile;
        this.grid.element.appendChild(tile);
      }

      var x = this.x = coordinates[0] * this.grid.layout.gridItemWidth;
      var y = this.y = this.grid.layout.offsetY;
      this.setPosition(index);

      this.transform(x, y, this.grid.layout.percent);
    },

    remove: function() {
      if (this.element) {
        this.element.parentNode.removeChild(this.element);
      }
    }
  };

  exports.GaiaGrid.Placeholder = Placeholder;

}(window));
