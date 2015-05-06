'use strict';
/* global devicePixelRatio */
/* global GaiaGrid */

(function(exports) {

  const ACTIVE_SCALE = 1.4;

  const COLLECTION_DROP_SCALE = 0.5;

  /* This is an alternative delay used to initiate icon movement when in edit
   * mode. The normal contextmenu delay is too long once we're in edit mode
   * and causes user confusion, but a short delay globally would cause too many
   * accidental triggers of edit mode.
   */
  const EDIT_LONG_PRESS_DELAY = 200;

  /* The movement threshold to use for the above synthetic long-press. */
  const EDIT_LONG_PRESS_THRESHOLD = 4 * devicePixelRatio;

  /* This delay is the time passed once users stop the finger over an icon and
   * the rearrange is performed */
  const REARRANGE_DELAY = 30;

  /* The page is scrolled via javascript if an icon is being moved, and is
   * within a length of a page edge configured by this value */
  const EDGE_PAGE_THRESHOLD = 50;

  /* This delay is the time to wait before rearranging a collection. */
  const REARRANGE_COLLECTION_DELAY = 500;

  /* This is the delay before calling finish when handling touchend. */
  const TOUCH_END_FINISH_DELAY = 20;

  /* The maximum frequency with which the grid will be rearranged in response
   * to the item position changing, in ms.
   */
  const REARRANGE_FREQUENCY = 100;

  /* The amount of cool-down time after a rearrange animation. To avoid
   * rearranging too frequently and causing jank and user confusion.
   */
  const REARRANGE_COOLDOWN = 750;

  const SCREEN_HEIGHT = window.innerHeight;

  const scrollStep = Math.round(SCREEN_HEIGHT / EDGE_PAGE_THRESHOLD);

  /* The scroll step will be 5 times bigger over the edge */
  const maxScrollStepFactor = 5;

  function DragDrop(gridView) {
    this.gridView = gridView;
    this.container = gridView.element;
    this.scrollable = document.documentElement;
    this.container.addEventListener('touchstart', this);
    this.container.addEventListener('touchmove', this);
    this.container.addEventListener('touchend', this);
    window.addEventListener('touchcancel', this);
    this.container.addEventListener('click', this);
    this.container.addEventListener('contextmenu', this);
  }

  DragDrop.prototype = {

    /**
     * The current touchmove target.
     * @type {DomElement}
     */
    target: null,

    /**
     * The edit-mode long-press timeout
     */
    longPressTimeout: null,

    /**
     * The position of the first touchstart of the current event block
     */
    touchStart: { x: 0, y: 0, screenX: 0, screenY: 0 },

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
     * The group being hovered over.
     * @type {GaiaGrid.Group}
     */
    hoverGroup: null,

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
     * The timeout used to rearrange the grid during dragging.
     */
    rearrangeGridTimeout: null,

    /**
     * The time of the last reposition call.
     */
    lastRepositionTime: 0,

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
     * Returns the delay before calling finish in response to a touch-end event.
     */
    get touchEndFinishDelay() {
      return TOUCH_END_FINISH_DELAY;
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
      this.doRearrange = null;
      this.enterEditMode();
      this.container.classList.add('dragging');
      this.icon.scale = ACTIVE_SCALE;
      this.icon.setActive(true);
      this.container.parentNode.style.overflow = 'hidden';

      // Work around e.pageX/e.pageY being null (to make it easier to work with
      // injected events, or old versions of Marionette)
      this.initialPageX = (typeof e.pageX === 'undefined') ?
        this.icon.x : e.pageX;
      this.initialPageY = (typeof e.pageY === 'undefined') ?
        this.icon.y : e.pageY;
      this.currentTouch = {
          pageX: this.initialPageX,
          pageY: this.initialPageY
      };

      var items = this.gridView.items;
      var lastElement = items[items.length - 1];
      this.maxScroll = lastElement.y + lastElement.pixelHeight +
                       (this.icon.pixelHeight * ACTIVE_SCALE);

      // If this is a group, or the sole icon in a group, make sure the
      // surrounding groups are marked as invalid-drop so you can't initiate a
      // move that would have no result.
      var itemIndex = this.icon.detail.index;
      if (this.icon.detail.type === 'divider') {
        this.icon.element.classList.add('invalid-drop');
        if (itemIndex > 0) {
          for (var i = itemIndex - 1; i >= 0; i--) {
            var item = items[i];
            if (item.detail.type === 'divider') {
              item.element.classList.add('invalid-drop');
              break;
            }
          }
        }
      } else {
        var itemBefore = itemIndex ? items[itemIndex - 1] : null;
        var itemAfter = items[itemIndex + 1];

        if ((itemAfter.detail.type === 'placeholder' ||
             itemAfter.detail.type === 'divider') &&
            (!itemBefore || itemBefore.detail.type === 'divider')) {
          if (itemBefore) {
            itemBefore.element.classList.add('invalid-drop');
          }
          var group, groupIndex = itemIndex;
          do {
            group = items[++groupIndex];
          } while (group.detail.type !== 'divider');
          group.element.classList.add('invalid-drop');
        }
      }

      // Redraw the icon at the new position and scale
      this.updateIconPosition();

      // Rearrange grid to highlight the group underneath the icon
      this.rearrangeGrid();
    },

    finish: function() {
      // Complete the repositioning timeout
      if (this.rearrangeGridTimeout !== null) {
        this.rearrangeGrid();
      }

      // Remove the dragging property after the icon has transitioned into
      // place to avoid jank due to animations starting that are disabled
      // when dragging.
      this.icon.element.addEventListener('transitionend', this);
      this.currentTouch = null;

      if (this.doRearrange !== null) {
        if (this.rearrangeDelay) {
          clearTimeout(this.rearrangeDelay);
        }
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
      } else {
        this.icon.requestAttention();
      }

      // Hand back responsibility to Grid view to render the dragged item.
      this.icon.scale = 1;
      this.icon.setActive(false);
      this.icon.element.classList.remove('hovering');
      this.target = null;

      this.gridView.render();

      // Save icon state if we need to
      if (this.dirty) {
        window.dispatchEvent(new CustomEvent('gaiagrid-saveitems'));
      }
      this.dirty = false;

      setTimeout(function nextTick() {
        this.gridView.start();
        window.dispatchEvent(new CustomEvent('gaiagrid-dragdrop-finish'));
      }.bind(this));
    },

    finalize: function() {
      this.container.parentNode.style.overflow = '';
      this.container.classList.remove('dragging');
      this.container.classList.remove('hover-over-top');
      if (this.icon) {
        this.icon.element.removeEventListener('transitionend', this);
        this.icon = null;
      }
      if (this.hoverItem) {
        this.hoverItem.element.classList.remove('hovered');
        this.hoverItem = null;
      }
      if (this.hoverGroup) {
        this.hoverGroup.element.classList.remove('drop-target');
        this.hoverGroup = null;
      }
      for (var i = 0, iLen = this.gridView.items.length;
           i < iLen; i++) {
        var item = this.gridView.items[i];
        item.element.classList.remove('invalid-drop');
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
     * Positions the dragged icon, rearranges the grid and scrolls the page if
     * needed.
     * The page is scrolled via javascript if an icon is being moved,
     * and is within a percentage of a page edge.
     */
    positionAndScrollIfNeeded: function() {
      var touch = this.currentTouch;
      if (!touch || !this.inDragAction) {
        this.isScrolling = false;
        return;
      }

      var scrollStep;
      var docScroll = this.scrollable.scrollTop;
      var distanceFromTop = Math.abs(touch.pageY - docScroll);
      var distanceFromHeader = distanceFromTop -
        (this.editHeaderElement ? this.editHeaderElement.clientHeight : 0);
      this.isScrolling = true;

      if (distanceFromTop > SCREEN_HEIGHT - EDGE_PAGE_THRESHOLD) {
        var maxY = this.maxScroll;
        scrollStep = this.getScrollStep(SCREEN_HEIGHT - distanceFromTop);
        // We cannot exceed the maximum scroll value
        if (touch.pageY >= maxY || maxY - touch.pageY < scrollStep) {
          this.isScrolling = false;
        }
      } else if (touch.pageY > 0 && distanceFromHeader < EDGE_PAGE_THRESHOLD) {
        // We cannot go below the minimum scroll value
        scrollStep = -this.getScrollStep(distanceFromHeader);
        scrollStep = Math.max(scrollStep, -this.scrollable.scrollTop);
        if (scrollStep >= 0) {
          this.isScrolling = false;
        }
      } else {
        this.isScrolling = false;
      }

      if (!this.isScrolling) {
        this.updateIconPosition();
        this.deferredRearrangeGrid();
        return;
      }

      this.updateIconPosition();
      this.scrollable.scrollTop += scrollStep;
      touch.pageY += scrollStep;

      exports.requestAnimationFrame(this.positionAndScrollIfNeeded.bind(this));
    },

    /**
     * Highlights the group of the given icon index, or the group if the index
     * belongs to a group.
     * @param {Integer} index The grid index of the icon or group.
     */
    highlightGroup: function(index) {
      for (var i = index, iLen = this.gridView.items.length;
           i < iLen; i++) {
        var item = this.gridView.items[i];
        if (item.detail.type === 'divider') {
          if (this.hoverGroup != item) {
            if (this.hoverGroup) {
              this.hoverGroup.element.classList.remove('drop-target');
            }
            this.hoverGroup = item;
            item.element.classList.add('drop-target');
          }
          break;
        }
      }
    },

    inFirstGroup: function(index) {
      for (var i = index; i >= 0; i--) {
        if (this.gridView.items[i].detail.type === 'divider') {
          return false;
        }
      }
      return true;
    },

    /**
     * Positions an icon on the grid using the current touch coordinates.
     */
    updateIconPosition: function() {
      var oldX = this.icon.x;
      var oldY = this.icon.y;
      var newX = this.currentTouch.pageX - (this.initialPageX - this.icon.x);
      var newY = this.currentTouch.pageY - (this.initialPageY - this.icon.y);

      // Adjust new icon coordinates for the slightly inflated scale so that
      // it appears centered around the touch point. Dividers aren't scaled
      // during dragging.
      if (this.icon.detail.type !== 'divider') {
        newX = newX - ((this.icon.scale * this.gridView.layout.gridItemWidth) -
                       this.gridView.layout.gridItemWidth) / 2;
        newY = newY - ((this.icon.scale * this.icon.pixelHeight) -
                       this.icon.pixelHeight) / 2;
      }

      this.icon.setCoordinates(newX, newY);
      this.icon.render();
      this.icon.setCoordinates(oldX, oldY);
    },

    /**
     * Will call rearrangeGrid after a short period, calculated based on how
     * recently the grid was last rearranged.
     */
    deferredRearrangeGrid: function() {
      if (this.rearrangeGridTimeout !== null) {
        return;
      }

      var delay = Math.max(
        REARRANGE_FREQUENCY, REARRANGE_COOLDOWN -
          Math.max(0, Date.now() - this.lastRepositionTime));
      this.rearrangeGridTimeout = setTimeout(() => {
        this.rearrangeGridTimeout = null;
        this.rearrangeGrid();
      }, delay);
    },

    /**
     * Rearranges the grid icons and groups based on the current position of
     * the dragged icon.
     */
    rearrangeGrid: function() {
      if (this.rearrangeGridTimeout !== null) {
        clearTimeout(this.rearrangeGridTimeout);
        this.rearrangeGridTimeout = null;
      }

      if (this.isScrolling) {
        // We don't want the grid to shift while we're auto-scrolling
        return;
      }

      var iconIsDivider = this.icon.detail.type === 'divider';
      var pageX = this.currentTouch.pageX - (this.initialPageX - this.icon.x);
      var pageY = this.currentTouch.pageY - (this.initialPageY - this.icon.y);

      // Reposition in the icons array if necessary.
      // Find the icon with the closest X/Y position of the move,
      // and insert ours before it.
      var foundIndex = 0;
      var insertDividerAtTop = !this.gridView.config.features.disableSections;
      pageX += this.gridView.layout.gridItemWidth / 2;
      pageY += this.icon.pixelHeight / 2;
      if (pageY >= 0) {
        foundIndex =
          this.gridView.getNearestItemIndex(pageX, pageY, iconIsDivider);

        // If we're dragging a group over the first icon, a divider will
        // be inserted at the top.
        if (!(iconIsDivider && foundIndex === 0)) {
          this.container.classList.remove('hover-over-top');
          insertDividerAtTop = false;
        }
      }

      // Clear the rearrange callback and hover item if we aren't hovering over
      // anything.
      this.doRearrange = null;
      if (this.rearrangeDelay) {
        clearTimeout(this.rearrangeDelay);
        this.rearrangeDelay = null;
      }
      if (this.hoverItem) {
        this.hoverItem.element.classList.remove('hovered');
        this.hoverItem = null;
      }

      // Add the 'hovering' class to the dragged icon.
      if (foundIndex !== null) {
        this.icon.element.classList.add('hovering');
      } else {
        this.icon.element.classList.remove('hovering');
      }

      // Nothing to do if we find the dragged icon or no icon
      if (!insertDividerAtTop &&
          (foundIndex === null || foundIndex === this.icon.detail.index)) {
        if (!iconIsDivider) {
          this.highlightGroup(this.icon.detail.index);
        }
        return;
      }
      var foundItem = this.gridView.items[foundIndex];

      // If we're a divider being dragged, only allow dropping on either the
      // first item or another divider.
      if (iconIsDivider &&
          foundIndex > 0 &&
          foundItem.detail.type !== 'divider') {
        // Remove the hovering class from a group if it's not hovering over
        // a valid drop position or itself.
        this.icon.element.classList.remove('hovering');
        return;
      }

      // If the item isn't a collection or a group, trigger the
      // hovered state on the found item.
      if (!insertDividerAtTop &&
          (foundItem.detail.type !== 'collection' ||
           (this.icon.detail.type !== 'collection' && !iconIsDivider))) {
        this.hoverItem = foundItem;
        this.hoverItem.element.classList.add('hovered');
      }

      // Delay rearranging when we're dragging groups to when they're dropped
      var rearrangeAfterDelay = !iconIsDivider;

      // Determine if we want to create a new divider. We do this when hovering
      // over a divider with an icon, or when dragging an icon to the very top
      // of the grid.
      var createDivider = insertDividerAtTop;
      if (!insertDividerAtTop && !iconIsDivider &&
          (foundItem.detail.type === 'divider')) {
        // Allow dropping into a collapsed group if the new position is in
        // the top 2/3 of the group.
        if (foundItem.detail.collapsed &&
            pageY <= foundItem.y + (foundItem.pixelHeight * 2/3)) {
          rearrangeAfterDelay = false;
          foundItem.element.classList.remove('hovered');

          // When dragging an item forwards, it gets placed after the found
          // item, adjust to the item before the divider.
          if (this.icon.detail.index < foundIndex) {
            foundItem = this.gridView.items[foundIndex - 1];
          }
        } else {
          createDivider = true;
        }
      }

      if (createDivider) {
        // Remove the group background highlight if we're between groups
        if (this.hoverGroup) {
          this.hoverGroup.element.classList.remove('drop-target');
          this.hoverGroup = null;
        }

        // Cancel rearrangement if it would have no effect.
        var redundantRearrange = false;
        if (insertDividerAtTop) {
          if (iconIsDivider) {
            redundantRearrange = this.inFirstGroup(this.icon.detail.index - 1);
          } else {
            redundantRearrange =
              (this.icon.detail.index === 0 &&
               this.gridView.items[1].detail.type === 'placeholder');
          }
        } else {
          redundantRearrange = this.gridView.items[foundIndex].element.
            classList.contains('invalid-drop');
        }

        if (redundantRearrange) {
          if (this.hoverItem) {
            this.hoverItem.element.classList.remove('hovered');
            this.hoverItem = null;
          }
          return;
        } else if (insertDividerAtTop) {
          this.container.classList.add('hover-over-top');
        }

        this.doRearrange =
          this.createNewDivider.bind(this,
                                     insertDividerAtTop ? null : foundItem);
      } else {
        if (!iconIsDivider) {
          // Change the display of the group the icon is hovering over to
          // indicate it can be dropped.
          this.highlightGroup(foundIndex);
        }

        this.doRearrange = this.rearrange.bind(this, foundItem);

        if (rearrangeAfterDelay) {
          this.rearrangeDelay =
            setTimeout(this.doRearrange.bind(this),
              this.hoverItem && this.hoverItem.detail.type === 'collection' ?
                REARRANGE_COLLECTION_DELAY : REARRANGE_DELAY);
        }
      }
    },

    /**
     * Creates a new divider in GridView.items and rearranges the currently
     * dragged icon into the newly created section.
     * @param {Object} tDivider The divider after which to place a new divider,
     *   or null to insert a divider at the beginning on the grid.
     */
    createNewDivider: function(tDivider) {
      var items = this.gridView.items;
      var tIndex = tDivider ? items.indexOf(tDivider) + 1 : 0;

      // Create the new divider
      var newDivider = new GaiaGrid.Divider();
      items.splice(tIndex, 0, newDivider);

      // Place the dragged item into the new empty section
      var sIndex = items.indexOf(this.icon);
      this.rearrange(sIndex >= tIndex ? newDivider : tDivider);

      // Make sure the new divider/group is in view
      newDivider.requestAttention();
    },

    /**
     * Rearranges items in GridView.items
     * @param {Object} tItem The item to position the dragged icon at.
     */
    rearrange: function(tItem) {
      // Clear the rearrange callback
      this.doRearrange = null;
      this.rearrangeDelay = null;

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
        if (this.gridView.items[tIndex].detail.type === 'divider') {
          tIndex++;
        } else {
          tIndex = 0;
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
      toInsert.unshift(tItem ? this.gridView.items.indexOf(tItem) :
                               this.gridView.items.length, 0);

      // Reinsert items
      this.rearrangeDelay = null;
      this.dirty = true;
      this.gridView.items.splice.apply(this.gridView.items, toInsert);

      var oldX = this.icon.x;
      var oldY = this.icon.y;
      this.gridView.render();

      // In this case, we don't want to compensate for the icon moving, so
      // we need to correct our initial values to stop the icon from jumping
      // after rearranging.
      this.initialPageX -= oldX - this.icon.x;
      this.initialPageY -= oldY - this.icon.y;

      this.lastRepositionTime = Date.now();
    },

    enterEditMode: function() {
      this.inEditMode = true;
      this.container.classList.add('edit-mode');
      document.body.classList.add('edit-mode');
      this.gridView.element.dispatchEvent(
        new CustomEvent('editmode-start'));
      document.addEventListener('visibilitychange', this);
      this.container.addEventListener('collection-close', this);
      this.gridView.render();
    },

    exitEditMode: function() {
      // If we're in the middle of a drag, cancel it.
      if (this.icon) {
        this.finish();
        this.finalize();
      }

      this.inEditMode = false;
      this.cancelLongPressTimeout();
      this.container.classList.remove('edit-mode');
      document.body.classList.remove('edit-mode');
      this.gridView.element.dispatchEvent(new CustomEvent('editmode-end'));
      document.removeEventListener('visibilitychange', this);
      this.container.removeEventListener('collection-close', this);
      this.gridView.render();
    },

    cancelLongPressTimeout: function() {
      if (this.longPressTimeout !== null) {
        clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
      }
    },

    inLongPressThreshold: function(x, y) {
      return (
        Math.abs(x - this.touchStart.screenX) < EDIT_LONG_PRESS_THRESHOLD &&
        Math.abs(y - this.touchStart.screenY) < EDIT_LONG_PRESS_THRESHOLD);
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
          case 'collection-close':
            this.exitEditMode();
            break;

          case 'visibilitychange':
            if (document.hidden) {
              this.exitEditMode();
            }
            break;

          case 'touchstart':
            this.cancelLongPressTimeout();

            if (e.touches.length > 1) {
              if (this.inDragAction) {
                this.finish();
              }
              return;
            }

            if (this.inEditMode) {
              this.touchStart.x = e.touches[0].pageX;
              this.touchStart.y = e.touches[0].pageY;
              this.touchStart.screenX = e.touches[0].screenX;
              this.touchStart.screenY = e.touches[0].screenY;
              this.longPressTimeout = setTimeout(() => {
                this.longPressTimeout = null;
                this.handleEvent({
                  type: 'contextmenu',
                  target: e.target,
                  pageX: this.touchStart.x,
                  pageY: this.touchStart.y,
                  preventDefault: function() {},
                  stopImmediatePropagation: function() {}
                });
              }, EDIT_LONG_PRESS_DELAY);
            }
            break;

          case 'contextmenu':
            this.cancelLongPressTimeout();

            if (this.gridView._collectionOpen || this.icon) {
              e.stopImmediatePropagation();
              e.preventDefault();
              return;
            }

            if (e.defaultPrevented) {
              // other handlers already handled this.
              // in the future, we should use the shadow root and dispatch a
              // "contextmenu" event from here instead.
              return;
            }

            if (!e.target) {
              return;
            }

            this.icon = this.gridView.findItemFromElement(e.target, true);

            if (!this.icon || !this.icon.element || !this.icon.isDraggable() ||
                this.icon.detail.type === 'placeholder') {
              this.icon = null;
              return;
            }

            e.stopImmediatePropagation();
            e.preventDefault();

            this.target = this.icon.element;
            this.begin(e);

            break;

          case 'touchmove':
            var touch = e.touches[0];

            if (this.inDragAction) {
              this.currentTouch = {
                pageX: touch.pageX,
                pageY: touch.pageY
              };

              if (!this.isScrolling) {
                this.positionAndScrollIfNeeded();
              }
            } else if (this.longPressTimeout !== null &&
                       !this.inLongPressThreshold(touch.screenX,
                                                  touch.screenY)) {
              this.cancelLongPressTimeout();
            }

            break;

          case 'click':
          case 'touchcancel':
            if (this.inDragAction) {
              this.finish();
              this.finalize();
            }

            this.cancelLongPressTimeout();
            break;

          case 'touchend':
            if (this.inDragAction) {
              // Ensure the app is not launched
              e.stopImmediatePropagation();
              e.preventDefault();

              // As contextmenu event can be synthesized, it's possible for it
              // to happen in the same event-loop as touchend, meaning
              // finish would be called immediately after begin. This would
              // mean that the icon doesn't get a chance to transition and
              // the transitionend that we expect won't be called, so finalize
              // also won't be called, leaving us in an inconsistent state.
              // It would be so great if there was a transitionstart event :(
              setTimeout(() => { this.finish(); }, TOUCH_END_FINISH_DELAY);
            }

            this.cancelLongPressTimeout();
            break;

          case 'transitionend':
            this.finalize();
            break;
        }
    }
  };

  exports.GridDragDrop = DragDrop;

}(window));
