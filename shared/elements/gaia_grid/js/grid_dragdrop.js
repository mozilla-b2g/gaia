'use strict';

(function(exports) {

  const ACTIVE_SCALE_ADJUST = 0.4;

  const COLLECTION_DROP_SCALE_ADJUST = 0.5;

  /* This delay is the time passed once users stop the finger over an icon and
   * the rearrange is performed */
  const REARRANGE_DELAY = 30;

  /* The page is scrolled via javascript if an icon is being moved, and is
   * within a length of a page edge configured by this value */
  const EDGE_PAGE_THRESHOLD = 50;

  /* This delay is the time to wait before rearranging a collection. */
  const REARRANGE_COLLECTION_DELAY = 1500;

  const SCREEN_HEIGHT = window.innerHeight;

  const scrollStep = Math.round(SCREEN_HEIGHT / EDGE_PAGE_THRESHOLD);

  /* The scroll step will be 10 times bigger over the edge */
  const maxScrollStepFactor = 10;

  function DragDrop(gridView) {
    this.gridView = gridView;
    this.container = gridView.element;
    this.scrollable = this.container.parentNode;
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
    get maxActiveScale() {
      return 1 + ACTIVE_SCALE_ADJUST;
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

      this.icon.noTransform = true;
      this.hoverItem = null;
      this.rearrangeDelay = null;
      this.enterEditMode();
      this.container.classList.add('dragging');
      this.target.classList.add('active');

      // Testing with some extra offset (20)
      this.xAdjust = this.gridView.layout.gridItemWidth / 2 + 20;
      this.yAdjust = this.gridView.layout.gridItemHeight + 20;

      var items = this.gridView.items;
      var lastElement = items[items.length - 1];
      this.maxScroll = lastElement.y + lastElement.pixelHeight +
                       (this.icon.pixelHeight * this.maxActiveScale);

      // Make the icon larger
      this.icon.transform(
        e.pageX - this.xAdjust,
        e.pageY - this.yAdjust + this.scrollable.scrollTop,
        this.icon.scale + ACTIVE_SCALE_ADJUST);
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
          var scaleAdjustX =
            ((this.gridView.layout.gridItemWidth * this.icon.scale) -
             (this.gridView.layout.gridItemWidth *
              (this.icon.scale - COLLECTION_DROP_SCALE_ADJUST))) / 2;
          var scaleAdjustY =
            ((this.gridView.layout.gridItemHeight * this.icon.scale) -
             (this.gridView.layout.gridItemHeight *
              (this.icon.scale - COLLECTION_DROP_SCALE_ADJUST))) / 2;

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
            this.icon.scale - COLLECTION_DROP_SCALE_ADJUST,
            clone);

          // Now animate the original icon back into its original position.
          this.icon.transform(this.icon.x + scaleAdjustX,
                              this.icon.y + scaleAdjustY,
                              this.icon.scale - COLLECTION_DROP_SCALE_ADJUST);

          // Force a reflow on this icon, otherwise when we remove the active
          // class, it will transition from its original position instead of
          // this new position.
          this.icon.element.clientWidth;
        } else {
          this.doRearrange.call(this);
        }
      }

      // Hand back responsibility to GridItem to render itself.
      delete this.icon.noTransform;
      if (this.target) {
        this.target.classList.remove('active');
      }

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
     ** Distance 0px -> 10 times faster
     ** Distance 25px -> 5 times faster
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

      var docScroll = this.scrollable.scrollTop;
      var distanceFromTop = Math.abs(touch.pageY - docScroll);
      var distanceFromHeader = distanceFromTop -
        (this.editHeaderElement ? this.editHeaderElement.clientHeight : 0);
      if (distanceFromTop > SCREEN_HEIGHT - EDGE_PAGE_THRESHOLD) {
        var maxY = this.maxScroll;
        var scrollStep = this.getScrollStep(SCREEN_HEIGHT - distanceFromTop);
        // We cannot exceed the maximum scroll value
        if (touch.pageY >= maxY || maxY - touch.pageY < scrollStep) {
          this.isScrolling = false;
          return;
        }

        doScroll.call(this, scrollStep);
      } else if (touch.pageY > 0 && distanceFromHeader < EDGE_PAGE_THRESHOLD) {
        doScroll.call(this, 0 - this.getScrollStep(distanceFromHeader));
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
      pageX = pageX - this.xAdjust;
      pageY = pageY - this.yAdjust;

      this.icon.transform(
        pageX,
        pageY,
        this.icon.scale + ACTIVE_SCALE_ADJUST);

      // Reposition in the icons array if necessary.
      // Find the icon with the closest X/Y position of the move,
      // and insert ours before it.
      var foundIndex = this.gridView.getNearestItemIndex(pageX, pageY);
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
        // Collections should not trigger a hover
        if (this.icon.detail.type !== 'collection') {
          this.hoverItem = foundItem;
          this.hoverItem.element.classList.add('hovered');
        }
        this.doRearrange = this.rearrange.bind(this, foundIndex);
        this.rearrangeDelay =
          setTimeout(this.doRearrange.bind(this),
            this.hoverItem && this.hoverItem.detail.type === 'collection' ?
              REARRANGE_COLLECTION_DELAY : REARRANGE_DELAY);
      }
    },

    /**
     * Rearranges items in GridView.items
     * @param {Integer} insertAt The position to insert our icon at.
     */
    rearrange: function(tIndex) {

      // We get a reference to the position of this.icon within the items
      // array. Because placeholders are shifting around while we are dragging,
      // we can't trust the detail.index attribute. This will be fixed on every
      // render call though.
      var sIndex = this.gridView.items.indexOf(this.icon);
      var toInsert = this.gridView.items.splice(sIndex, 1)[0];

      this.rearrangeDelay = null;
      this.dirty = true;
      this.gridView.items.splice(tIndex, 0, toInsert);

      // Render to/from the selected position. We give a render buffer of 2
      // rows or so due to divider creation/removal. Otherwise we may
      // end up not rendering enough depending on the actual drop and have a
      // stale rendering of the dragged icon.
      var renderBuffer = this.gridView.layout.cols * 2;
      this.gridView.render({
        from: Math.min(tIndex, sIndex) - renderBuffer,
        to: Math.max(tIndex, sIndex) + renderBuffer
      });
    },

    enterEditMode: function() {
      this.inEditMode = true;
      this.container.classList.add('edit-mode');
      document.body.classList.add('edit-mode');
      this.gridView.element.dispatchEvent(
        new CustomEvent('gaiagrid-editmode-start'));
      document.addEventListener('visibilitychange', this);
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
      this.gridView.render({skipItems: true});
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

            this.target = e.target;

            if (!this.target) {
              return;
            }

            var identifier = this.target.dataset.identifier;
            this.icon = this.gridView.icons[identifier];

            if (!this.icon) {
              return;
            }

            this.addDragHandlers();

            e.stopImmediatePropagation();
            e.preventDefault();

            this.begin(e);

            break;

          case 'touchmove':
            var touch = e.touches[0];

            var pageY = touch.pageY + this.scrollable.scrollTop;
            this.positionIcon(touch.pageX, pageY);

            this.currentTouch = {
              pageX: touch.pageX,
              pageY: pageY
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
