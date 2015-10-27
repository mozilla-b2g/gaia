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

    headerHeight: 0,

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
     */
    render: function() {
      // Generate the content if we need to
      if (!this.element) {
        // Divider is a <section> and the rest of items are <div> containers
        // in order to hide the last divider via :last-of-type pseudo-class
        var divider = this.element = document.createElement('section');
        divider.className = 'divider';

        var span = document.createElement('span');
        span.className = 'spacer';
        divider.appendChild(span);

        this.grid.element.appendChild(divider);
      }

      this.element.style.transform = 'translate(0 ,' + this.y + 'px)';
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
