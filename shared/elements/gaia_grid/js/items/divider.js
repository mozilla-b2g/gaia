'use strict';
/* global GridItem */

(function() {

  /**
   * Represents a single divider on the homepage.
   */
  function Divider() {
    this.detail = {
      type: 'divider',
      index: 0
    };

    /**
     * Use polynomial regression to find the ideal divider size.
     * This calculates the appropriate divider height depending
     * on screen height. Examples (height, divider size):
     * 480,3 / 854,4 / 960,4 / 1280,6 / 1920,8
     * This result is cached in the GridView so we don't have to
     * calculate it again.
     */
    if (!this.grid.layout._dividerLineHeight) {
      this.grid.layout._dividerLineHeight = Math.round(3.8 * Math.pow(10, -7) *
        Math.pow(screen.height, 2) + 2.7 * Math.pow(10, -3) *
        screen.height + 1.5);
    }
    this.lineHeight = this.grid.layout._dividerLineHeight;
  }

  Divider.prototype = {

    __proto__: GridItem.prototype,

    x: 0,
    y: 0,

    /**
     * Height in pixels of each divider.
     */
    pixelHeight: 70,

    /**
     * Width in grid units for each divider.
     */
    gridWidth: 4,

    scale: 1,

    /**
     * Renders the icon to the grid component.
     * @param {Object} coordinates Grid coordinates to render to.
     * @param {Number} index The index of the items list of this item.
     */
    render: function(coordinates, index) {
      // Generate the content if we need to
      if (!this.divider) {
        var divider = this.divider = document.createElement('div');
        divider.className = 'divider';

        var span = document.createElement('span');
        span.style.height = this.lineHeight + 'px';
        divider.appendChild(span);

        this.grid.element.appendChild(divider);
      }

      var y = this.grid.layout.offsetY;
      this.divider.style.transform = 'translate(0 ,' + y + 'px)';

      this.detail.index = index;
      this.y = y;
    },

    remove: function() {
      if (this.divider) {
        this.divider.parentNode.removeChild(this.divider);
      }
    }
  };

  window.Divider = Divider;

}());
