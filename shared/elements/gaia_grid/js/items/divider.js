'use strict';
/* global GaiaGrid */

(function(exports) {

  /**
   * Represents a single divider on the homepage.
   */
  function Divider() {
    this.detail = {
      type: 'divider',
      index: 0
    };
  }

  Divider.prototype = {

    __proto__: GaiaGrid.GridItem.prototype,

    x: 0,
    y: 0,

    /**
     * Height in pixels of each divider.
     */
    get pixelHeight() {
      return (this.grid.layout.cols > 3) ? 50 : 60;
    },

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
      if (!this.element) {
        // Divider is a <section> and the rest of items are <div> containers
        // in order to hide the last divider via :last-of-type pseudo-class
        var divider = this.element = document.createElement('section');
        divider.className = 'divider';

        var span = document.createElement('span');
        divider.appendChild(span);

        this.grid.element.appendChild(divider);
      }

      var y = this.grid.layout.offsetY;
      this.element.style.transform = 'translate(0 ,' + y + 'px)';

      this.detail.index = index;
      this.y = y;
    },

    remove: function() {
      if (this.element) {
        this.element.parentNode.removeChild(this.element);
      }
    },

    isDraggable: function() {
      return false;
    }
  };

  exports.GaiaGrid.Divider = Divider;

}(window));
