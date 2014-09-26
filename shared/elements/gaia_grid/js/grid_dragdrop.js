'use strict';
/* global GaiaGrid */

(function(exports) {

  const ACTIVE_SCALE = 1.4;

  const COLLECTION_DROP_SCALE = 0.5;

  /* This delay is the time passed once users stop the finger over an icon and
   * the rearrange is performed */
  const REARRANGE_DELAY = 30;

  /* The page is scrolled via javascript if an icon is being moved, and is
   * within a length of a page edge configured by this value */
  const EDGE_PAGE_THRESHOLD = 50;

  /* This delay is the time to wait before rearranging a collection. */
  const REARRANGE_COLLECTION_DELAY = 500;

  const SCREEN_HEIGHT = window.innerHeight;

  const scrollStep = Math.round(SCREEN_HEIGHT / EDGE_PAGE_THRESHOLD);

  /* The scroll step will be 5 times bigger over the edge */
  const maxScrollStepFactor = 5;

  function DragDrop(gridView) {
    this.gridView = gridView;
    this.container = gridView.element;
    this.scrollable = document.documentElement;
    this.container.addEventListener('touchstart', this);
    this.container.addEventListener('contextmenu', this);
  }

  DragDrop.prototype = {

    /**
     * The current touchmove target.
     * @type {DomElement}
     */
    target: null,

    /**
     * If we have moved an icon, this indicates that we need to save the state
     * @type {boolean}
     */
    dirty: false,

    /**
     * Whether or not we are in edit mode.
     * @type {boolean}
     */
    inEditMode: false,

    /**
     * The item being hovered over.
     * @type {GaiaGrid.GridItem}
     */
    hoverItem: null,

    /**
     * A port for IAC to the collections app.
     */
    collectionsPort: null,

    /*
     * An element that's aligned to the top of the grid and should be
     * considered as obscuring the grid when in edit mode.
     */
    editHeaderElement: null,

    /**
     * Returns the maximum active scale value.
     */
    get activeScale() {
      return ACTIVE_SCALE;
    },

    /**
     * Returns true if we are currently dragging an icon.
     */
    get inDragAction() {
      return this.target && this.target.classList.contains('active');
    },

    /**
     * Begins the drag/drop interaction.
     * Enlarges the icon.
     * Sets additional data to make the touchmove handler faster.
     */
    begin: function(e) {
      // Stop icon launching while we are in active state
      this.gridView.stop();
      window.dispatchEvent(new CustomEvent('gaiagrid-dragdrop-begin'));

      this.hoverItem = null;
      this.rearrangeDelay = null;
      this.enterEditMode();
      this.container.classList.add('dragging');
      this.icon.scale = ACTIVE_SCALE;
      this.icon.setActive(true);

      this.xAdjust = e.pageX - this.icon.x;
      this.yAdjust = e.pageY - this.icon.y;

      var items = this.gridView.items;
      var lastElement = items[items.length - 1];
      this.maxScroll = lastElement.y + lastElement.pixelHeight +
                       (this.icon.pixelHeight * ACTIVE_SCALE);

      // Redraw the icon at the new position and scale
      this.positionIcon(e.pageX, e.pageY);
    },

    finish: function(e) {
      // Remove the dragging property after the icon has transitioned into
      // place to avoid jank due to animations starting that are disabled
      // when dragging.
      this.icon.element.addEventListener('transitionend', this);
      this.currentTouch = null;

      if (this.rearrangeDelay !== null) {
        clearTimeout(this.rearrangeDelay);
        if (this.hoverItem && this.hoverItem.detail.type === 'collection') {
          // The user has dropped into a collection
          window.dispatchEvent(new CustomEvent(
            'gaiagrid-add-to-collection',
            { detail: {
              'collectionId': this.hoverItem.detail.id,
              'identifier': this.icon.identifier
            }
          }));

          // Animate two icons, the original one in its original position,
          // scaling up, and a second copy from the dropped position
          // scaling down into the collection.

          // When we set the position, we need to compensate for the transform
          // center being at the top-left.
          var scale = this.gridView.layout.percent * COLLECTION_DROP_SCALE;
          var scaleAdjustX =
            ((this.gridView.layout.gridItemWidth * this.icon.scale) -
             (this.gridView.layout.gridItemWidth * scale)) / 2;
          var scaleAdjustY =
            ((this.gridView.layout.gridItemHeight * this.icon.scale) -
             (this.gridView.layout.gridItemHeight * scale)) / 2;

          // Create the clone icon that we'll animate dropping into the
          // collection
          var clone = this.icon.element.cloneNode(true);
          clone.classList.add('dropped');
          this.icon.element.parentNode.appendChild(clone);

          // Force a reflow on the clone so that the following property changes
          // cause transitions.
          clone.clientWidth;

          var destroyOnTransitionEnd = function() {
            this.parentNode.removeChild(this);
            this.removeEventListener('transitionend', destroyOnTransitionEnd);
          }.bind(clone);
          clone.addEventListener('transitionend', destroyOnTransitionEnd);

          clone.style.opacity = 0;
          this.icon.transform(
            this.hoverItem.x + scaleAdjustX,
            this.hoverItem.y + scaleAdjustY,
            scale,
            clone);

          // Now animate the original icon back into its original position.
          this.icon.transform(this.icon.x + scaleAdjustX,
                              this.icon.y + scaleAdjustY,
                              scale);

          // Force a reflow on this icon, otherwise when we remove the active
          // class, it will transition from its original position instead of
          // this new position.
          this.icon.element.clientWidth;
        } else {
          this.doRearrange.call(this);
        }
      }

      // Hand back responsibility to Grid view to render the dragged item.
      this.icon.scale = 1;
      this.icon.setActive(false);

      this.gridView.render();

      // Save icon state if we need to
      if (this.dirty) {
        window.dispatchEvent(new CustomEvent('gaiagrid-saveitems'));
      }

      this.target = null;
      this.dirty = false;

      setTimeout(function nextTick() {
        this.gridView.start();
        window.dispatchEvent(new CustomEvent('gaiagrid-dragdrop-finish'));
      }.bind(this));
    },

    finalize: function() {
      this.container.classList.remove('dragging');
      if (this.icon) {
        this.icon.element.removeEventListener('transitionend', this);
        this.icon = null;
      }
      if (this.hoverItem) {
        this.hoverItem.element.classList.remove('hovered');
        this.hoverItem = null;
      }
    },

    /**
     * The closer to edge the faster (bigger step).
     ** Distance 0px -> 5 times faster
     ** Distance 25px -> 2.5 times faster
     ** Distance 50px (EDGE_PAGE_THRESHOLD) -> 0 times
     */
    getScrollStep: function(distanceToEdge) {
      var factor = maxScrollStepFactor;

      if (distanceToEdge > 0) {
        factor *= ((EDGE_PAGE_THRESHOLD - distanceToEdge) /
                   EDGE_PAGE_THRESHOLD);
      }

      return Math.round(scrollStep * factor);
    },

    /**
     * Scrolls the page if needed.
     * The page is scrolled via javascript if an icon is being moved,
     * and is within a percentage of a page edge.
     * @param {Object} e A touch object from a touchmove event.
     */
    scrollIfNeeded: function() {
      var touch = this.currentTouch;
      if (!touch) {
        this.isScrolling = false;
        return;
      }

      function doScroll(amount) {
        /* jshint validthis:true */
        this.isScrolling = true;
        this.scrollable.scrollTop += amount;
        exports.requestAnimationFrame(this.scrollIfNeeded.bind(this));
        touch.pageY += amount;
        this.positionIcon(touch.pageX, touch.pageY);
      }

      var scrollStep;
      var docScroll = this.scrollable.scrollTop;
      var distanceFromTop = Math.abs(touch.pageY - docScroll);
      var distanceFromHeader = distanceFromTop -
        (this.editHeaderElement ? this.editHeaderElement.clientHeight : 0);
      if (distanceFromTop > SCREEN_HEIGHT - EDGE_PAGE_THRESHOLD) {
        var maxY = this.maxScroll;
        scrollStep = this.getScrollStep(SCREEN_HEIGHT - distanceFromTop);
        // We cannot exceed the maximum scroll value
        if (touch.pageY >= maxY || maxY - touch.pageY < scrollStep) {
          this.isScrolling = false;
          return;
        }

        doScroll.call(this, scrollStep);
      } else if (touch.pageY > 0 && distanceFromHeader < EDGE_PAGE_THRESHOLD) {
        // We cannot go below the minimum scroll value
        scrollStep = this.getScrollStep(distanceFromHeader);
        scrollStep = Math.min(scrollStep, this.scrollable.scrollTop);
        if (scrollStep <= 0) {
          this.isScrolling = false;
          return;
        }

        doScroll.call(this, -scrollStep);
      } else {
        this.isScrolling = false;
      }
    },

    /**
     * Positions an icon on the grid.
     * @param {Integer} pageX The X coordinate of the touch.
     * @param {Integer} pageY The Y coordinate of the touch.
     */
    positionIcon: function(pageX, pageY) {
      var iconIsDivider = this.icon.detail.type === 'divider';

      pageX = pageX - this.xAdjust;
      pageY = pageY - this.yAdjust;

      var oldX = this.icon.x;
      var oldY = this.icon.y;
      // Adjust new icon coordinates for the slightly inflated scale so that
      // it appears centered around the touch point.
      var newX = pageX;
      var newY = pageY;
      if (!iconIsDivider) {
        newX = pageX - ((this.icon.scale * this.gridView.layout.gridItemWidth) -
                        this.gridView.layout.gridItemWidth) / 2;
        newY = pageY - ((this.icon.scale * this.icon.pixelHeight) -
                        this.icon.pixelHeight) / 2;
      }
      this.icon.setCoordinates(newX, newY);
      this.icon.render();
      this.icon.setCoordinates(oldX, oldY);

      // If we're a divider being dragged, manually check if the y-coordinate
      // has strayed far enough from the center of the row to initiate a
      // movement.
      if (iconIsDivider) {
        if (Math.abs(pageY - this.icon.y) <=
            this.gridView.layout.gridItemHeight / 2) {
          return;
        }
      }

      // Reposition in the icons array if necessary.
      // Find the icon with the closest X/Y position of the move,
      // and insert ours before it.
      pageX += this.gridView.layout.gridItemWidth / 2;
      pageY += this.icon.pixelHeight / 2;
      var foundIndex =
        this.gridView.getNearestItemIndex(pageX, pageY, iconIsDivider);
      if (foundIndex === null) {
        return;
      }
      var foundItem = this.gridView.items[foundIndex];

      // Clear the rearrange delay and hover item if we aren't hovering over
      // anything.
      if (this.rearrangeDelay) {
        clearTimeout(this.rearrangeDelay);
        this.rearrangeDelay = null;
      }
      if (this.hoverItem) {
        this.hoverItem.element.classList.remove('hovered');
        this.hoverItem = null;
      }

      if (foundIndex !== this.icon.detail.index) {
        // Collections and groups should not trigger a hover
        if (this.icon.detail.type !== 'collection' && !iconIsDivider) {
          this.hoverItem = foundItem;
          this.hoverItem.element.classList.add('hovered');
        }
        // Add another divider when hovering over a divider
        if (!iconIsDivider && foundItem.detail.type === 'divider') {
          this.doRearrange = this.createNewDivider.bind(this, foundItem);
        } else {
          this.doRearrange = this.rearrange.bind(this, foundItem);
        }
        this.rearrangeDelay =
          setTimeout(this.doRearrange.bind(this),
            this.hoverItem && this.hoverItem.detail.type === 'collection' ?
              REARRANGE_COLLECTION_DELAY : REARRANGE_DELAY);
      }
    },

    /**
     * Returns the number of items between the given index and the divider
     * before it that aren't placeholders and aren't active.
     */
    countItemsBeforeIndex: function(index) {
      var size = 0;
      for (var i = index - 1, items = this.gridView.items;
           i >= 0 && items[i].detail.type !== 'divider'; i--) {
        if (items[i].detail.type !== 'placeholder' && !items[i].active) {
          size++;
        }
      }
      return size;
    },

    /**
     * Creates a new divider in GridView.items and rearranges the currently
     * dragged icon into the newly created section.
     * @param {Object} tDivider The divider after which to place a new divider
     */
    createNewDivider: function(tDivider) {
      var items = this.gridView.items;
      var tIndex = items.indexOf(tDivider);

      // Only create a new divider if the divider doesn't end an empty section
      // and the next divider doesn't end an empty section. We don't count the
      // active icon to avoid creating infinite groups.
      if (this.countItemsBeforeIndex(tIndex) === 0) {
        return;
      }
      for (var nIndex = tIndex + 1, len = items.length;
           nIndex < len; nIndex++) {
        if (items[nIndex].detail.type === 'divider') {
          if (this.countItemsBeforeIndex(nIndex) === 0) {
            return;
          }
          break;
        }
      }

      // Create the new divider
      var newDivider = new GaiaGrid.Divider();
      items.splice(tIndex + 1, 0, newDivider);

      // Place the dragged item into the new empty section
      var sIndex = items.indexOf(this.icon);
      this.rearrange(sIndex > tIndex ? newDivider : tDivider);
    },

    /**
     * Rearranges items in GridView.items
     * @param {Object} tItem The item to position the dragged icon at.
     */
    rearrange: function(tItem) {

      // We get a reference to the position of this.icon within the items
      // array. Because placeholders are shifting around while we are dragging,
      // we can't trust the detail.index attribute. This will be fixed on every
      // render call though.
      var sIndex = this.gridView.items.indexOf(this.icon);
      var tIndex = this.gridView.items.indexOf(tItem);

      // Check how many items we need to rearrange (if it's a group, there will
      // be multiple items.
      var eIndex = sIndex;
      if (this.icon.detail.type === 'divider') {
        for (; sIndex > 0 &&
               this.gridView.items[sIndex - 1].detail.type !== 'divider';
             sIndex--) {}

        // Modify the tIndex to make sure we're inserting immediately after
        // another divider or at the start of the container.
        var gridLength = this.gridView.items.length;
        if (tIndex !== 0 && tIndex !== gridLength - 1) {
          if (tIndex > sIndex) {
            for (; tIndex < gridLength - 1 &&
                 this.gridView.items[tIndex - 1].detail.type !== 'divider';
                 tIndex++) {}
          } else {
            for (; tIndex > 0 &&
                 this.gridView.items[tIndex - 1].detail.type !== 'divider';
                 tIndex--) {}
          }

          // Don't allow the user to rearrange with a divider unless it's
          // visible.
          var otherDivider = this.gridView.items[tIndex];
          if ((otherDivider.y < this.scrollable.scrollTop) ||
              (otherDivider.y + otherDivider.pixelHeight >
               this.scrollable.scrollTop + this.scrollable.clientHeight)) {
            return;
          }
        }

        if (sIndex === tIndex) {
          // Nothing to do.
          return;
        }
      } else if (sIndex < tIndex) {
        tIndex++;
      }

      // We may have changed tIndex, so refresh our item pointer
      tItem = this.gridView.items[tIndex];

      // Remove the items from the array
      var lastItemOffset = eIndex - sIndex;
      var toInsert = this.gridView.items.splice(sIndex, lastItemOffset + 1);

      // Craft the parameter list to reinsert the items at the correct place
      toInsert.unshift(this.gridView.items.indexOf(tItem), 0);

      // Reinsert items
      this.rearrangeDelay = null;
      this.dirty = true;
      this.gridView.items.splice.apply(this.gridView.items, toInsert);

      this.gridView.render();
    },

    enterEditMode: function() {
      this.inEditMode = true;
      this.container.classList.add('edit-mode');
      document.body.classList.add('edit-mode');
      this.gridView.element.dispatchEvent(
        new CustomEvent('editmode-start'));
      document.addEventListener('visibilitychange', this);
      this.gridView.render();
    },

    exitEditMode: function() {
      // If we're in the middle of a drag, cancel it.
      if (this.icon) {
        this.finish();
        this.finalize();
      }

      this.inEditMode = false;
      this.container.classList.remove('edit-mode');
      document.body.classList.remove('edit-mode');
      this.gridView.element.dispatchEvent(new CustomEvent('editmode-end'));
      document.removeEventListener('visibilitychange', this);
      this.removeDragHandlers();
      this.gridView.render();
    },

    removeDragHandlers: function() {
      this.container.removeEventListener('touchmove', this);
      this.container.removeEventListener('touchend', this);
      window.removeEventListener('touchcancel', this);
    },

    addDragHandlers: function() {
      this.container.addEventListener('touchmove', this);
      this.container.addEventListener('touchend', this);
      window.addEventListener('touchcancel', this);
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
          case 'visibilitychange':
            if (document.hidden) {
              this.exitEditMode();
            }
            break;

          case 'touchstart':
            this.canceled = e.touches.length > 1;
            break;

          case 'contextmenu':
            if (this.icon || this.canceled) {
              return;
            }

            if (e.defaultPrevented) {
              // other handlers already handled this.
              // in the future, we should use the shadow root and dispatch a
              // "contextmenu" event from here instead.
              return;
            }

            this.target = e.target;

            if (!this.target) {
              return;
            }

            this.icon = this.gridView.findItemFromElement(this.target);

            if (!this.icon || !this.icon.isDraggable() ||
                this.icon.detail.type === 'placeholder') {
              this.icon = null;
              return;
            }

            this.addDragHandlers();

            e.preventDefault();

            this.begin(e);

            break;

          case 'touchmove':
            var touch = e.touches[0];

            this.positionIcon(touch.pageX, touch.pageY);

            this.currentTouch = {
              pageX: touch.pageX,
              pageY: touch.pageY
            };

            if (!this.isScrolling) {
              this.scrollIfNeeded();
            }

            break;

          case 'touchcancel':
            this.removeDragHandlers();
            this.finish();
            this.finalize();
            break;
          case 'touchend':
            // Ensure the app is not launched
            e.stopImmediatePropagation();
            e.preventDefault();
            this.removeDragHandlers();
            this.finish(e);
            break;

          case 'transitionend':
            this.finalize();
            break;
        }
    }
  };

  exports.GridDragDrop = DragDrop;

}(window));
