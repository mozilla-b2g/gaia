'use strict';
/* global Bookmark */
/* global layout */
/*jshint nonew: false */

(function(exports) {

  function App() {
    this.container = document.getElementById('icons');
    this.iconLaunch = this.clickIcon.bind(this);
  }

  App.prototype = {

    /**
     * List of all application icons.
     * Maps an icon identifier to an icon object.
     */
    icons: {},

    /**
     * Lists of all displayed objects in the homescreen.
     * Includes app icons, dividers, and bookmarks.
     */
    items: [],

    /**
     * Adds an item into the items array.
     * If the item is an icon, add it to icons.
     */
    addItem: function(item) {
      this.items.push(item);

      if (item instanceof Icon || item instanceof Bookmark) {
        this.icons[item.identifier] = item;
      }
    },

    /**
     * Fetch all icons and render them.
     */
    init: function() {
      this.items = [];
      this.render();
      this.start();
    },

    start: function() {
      this.container.addEventListener('click', this.iconLaunch);
    },

    stop: function() {
      this.container.removeEventListener('click', this.iconLaunch);
    },

    /**
     * Renders all icons.
     * Positions app icons and dividers accoriding to available space
     * on the grid.
     */
    render: function() {
      document.body.dataset.cols = layout.perRow;

      // Reset offset steps
      layout.offsetY = 0;

      // Grid render coordinates
      var x = 0;
      var y = 0;

      /**
       * Steps the y-axis.
       * @param {Object} item
       */
      function step(item) {
        layout.stepYAxis(item.pixelHeight);

        x = 0;
        y++;
      }

      this.items.forEach(function(item, idx) {

        // If the item would go over the boundary before rendering,
        // step the y-axis.
        if (x > 0 && item.gridWidth > 1 &&
            x + item.gridWidth >= layout.perRow) {
          // Step the y-axis by the size of the last row.
          // For now we just check the height of the last item.
          var lastItem = this.items[idx - 1];
          step(lastItem);
        }

        item.render({
          x: x,
          y: y
        }, idx);

        // Increment the x-step by the sizing of the item.
        // If we go over the current boundary, reset it, and step the y-axis.
        x += item.gridWidth;
        if (x >= layout.perRow) {
          step(item);
        }
      }, this);
    },

    /**
     * Launches an app.
     */
    clickIcon: function(e) {
      // TODO
      alert('not implemented');
    }
  };

  exports.app = new App();
  exports.app.init();

}(window));
