'use strict';
/* global GridDragDrop */
/* global GaiaGrid */
/* global GridLayout */
/* global GridZoom */
/* global LazyLoader */
/* global performance */

(function(exports) {

  // This constant is the delay between the last scroll event and the moment we
  // listen to touchstart events again.
  const PREVENT_TAP_TIMEOUT = 300;

  // If the delta move from touchstart to touchend is greater than this, we'll
  // ignore the touchend event to launch an app.
  // "20" comes from Gecko, and we also try to have a greater value for devices
  // with more pixels.
  var SCROLL_THRESHOLD = 20 * window.devicePixelRatio;

  /**
   * GridView is a generic class to render and display a grid of items.
   * @param {Object} config Configuration object containing:
   *  - element: The shadow root of the grid
   */
  function GridView(config) {
    this.config = config;
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.lastScrollTime = 0;

    if (config.features.zoom) {
      this.zoom = new GridZoom(this);
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
     * We are in the state of launching an app.
     */
    _launchingApp: false,

    /**
     * Adds an item into the items array.
     * If the item is an icon, add it to icons.
     * @param {Object} item The grid object, should inherit from GridItem.
     * @param {Object} insertTo The position to insert the item into our list.
     */
    add: function(item, insertTo) {
      if (!item) {
        return;
      }

      if (item.identifier) {
        // If we already have an item with this identifier, exit.
        // This avoids a potential race condition where we might have duplicate
        // items with the same identifiers in the grid. This should not happen.
        if (this.icons[item.identifier]) {
          console.log('Error, duplicate identifier: ',
            item.identifier, new Error().stack);
          return;
        }

        this.icons[item.identifier] = item;
      } else if (item.detail.type !== 'divider' &&
        item.detail.type !== 'placeholder') {
        // If the item does not have an identifier, and is not a placeholder
        // or divider, do not add it to the grid.
        console.log('Error, could not load identifier for object: ',
            JSON.stringify(item.detail));
        return;
      }

      // If insertTo it is a number, splice.
      if (!isNaN(parseFloat(insertTo)) && isFinite(insertTo)) {
        this.items.splice(insertTo, 0, item);
      } else {
        this.items.push(item);
      }
    },

    /**
     * Finds nearest item by and returns an index.
     * @param {Number} x relative to the screen
     * @param {Number} y relative to the screen
     */
    getNearestItemIndex: function(x, y) {
      var leastDistance;
      var foundIndex;
      for (var i = 0, iLen = this.items.length; i < iLen; i++) {
        var item = this.items[i];

        // Do not consider dividers for dragdrop.
        if (!item.isDraggable()) {
          continue;
        }

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

    start: function() {
      this.element.addEventListener('touchstart', this.onTouchStart);
      this.element.addEventListener('touchend', this.onTouchEnd);
      this.element.addEventListener('contextmenu', this.onContextMenu);
      window.addEventListener('scroll', this.onScroll, true);
      window.addEventListener('visibilitychange', this.onVisibilityChange);
      this.lastTouchStart = null;
    },

    stop: function() {
      this.element.removeEventListener('touchstart', this.onTouchStart);
      this.element.removeEventListener('touchend', this.onTouchEnd);
      this.element.removeEventListener('contextmenu', this.onContextMenu);
      window.removeEventListener('scroll', this.onScroll, true);
      window.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.lastTouchStart = null;
    },

    onContextMenu: function(e) {
      setTimeout(function() {
        if (e.defaultPrevented) {
          this.lastTouchStart = null;
        }
      }.bind(this));
    },

    // bug 1015000
    onScroll: function() {
      this.lastScrollTime = performance.now();
    },

    onTouchStart: function(e) {
      // we track the last touchstart
      this.lastTouchStart = e.changedTouches[0];
    },

    // click = last touchstart, then touchend for same finger happening not too
    // far
    // Gecko does that automatically but since we want to use touch events for
    // more responsiveness, we also need to replicate that behavior.
    onTouchEnd: function(e) {
      var lastScrollTime = this.lastScrollTime;
      this.lastScrollTime = 0;
      var diff = performance.now() - lastScrollTime;
      if (diff > 0 && diff < PREVENT_TAP_TIMEOUT) {
        return;
      }

      var lastTouchStart = this.lastTouchStart;

      if (!lastTouchStart) {
        // This variable is deleted once a contextmenu event is received
        return;
      }

      var touch = e.changedTouches.identifiedTouch(lastTouchStart.identifier);
      if (!touch) {
        return;
      }

      var deltaX = lastTouchStart.clientX - touch.clientX;
      var deltaY = lastTouchStart.clientY - touch.clientY;

      this.lastTouchStart = null;

      var move = Math.hypot(deltaX, deltaY);
      if (move < SCROLL_THRESHOLD) {
        this.clickIcon(e);
      }
    },

    onVisibilityChange: function() {
      this._launchingApp = false;
    },

    /**
     * Launches an app.
     */
    clickIcon: function(e) {
      e.preventDefault();

      var container = e.target;
      var action = 'launch';

      if (e.target.classList.contains('remove')) {
        container = e.target.parentNode;
        action = 'remove';
      }
      var identifier = container.dataset.identifier;
      var icon = this.icons[identifier];
      var inEditMode = this.dragdrop && this.dragdrop.inEditMode;

      if (!icon) {
        if (e.target.classList.contains('placeholder') && inEditMode) {
          // Exit from edit mode when user clicks an empty space
          window.dispatchEvent(new CustomEvent('hashchange'));
        }
        return;
      }

      // We do not allow users to launch icons in edit mode
      if (action === 'launch' && inEditMode) {
        if (!icon.isEditable()) {
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
          if (icon.element) {
            icon.element.classList.remove('launching');
          }
        }, returnTimeout);
      }

      if ((icon.detail.type === 'app' || icon.detail.type === 'bookmark') &&
          this._launchingApp) {
        return;
      }
      if ((icon.detail.type === 'app' && icon.appState === 'ready') ||
          icon.detail.type === 'bookmark') {
        this._launchingApp = true;
        if (this._launchingTimeout) {
          window.clearTimeout(this._launchingTimeout);
          this._launchingTimeout = null;
        }
        // This avoids some edge cases if we didn't get visibilitychange anyway.
        this._launchingTimeout = window.setTimeout(function() {
          this._launchingTimeout = null;
          this._launchingApp = false;
        }.bind(this), 3000);
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
        if (item instanceof GaiaGrid.Divider) {
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
      if (!(lastItem instanceof GaiaGrid.Divider)) {
        this.items.push(new GaiaGrid.Divider());
      }

      // In dragdrop also append a row of placeholders.
      // These placeholders are used for drop detection as we ignore dividers
      // and will create a new group when an icon is dropped on them.
      if (this.dragdrop && this.dragdrop.inEditMode) {
        var coords = [0, lastItem.y + 2];
        this.createPlaceholders(coords, this.items.length, this.layout.cols,
          true);
      }
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
     * Clears the grid view of all items.
     */
    clear: function() {
      for (var i = 0, iLen = this.items.length; i < iLen; i++) {
        var item = this.items[i];
        if (item.element) {
          this.element.removeChild(item.element);

          // We must de-reference element explicitly so we can re-use item
          // objects the next time we call render.
          item.element = null;
        }
      }
      this.items = [];
      this.icons = {};
    },

    /**
     * Creates placeholders and injects them into the grid.
     * @param {Array} coordinates [x,y] coordinates on the grid of the first
     * item in grid units.
     * @param {Integer} idx The position of the first placeholder.
     * @param {Integer} idx The number of placeholders to create.
     * @param {Boolean} createsGroup Creates a group on drop during edit mode.
     */
    createPlaceholders: function(coordinates, idx, count, createsGroup) {
      for (var i = 0; i < count; i++) {
        var itemCoords = [
          coordinates[0] + i,
          coordinates[1]
        ];

        var item = new GaiaGrid.Placeholder();
        item.createsGroupOnDrop = createsGroup;
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
     *  - skipDivider {Boolean} Whether or not to skip the divider
     *  - rerender {Boolean} Whether we should clean elements and re-render.
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

      var pendingCachedIcons = 0;
      var onCachedIconRendered = () => {
        if (--pendingCachedIcons <= 0) {
          this.element.removeEventListener('cached-icon-rendered',
                                            onCachedIconRendered);
          this.element.dispatchEvent(new CustomEvent('cached-icons-rendered'));
        }
      };
      this.element.addEventListener('cached-icon-rendered',
                                     onCachedIconRendered);

      for (var idx = 0; idx <= to; idx++) {
        var item = this.items[idx];

        // Remove the element if we are re-rendering.
        if (options.rerender && item.element) {
          this.element.removeChild(item.element);
          item.element = null;
        }

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
          item.hasCachedIcon && ++pendingCachedIcons;
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
      pendingCachedIcons === 0 && onCachedIconRendered();
      this.loadDragDrop();
    },

    /**
     * Loads dragdrop libraries and instantiates if necessary.
     * DragDrop libraries are lazy laoded to save on startup time. They are
     * loaded after the initial paint in order to paint the icons as fast
     * as possible.
     */
    loadDragDrop: function() {
      if (!this.dragdrop && this.config.features.dragdrop) {
        LazyLoader.load('shared/elements/gaia_grid/js/grid_dragdrop.js', () => {
          if (this.dragdrop) {
            return;
          }
          this.dragdrop = new GridDragDrop(this);
        });
      }
    }
  };

  exports.GridView = GridView;

}(window));
