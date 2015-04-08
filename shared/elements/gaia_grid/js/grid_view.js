'use strict';
/* global GridDragDrop */
/* global GaiaGrid */
/* global GridLayout */
/* global GridZoom */
/* global LazyLoader */

(function(exports) {

  /* The time for which we'll disable launching other icons after tapping on
   * an app icon. This will also disable edit mode.
   */
  const APP_LAUNCH_TIMEOUT = 3000;

  /**
   * GridView is a generic class to render and display a grid of items.
   * @param {Object} config Configuration object containing:
   *  - element: The shadow root of the grid
   */
  function GridView(config) {
    this.config = config;
    this.clickIcon = this.clickIcon.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onCollectionLaunch = this.onCollectionLaunch.bind(this);
    this.onCollectionClose = this.onCollectionClose.bind(this);

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
     * A collection is open
     */
    _collectionOpen: false,

    /**
     * Adds an item into the items array.
     * If the item is an icon, add it to icons.
     * @param {Object} item The grid object, should inherit from GridItem.
     * @param {Object} insertTo The position to insert the item into our list.
     * @param {Boolean} expandGroup Expand the group this item is will be in.
     */
    add: function(item, insertTo, expandGroup) {
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
        insertTo = this.items.length;
        this.items.push(item);
      }

      if (expandGroup) {
        for (var i = insertTo + 1, iLen = this.items.length;
             i < iLen; i++) {
          var divider = this.items[i];
          if (divider.detail.type === 'divider') {
            if (divider.detail.collapsed) {
              divider.expand();
            }
            break;
          }
        }
      }
    },

    /**
     * Finds nearest item by and returns an index, or null if an item isn't
     * found.
     * @param {Number} x relative to the screen
     * @param {Number} y relative to the screen
     * @param {Boolean} isRow whether the position is to be considered as a row
     * instead of an individual point.
     */
    getNearestItemIndex: function(x, y, isRow) {
      var foundIndex = null;
      var leastDistance = null;
      var itemMiddleOffset = this.layout.gridItemWidth / 2;
      for (var i = 0, iLen = this.items.length; i < iLen; i++) {
        var item = this.items[i];

        // Don't consider items that can't be dragged
        if (!item.isDraggable()) {
          continue;
        }

        // If sections are disabled, don't consider dividers
        if (this.config.features.disableSections &&
            item.detail.type === 'divider') {
          continue;
        }

        // Do not consider collapsed items, unless they are dividers.
        if (item.detail.type !== 'divider' &&
            item.element.classList.contains('collapsed')) {
          continue;
        }

        var middleX = item.x + itemMiddleOffset;
        var middleY = item.y + item.pixelHeight / 2;

        var xDistance = (isRow || item.detail.type === 'divider') ?
          0 : x - middleX;
        var yDistance = y - middleY;

        var distance = Math.sqrt(
          xDistance * xDistance +
          yDistance * yDistance);
        if (leastDistance === null || distance < leastDistance) {
          leastDistance = distance;
          foundIndex = i;
        }
      }
      return foundIndex;
    },

    start: function() {
      this.element.addEventListener('click', this.clickIcon);
      this.element.addEventListener('collection-launch',
                                    this.onCollectionLaunch);
      this.element.addEventListener('collection-close',
                                    this.onCollectionClose);
      window.addEventListener('visibilitychange', this.onVisibilityChange);
    },

    stop: function() {
      this.element.removeEventListener('click', this.clickIcon);
      this.element.removeEventListener('collection-launch',
                                       this.onCollectionLaunch);
      this.element.removeEventListener('collection-close',
                                       this.onCollectionClose);
      window.removeEventListener('visibilitychange', this.onVisibilityChange);
    },

    findItemFromElement: function(element, excludeCollapsedIcons) {
      while (element && element.parentNode !== this.element) {
        element = element.parentNode;
      }
      if (!element) {
        return null;
      }

      var i, iLen = this.items.length;
      var identifier = element.dataset.identifier;
      var icon = this.icons[identifier];

      // If the element didn't have an identifier, try to search for it
      // manually.
      if (!icon) {
        for (i = 0; i < iLen; i++) {
          if (this.items[i].element === element) {
            icon = this.items[i];
            break;
          }
        }
      }

      if (icon && excludeCollapsedIcons) {
        // If this is a collapsed item, return its group instead
        if (icon.detail.type !== 'divider' &&
            icon.detail.type !== 'placeholder' &&
            icon.element.classList.contains('collapsed')) {
          for (i = icon.detail.index + 1; i < iLen; i++) {
            if (this.items[i].detail.type === 'divider') {
              return this.items[i];
            }
          }

          console.warn('Collapsed icon found with no group');
          icon = null;
        }
      }

      return icon;
    },

    onVisibilityChange: function() {
      this._launchingApp = false;
    },

    onCollectionLaunch: function() {
      this._collectionOpen = true;
    },

    onCollectionClose: function() {
      this._collectionOpen = false;
    },

    /**
     * Launches an app.
     */
    clickIcon: function(e) {
      e.preventDefault();

      var inEditMode = this.dragdrop && this.dragdrop.inEditMode;

      var action = 'launch';
      if (e.target.classList.contains('remove')) {
        action = 'remove';
      }
      var icon = this.findItemFromElement(e.target);
      if (!icon) {
        return;
      }

      if (action === 'launch') {
        // We do not allow users to launch icons in edit mode
        if (inEditMode && e.target.classList.contains('icon')) {
          // Check if we're trying to edit a bookmark or collection
          if (!icon.isEditable()) {
            return;
          }
          action = 'edit';
        } else {
          // If the icon can't be launched, bail out early
          if (!icon[action]) {
            return;
          }

          // Add a 'launching' class to the icon to style it with CSS.
          icon.element.classList.add('launching');

          // XXX: We can't have nice things. Remove the launching class after an
          // arbitrary time to restore the state. We want the icon to return
          // to its original state after launching the app, but visibilitychange
          // will not work because activities do not fire it.
          var returnTimeout = 500;
          setTimeout(function stateReturn() {
            if (icon.element) {
              icon.element.classList.remove('launching');
            }
          }, returnTimeout);
        }
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
        }.bind(this), APP_LAUNCH_TIMEOUT);
      }

      icon[action](e.target);
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

      // If the last item is not a divider, add a new divider at the end.
      var lastItem = this.items[this.items.length - 1];
      if (!lastItem || !(lastItem instanceof GaiaGrid.Divider)) {
        this.items.push(new GaiaGrid.Divider());
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

          // If the previous item is a divider, or there is no previous item,
          // and we are in edit mode, we do not remove the placeholder.
          // This is so the section will remain even if the user drags the
          // icon around. Bug 1014982
          if ((!previousItem ||
               (previousItem && previousItem instanceof GaiaGrid.Divider)) &&
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
          item.lastX = null;
          item.lastY = null;
          item.lastScale = null;
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
     */
    createPlaceholders: function(coordinates, idx, count) {
      var isRTL = (document.documentElement.dir === 'rtl');
      for (var i = 0; i < count; i++) {
        var item = new GaiaGrid.Placeholder();
        this.items.splice(idx + i, 0, item);
        item.setPosition(idx + i);

        var xPosition = (coordinates[0] + i) * this.layout.gridItemWidth;
        if (isRTL) {
          xPosition =
            (this.layout.constraintSize - this.layout.gridItemWidth) -
            xPosition;
        }
        item.setCoordinates(xPosition, this.layout.offsetY);

        item.render();
      }
    },

    /**
     * Renders all icons.
     * Positions app icons and dividers accoriding to available space
     * on the grid.
     * @param {Object} options Options to render with including:
     *  - skipDivider {Boolean} Whether or not to skip the divider
     *  - rerender {Boolean} Whether we should clean elements and re-render.
     */
    render: function(options) {
      var self = this;
      options = options || {};

      this.removeAllPlaceholders();
      this.cleanItems(options.skipDivider);

      // Reset offset steps
      var oldHeight = this.layout.offsetY;
      this.layout.offsetY = 0;

      // Grid render coordinates
      var x = 0;
      var y = 0;

      /**
       * Steps the y-axis.
       * @param {Object} item
       */
      function step(item) {
        var pixelHeight = item.pixelHeight;
        self.layout.stepYAxis(pixelHeight);

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

      var nextDivider = null;
      var oddDivider = true;
      var isRTL = (document.documentElement.dir === 'rtl');
      for (var idx = 0; idx <= this.items.length - 1; idx++) {
        var item = this.items[idx];

        // Remove the element if we are re-rendering.
        if (options.rerender && item.element) {
          this.element.removeChild(item.element);
          item.element = null;
        }

        if (item.detail.type === 'divider') {
          nextDivider = null;
        } else {
          if (!nextDivider) {
            for (var i = idx + 1; i < this.items.length; i++) {
              if (this.items[i].detail.type === 'divider') {
                nextDivider = this.items[i];
                oddDivider = !oddDivider;
                break;
              }
            }

            // Make sure to leave room for group headers
            if (nextDivider &&
                !nextDivider.detail.collapsed) {
              this.layout.offsetY += nextDivider.headerHeight;
            }
          }

          // If this item is in a collapsed group, we need to skip rendering.
          if (nextDivider && nextDivider.detail.collapsed) {
            item.setPosition(idx);
            continue;
          }
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
          item = this.items[idx];

          // Step the y-axis by the size of the last row.
          // For now we just check the height of the last item.
          var lastItemInRow = this.items[idx - 1];
          step(lastItemInRow);
        }

        item.setPosition(idx);

        if (!options.skipItems) {
          item.hasCachedIcon && ++pendingCachedIcons;
          var xPosition = x * this.layout.gridItemWidth;
          if (isRTL) {
            xPosition =
              (this.layout.constraintSize - this.layout.gridItemWidth) -
              xPosition;
          }
          item.setCoordinates(xPosition, this.layout.offsetY);
          if (!item.active) {
            item.render();
          }

          if (item.detail.type === 'divider') {
            if (oddDivider) {
              item.element.classList.add('odd');
            } else {
              item.element.classList.remove('odd');
            }
          }
        }

        // Increment the x-step by the sizing of the item.
        // If we go over the current boundary, reset it, and step the y-axis.
        x += item.gridWidth;
        if (x >= this.layout.cols) {
          step(item);
        }
      }

      // All the children of this element are absolutely positioned and then
      // transformed, so the grid actually has no height. Fire an event that
      // embedders can listen to discover the grid height.
      if (this.layout.offsetY != oldHeight) {
        if (this.dragdrop && this.dragdrop.inDragAction) {
          // Delay size changes during drags to avoid jankiness when dragging
          // items around due to touch positions changing.
          this.layout.offsetY = oldHeight;
        } else {
          this.element.dispatchEvent(new CustomEvent('gaiagrid-resize',
                                       { detail: this.layout.offsetY }));
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
