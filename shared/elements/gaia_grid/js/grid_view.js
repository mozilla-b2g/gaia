'use strict';
/* global GridDragDrop */
/* global GaiaGrid */
/* global GridLayout */
/* global GridZoom */

(function(exports) {

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
     * Whether item visibility needs to be recalculated after the next
     * render.
     */
    visibilityCalculated: false,

    /**
     * List of all visible displayed app icons in the homescreen.
     */
    visibleIcons: [],

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

      // Make sure visibility gets recalculated on the next render
      this.visibilityCalculated = false;
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
      this.element.classList.add('scrolling');
      this.element.removeEventListener('click', this.clickIcon);
      clearTimeout(this.preventClickTimeout);
      this.preventClickTimeout = setTimeout(function addClickEvent() {
        this.element.addEventListener('click', this.clickIcon);
        this.element.classList.remove('scrolling');
        this.calcVisibility();
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
      } else {
        // Add a 'launching' class to the icon to style it with CSS.
        icon.element.classList.add('launching');

        // XXX: We can't have nice things. Remove the launching class after an
        // arbitrary time to restore the state. We want the icon to return
        // to it's original state after launching the app, but visibilitychange
        // will not work because activities do not fire it.
        var returnTimeout = 500;
        setTimeout(function stateReturn() {
          icon.element.classList.remove('launching');
        }, returnTimeout);
      }

      icon[action]();
    },

    /**
     * Calculates whether an icon is visible or not and sets a CSS class
     * accordingly.
     */
    calcVisibility: function() {
      this.visibleIcons.forEach(function(item) {
        item.element.classList.remove('visible');
      }, this);
      this.visibleIcons = [];

      var visibleStart = this.element.parentNode.scrollTop;
      var visibleEnd = visibleStart + this.element.parentNode.clientHeight;
      var itemHeight = this.layout.gridItemHeight;
      this.items.forEach(function(item) {
        if (item instanceof GaiaGrid.Mozapp) {
          if (item.element.offsetTop + itemHeight > visibleStart &&
              item.element.offsetTop < visibleEnd) {
            item.element.classList.add('visible');
            this.visibleIcons.push(item);
          }
        }
      }, this);

      this.visibilityCalculated = true;
    },

    /**
     * Scrubs the list of items, removing empty sections.
     */
    cleanItems: function() {
      var appCount = 0;
      var toRemove = [];

      this.items.forEach(function(item, idx) {
        if (item instanceof GaiaGrid.Divider) {
          if (appCount === 0 || (idx === this.items.length - 1)) {
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
    },

    /**
     * Removes placeholders from the grid.
     */
    removeAllPlaceholders: function() {
      var toSplice = [];
      var previousItem;
      this.items.forEach(function(item, idx) {
        if (item instanceof GaiaGrid.Placeholder) {

          // If the previous item is a divider, and we are in edit mode
          // we do not remove the placeholder. This is so the section will
          // remain even if the user drags the icon around. Bug 1014982
          if (previousItem && previousItem instanceof GaiaGrid.Divider &&
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

        var item = new GaiaGrid.Placeholder();
        this.items.splice(idx + i, 0, item);
        item.render(itemCoords, idx + i);
      }
    },

    /**
     * Renders all icons.
     * Positions app icons and dividers accoriding to available space
     * on the grid.
     * @param {Object} options Options to render with including:
     *  - from {Integer} The index to start rendering from.
     *  - to {Integer} The index to end rendering at.
     *  - skipDivider {Boolean} Whether or not to skip the divider
     */
    render: function(options) {
      var self = this;
      options = options || {};

      // Bounds-check the 'from' and 'to' parameters.
      var from =
        Math.max(0, Math.min(this.items.length - 1, options.from || 0));
      var to =
        Math.max(0, Math.min(this.items.length - 1,
          (options.to === 0) ? 0 : options.to || this.items.length - 1));
      if (to < from) {
        to = from;
      }

      // If we're rendering to the end of the grid, refresh the container height
      var setContainerHeight = false;
      if (to == this.items.length - 1) {
        setContainerHeight = true;
      }

      // Store the from and to indices as items, as removing placeholders/
      // cleaning will alter indexes.
      var fromItem = this.items[from];
      var toItem = this.items[to];

      this.removeAllPlaceholders();
      this.cleanItems();

      // Reset the to index until we find it again when iterating over items
      // below.
      to = this.items.length - 1;

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

      // Reset offset steps
      this.layout.offsetY = 0;

      // We have to iterate the whole list to make sure placeholders are
      // correctly setup.
      for (var idx = 0; idx < this.items.length; idx++) {
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

        if (item == fromItem) {
          from = idx;
        }
        if (item == toItem) {
          to = idx;
        }

        // There should always be a divider at the end, it's hidden in CSS when
        // not in edit mode.
        if ((idx == this.items.length - 1) && !options.skipDivider &&
            !(item instanceof GaiaGrid.Divider)) {
          this.items.push(new GaiaGrid.Divider());
        }

        // Check if the items is within the bounds we want to render. We
        // always re-render the last divider item as it's always recreated.
        // If fromItem is a placeholder, from will never be set, so check
        // for (idx == to) as well as checking the bounds.
        if (idx === to ||
            ((idx === this.items.length - 1) && !options.skipDivider) ||
            (idx >= from && idx <= to)) {
          item.render([x, y], idx);
        }

        // Increment the x-step by the sizing of the item.
        // If we go over the current boundary, reset it, and step the y-axis.
        x += item.gridWidth;
        if (x >= this.layout.cols) {
          step(item);
        }
      }

      this.element.setAttribute('cols', this.layout.cols);

      // Reset offsetY as stepYAxis changes it and it may be needed elsewhere.
      this.layout.offsetY = 0;

      // Recalculate visibility if necessary
      if (!this.visibilityCalculated) {
        this.calcVisibility();
      }
    }
  };

  exports.GridView = GridView;

}(window));
