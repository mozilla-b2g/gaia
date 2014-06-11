'use strict';
/* global Divider */
/* global GridDragDrop */
/* global GridLayout */
/* global GridZoom */
/* global Placeholder */

(function(exports) {

  function addMarker(to, x, y, remove) {
    // HACK CODE
    var element = document.createElement('div');
    element.style.border = '1px solid green';
    element.style.background = 'green';
    element.style.width = element.style.height = '10px';
    element.style.position = 'absolute';
    element.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    element.classList.add('icon');
    to.appendChild(element);

    if (remove) {
      setTimeout(function() {
        element.parentNode.removeChild(element);
      }, 10000);
    }
  }

  const PREVENT_CLICK_TIMEOUT = 300;

  /**
   * GridView is a generic class to render and display a grid of items.
   * @param {Object} config Configuration object containing:
   *  - element: The shadow root of the grid
   */
  function GridView(config) {
    this.config = config;
    this.clickIcon = this.clickIcon.bind(this);
    this.onScroll = this.onScroll.bind(this);

    if (config.features.zoom) {
      this.zoom = new GridZoom(this);
    }

    if (config.features.dragdrop) {
      this.dragdrop = new GridDragDrop(this);
    }

    this.layout = new GridLayout(this);

    // Set columns if we have a 'cols' attribute
    if (config.element.hasAttribute('cols')) {
      this.layout.cols = parseInt(config.element.getAttribute('cols'), 10);
    }

    // Enable event listeners when instantiated.
    this.start();
  }

  GridView.prototype = {
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
     * Returns a reference to the gaia-grid element.
     */
    get element() {
      return this.config.element;
    },

    /**
     * Sets the number of columns.
     */
    set cols(value) {
      this.layout.cols = value;
    },

    /**
     * Adds an item into the items array.
     * If the item is an icon, add it to icons.
     */
    add: function(item) {
      this.items.push(item);

      if (item.identifier) {
        this.icons[item.identifier] = item;
      }
    },

    start: function() {
      this.element.addEventListener('click', this.clickIcon);
      window.addEventListener('scroll', this.onScroll);
    },

    stop: function() {
      this.element.removeEventListener('click', this.clickIcon);
      window.removeEventListener('scroll', this.onScroll);
    },

    onScroll: function(e) {
      this.element.removeEventListener('click', this.clickIcon);
      clearTimeout(this.preventClickTimeout);
      this.preventClickTimeout = setTimeout(function addClickEvent() {
        this.element.addEventListener('click', this.clickIcon);
      }.bind(this), PREVENT_CLICK_TIMEOUT);
    },

    /**
     * Launches an app.
     */
    clickIcon: function(e) {
      var container = e.target;
      var action = 'launch';

      if (e.target.classList.contains('remove')) {
        container = e.target.parentNode;
        action = 'remove';
      }

      var identifier = container.dataset.identifier;
      var icon = this.icons[identifier];

      if (!icon) {
        return;
      }

      // We do not allow users to launch icons in edit mode
      if (action === 'launch' && this.dragdrop && this.dragdrop.inEditMode) {
        if (icon.detail.type !== 'bookmark') {
          return;
        }
        // Editing a bookmark in edit mode
        action = 'edit';
      }

      icon[action]();
    },

    /**
     * Scrubs the list of items, removing empty sections.
     */
    cleanItems: function(skipDivider) {
      var appCount = 0;
      var toRemove = [];

      this.items.forEach(function(item, idx) {
        if (item instanceof Divider) {
          if (appCount === 0) {
            toRemove.push(idx);
          }
          appCount = 0;
        } else {
          appCount++;
        }
      }, this);

      toRemove.reverse();
      toRemove.forEach(function(idx) {
        var removed = this.items.splice(idx, 1)[0];
        removed.remove();
      }, this);

      // There should always be a divider at the end, it's hidden in CSS when
      // not in edit mode.
      if (skipDivider) {
        return;
      }
      var lastItem = this.items[this.items.length - 1];
      if (!(lastItem instanceof Divider)) {
        this.items.push(new Divider());
      }
    },

    /**
     * Removes placeholders from the grid.
     */
    removeAllPlaceholders: function() {
      var toSplice = [];
      var previousItem;
      this.items.forEach(function(item, idx) {
        if (item instanceof Placeholder) {

          // If the previous item is a divider, and we are in edit mode
          // we do not remove the placeholder. This is so the section will
          // remain even if the user drags the icon around. Bug 1014982
          if (previousItem && previousItem instanceof Divider &&
              this.dragdrop && this.dragdrop.inDragAction) {
            return;
          }

          toSplice.push(idx);
        }

        previousItem = item;
      }, this);

      toSplice.reverse().forEach(function(idx) {
        this.items.splice(idx, 1)[0].remove();
      }, this);
    },

    /**
     * Finds nearest item by and returns an index.
     *
     * @param {Number} x relative to the screen
     * @param {Number} y relative to the screen
     */
    getNearestItem: function(x, y) {
      addMarker(this.element, x, y, true);
      // Find the icon with the closest X/Y position of the move,
      // XXX: this could be more efficient with a binary search.
      var leastDistance;
      var foundIndex;
      for (var i = 0, iLen = this.items.length; i < iLen; i++) {
        var item = this.items[i];
        var distance = Math.sqrt(
          (x - item.x) * (x - item.x) +
          (y - item.y) * (y - item.y));
        if (!leastDistance || distance < leastDistance) {
          leastDistance = distance;
          foundIndex = i;
        }
      }

      return foundIndex;
    },

    /**
     * Creates placeholders and injects them into the grid.
     * @param {Array} coordinates [x,y] coordinates on the grid of the first
     * item in grid units.
     * @param {Integer} idx The position of the first placeholder.
     * @param {Integer} idx The number of placeholders to create.
     */
    createPlaceholders: function(coordinates, idx, count) {
      for (var i = 0; i < count; i++) {
        var itemCoords = [
          coordinates[0] + i,
          coordinates[1]
        ];

        var item = new Placeholder();
        this.items.splice(idx + i, 0, item);
        item.render(itemCoords, idx + i);
      }
    },

    _getOffset: function() {
    },

    /**
     * Renders all icons.
     * Positions app icons and dividers accoriding to available space
     * on the grid.
     * @param {Object} options Options to render with including:
     *  - from {Integer} The index to start rendering from.
     *  - skipDivider {Boolean} Whether or not to skip the divider
     */
    render: function(options) {
      var self = this;
      options = options || {};

      this.removeAllPlaceholders();
      this.cleanItems(options.skipDivider);

      // Start rendering from one before the drop target. If not,
      // we may drop over the divider and miss rendering an icon.
      var from = options.from - 1 || 0;

      // TODO This variable should be an argument of this method. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1010742#c4
      var to = this.items.length - 1;

      // Reset offset steps
      this.layout.offsetY = 0;

      // Grid render coordinates
      var x = 0;
      var y = 0;

      /**
       * Steps the y-axis.
       * @param {Object} item
       */
      function step(item) {
        self.layout.stepYAxis(item.pixelHeight);

        x = 0;
        y++;
      }

      for (var idx = 0; idx <= to; idx++) {
        var item = this.items[idx];

        // If the item would go over the boundary before rendering,
        // step the y-axis.
        if (x > 0 && item.gridWidth > 1 &&
            x + item.gridWidth >= this.layout.cols) {

          // Insert placeholders to fill remaining space
          var remaining = this.layout.cols - x;
          this.createPlaceholders([x, y], idx, remaining);

          // Increment the current index due to divider insertion
          idx += remaining;
          to += remaining;
          item = this.items[idx];

          // Step the y-axis by the size of the last row.
          // For now we just check the height of the last item.
          var lastItem = this.items[idx - (remaining + 1)];
          step(lastItem);
        }

        if (idx >= from) {
          item.render([x, y], idx);
          addMarker(this.element, item.x, item.y, false);
        }

        // Increment the x-step by the sizing of the item.
        // If we go over the current boundary, reset it, and step the y-axis.
        x += item.gridWidth;
        if (x >= this.layout.cols) {
          step(item);
        }
      }

      this.element.setAttribute('cols', this.layout.cols);
    }
  };

  exports.GridView = GridView;

}(window));
