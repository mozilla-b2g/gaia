'use strict';

(function(exports) {

  const activeScaleAdjust = 0.4;

  /* This delay is the time passed once users stop the finger over an icon and
   * the rearrange is performed */
  const rearrangeDelay = 30;

  /* The page is scrolled via javascript if an icon is being moved, and is
   * within a length of a page edge configured by this value */
  const edgePageThreshold = 50;

  const screenHeight = window.innerHeight;

  const scrollStep = Math.round(screenHeight / edgePageThreshold);

  /* The scroll step will be 10 times bigger over the edge */
  const maxScrollStepFactor = 10;

  function DragDrop(gridView) {
    this.gridView = gridView;
    this.container = gridView.element;
    this.scrollable = this.container.parentNode;
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
     * Returns the maximum active scale value.
     */
    get maxActiveScale() {
      return 1 + activeScaleAdjust;
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
        this.icon.scale + activeScaleAdjust);
    },

    finish: function(e) {
      this.currentTouch = null;

      delete this.icon.noTransform;
      this.icon = null;
      this.target.classList.remove('active');

      if (this.rearrangeDelay !== null) {
        clearTimeout(this.rearrangeDelay);
        this.doRearrange.call(this);
      } else {
        this.gridView.render();
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

      this.container.classList.remove('dragging');
    },

    /**
     * The closer to edge the faster (bigger step).
     ** Distance 0px -> 10 times faster
     ** Distance 25px -> 5 times faster
     ** Distance 50px (edgePageThreshold) -> 0 times
     */
    getScrollStep: function(distanceToEdge) {
      var factor = maxScrollStepFactor;

      if (distanceToEdge > 0) {
        factor *= ((edgePageThreshold - distanceToEdge) / edgePageThreshold);
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
      if (distanceFromTop > screenHeight - edgePageThreshold) {
        var maxY = this.maxScroll;
        var scrollStep = this.getScrollStep(screenHeight - distanceFromTop);
        // We cannot exceed the maximum scroll value
        if (touch.pageY >= maxY || maxY - touch.pageY < scrollStep) {
          this.isScrolling = false;
          return;
        }

        doScroll.call(this, scrollStep);
      } else if (touch.pageY > 0 && distanceFromTop < edgePageThreshold) {
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
        this.icon.scale + activeScaleAdjust);

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
                                         rearrangeDelay);
      }
    },

    rearrange: function(sIndex, tIndex) {
      this.rearrangeDelay = null;
      this.dirty = true;
      this.gridView.items.splice(tIndex, 0,
        this.gridView.items.splice(sIndex, 1)[0]);
      tIndex < sIndex ? this.gridView.render(tIndex, sIndex) :
        this.gridView.render(sIndex, tIndex);
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
            
          case 'touchend':
            // Ensure the app is not launched
            e.stopImmediatePropagation();
            e.preventDefault();
            this.removeDragHandlers();
            this.finish(e);
            break;
        }
    }
  };

  exports.GridDragDrop = DragDrop;

}(window));
