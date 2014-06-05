'use strict';

(function(exports) {

  /* The scale to use on icons that are being dragged */
  const ACTIVE_SCALE = 1.4;

  /* This delay is the time passed once users stop the finger over an icon and
   * the rearrange is performed */
  const REARRANGE_DELAY = 30;

  /* The page is scrolled via javascript if an icon is being moved, and is
   * within a length of a page edge configured by this value */
  const EDGE_PAGE_THRESHOLD = 50;

  const SCREEN_HEIGHT = window.innerHeight;

  const SCROLL_STEP = Math.round(SCREEN_HEIGHT / EDGE_PAGE_THRESHOLD);

  /* The scroll step will be 10 times bigger over the edge */
  const MAX_SCROLL_STEP_FACTOR = 10;

  function DragDrop(gridView) {
    this.gridView = gridView;
    this.container = gridView.element;
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
     * Returns true if we are currently dragging an icon.
     */
    get inDragAction() {
      return this.target && this.target.classList.contains('active');
    },

    get activeScale() {
      return ACTIVE_SCALE;
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
      this.rearrangeDelay = null;
      this.enterEditMode();
      this.target.classList.add('active');
      this.container.classList.add('dragging');

      // Testing with some extra offset (20)
      this.xAdjust = this.gridView.layout.gridItemWidth / 2 + 20 - this.gridView.layout.offsetX;
      this.yAdjust = this.gridView.layout.gridItemHeight + 20 - this.gridView.layout.offsetY;

      var items = this.gridView.items;
      var lastElement = items[items.length - 1];
      this.maxScroll = lastElement.y + lastElement.pixelHeight +
                       (this.icon.pixelHeight * ACTIVE_SCALE);

      // Make the icon larger.
      var iconX = e.pageX - this.xAdjust;
      var iconY = e.pageY - this.yAdjust + this.container.scrollTop;
      this.icon.transform(iconX, iconY, ACTIVE_SCALE, true);
    },

    finish: function(e) {
      // Remove the dragging property after the icon has transitioned into
      // place to avoid jank due to animations starting that are disabled
      // when dragging.
      this.icon.element.addEventListener('transitionend', this);

      this.currentTouch = null;
      delete this.icon.noTransform;
      this.target.classList.remove('active');

      if (this.rearrangeDelay !== null) {
        clearTimeout(this.rearrangeDelay);
        this.doRearrange.call(this);
      } else {
        this.gridView.render(this.icon.detail.index, this.icon.detail.index, true);
      }

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

    /**
     * The closer to edge the faster (bigger step).
     ** Distance 0px -> 10 times faster
     ** Distance 25px -> 5 times faster
     ** Distance 50px (EDGE_PAGE_THRESHOLD) -> 0 times
     */
    getScrollStep: function(distanceToEdge) {
      var factor = MAX_SCROLL_STEP_FACTOR;

      if (distanceToEdge > 0) {
        factor *= ((EDGE_PAGE_THRESHOLD - distanceToEdge) / EDGE_PAGE_THRESHOLD);
      }

      return Math.round(SCROLL_STEP * factor);
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
        this.container.scrollTop += amount;
        exports.requestAnimationFrame(this.scrollIfNeeded.bind(this));
        touch.pageY += amount;
        this.positionIcon(touch.pageX, touch.pageY);
      }

      var docScroll = this.container.scrollTop;
      var distanceFromTop = Math.abs(touch.pageY - docScroll);
      if (distanceFromTop > SCREEN_HEIGHT - EDGE_PAGE_THRESHOLD) {
        var maxY = this.maxScroll;
        var scrollStep = this.getScrollStep(SCREEN_HEIGHT - distanceFromTop);
        // We cannot exceed the maximum scroll value
        if (touch.pageY >= maxY || maxY - touch.pageY < scrollStep) {
          this.isScrolling = false;
          return;
        }

        doScroll.call(this, scrollStep);
      } else if (touch.pageY > 0 && distanceFromTop < EDGE_PAGE_THRESHOLD) {
        doScroll.call(this, 0 - this.getScrollStep(distanceFromTop));
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
        ACTIVE_SCALE,
        true);

      // Reposition in the icons array if necessary.
      // Find the icon with the closest X/Y position of the move,
      // and insert ours before it.
      // Todo: this could be more efficient with a binary search.
      var leastDistance;
      var foundIndex;
      for (var i = 0, iLen = this.gridView.items.length; i < iLen; i++) {
        var item = this.gridView.items[i];
        var distance = Math.sqrt(
          (pageX - item.x) * (pageX - item.x) +
          (pageY - item.y) * (pageY - item.y));
        if (!leastDistance || distance < leastDistance) {
          leastDistance = distance;
          foundIndex = i;
        }
      }

      // Insert at the found position
      var myIndex = this.icon.detail.index;
      if (foundIndex !== myIndex) {
        clearTimeout(this.rearrangeDelay);
        this.doRearrange = this.rearrange.bind(this, myIndex, foundIndex);
        this.rearrangeDelay = setTimeout(this.doRearrange.bind(this),
                                         REARRANGE_DELAY);
      }
    },

    rearrange: function(sIndex, tIndex) {
      this.rearrangeDelay = null;
      this.dirty = true;

      var [from, to] = sIndex < tIndex ? [sIndex, tIndex] : [tIndex, sIndex];

      // Check if we're dragging past a divider - if so, we need to change to
      // to draw to the next divider, as items won't shift backwards to fill
      // the space the dragged icon left.
      var inDivider = false;
      for (var i = from, iLen = this.gridView.items.length; i < iLen; i++) {
        var item =  this.gridView.items[i];
        if (item instanceof Divider) {
          if (inDivider) {
            to = i;
            inDivider = false;
            break;
          } else {
            inDivider = true;
          }
        }
        if (!inDivider && i >= to) {
          break;
        }
      }
      if (inDivider) {
        to = this.gridView.items.length - 1;
      }

      // This first call will make sure that all the grid items have been
      // positioned with transforms instead of left/top so the transition
      // works correctly.
      this.gridView.render(from, to, true);

      // Rearrange items
      this.gridView.items.splice(tIndex, 0,
        this.gridView.items.splice(sIndex, 1)[0]);

      // Final render to animate items to their new positions
      this.gridView.render(from, to, true);
    },

    enterEditMode: function() {
      this.inEditMode = true;
      this.container.classList.add('edit-mode');
      document.body.classList.add('edit-mode');
      document.addEventListener('visibilitychange', this);
    },

    exitEditMode: function() {
      this.inEditMode = false;
      this.container.classList.remove('edit-mode');
      document.body.classList.remove('edit-mode');
      document.removeEventListener('visibilitychange', this);
      this.removeDragHandlers();

      if (this.icon) {
        this.icon.element.removeEventListener('transitionend', this);
        this.icon = null;
      }
    },

    removeDragHandlers: function() {
      this.container.removeEventListener('touchmove', this);
      this.container.removeEventListener('touchend', this);
    },

    addDragHandlers: function() {
      this.container.addEventListener('touchmove', this);
      this.container.addEventListener('touchend', this);
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
          case 'visibilitychange':
            if (document.hidden && this.inEditMode) {
              this.exitEditMode();
            }
            break;

          case 'contextmenu':
            if (this.icon) {
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

            var pageY = touch.pageY + this.container.scrollTop;
            this.positionIcon(touch.pageX, pageY);

            this.currentTouch = {
              pageX: touch.pageX,
              pageY: pageY
            };

            if (!this.isScrolling) {
              this.scrollIfNeeded();
            }

            break;

          case 'touchend':
            // Ensure the app is not launched
            e.stopImmediatePropagation();
            e.preventDefault();
            this.removeDragHandlers();
            this.finish(e);
            break;

          case 'transitionend':
            if (!this.icon) {
              return;
            }

            this.container.classList.remove('dragging');
            this.icon.element.removeEventListener('transitionend', this);
            this.icon = null;

            // Re-render the grid view without using transforms
            this.gridView.render(0, this.gridView.items.length - 1);

            // Recalculate visibility as we've moved icons about
            this.gridView.calcVisibility();

            break;
        }
    }
  };

  exports.GridDragDrop = DragDrop;

}(window));
