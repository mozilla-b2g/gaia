'use strict';

(function(exports) {

  const activateDelay = 600;

  const activeScaleAdjust = 0.4;

  var container = document.getElementById('icons');

  function DragDrop() {
    container.addEventListener('touchstart', this);
    container.addEventListener('touchmove', this);
    container.addEventListener('touchend', this);
  }

  DragDrop.prototype = {

    /**
     * The current touchmove target.
     * @type {DomElement}
     */
    target: null,

    /**
     * Begins the drag/drop interaction.
     * Enlarges the icon.
     * Sets additional data to make the touchmove handler faster.
     */
    begin: function(e) {
      if (!this.target || !this.icon) {
        return;
      }

      this.active = true;
      container.classList.add('edit-mode');
      this.target.classList.add('active');

      // Testing with some extra offset (20)
      this.xAdjust = app.zoom.gridItemHeight / 2 + 20;
      this.yAdjust = app.zoom.gridItemWidth / 2 + 20;

      // Make the icon larger
      this.icon.transform(
        e.touches[0].pageX - this.xAdjust,
        e.touches[0].pageY - this.yAdjust,
        this.icon.scale + activeScaleAdjust);
    },

    /**
     * Scrolls the page if needed.
     * The page is scrolled via javascript if an icon is being moved,
     * and is within a percentage of a page edge.
     * @param {Object} e A touch object from a touchmove event.
     */
    scrollIfNeeded: function() {
      var scrollStep = 2;

      var touch = this.currentTouch;
      if (!touch) {
        this.isScrolling = false;
        return;
      }

      function doScroll(amount) {
        /* jshint validthis:true */
        this.isScrolling = true;
        document.documentElement.scrollTop += amount;
        exports.requestAnimationFrame(this.scrollIfNeeded.bind(this));
        touch.pageY += amount;
        this.positionIcon(touch.pageX, touch.pageY);
      }

      var docScroll = document.documentElement.scrollTop;
      if (touch.pageY - docScroll > window.innerHeight - 50) {
        doScroll.call(this, scrollStep);
      } else if (touch.pageY > 0 && touch.pageY - docScroll < 50) {
        doScroll.call(this, 0 - scrollStep);
      } else {
        this.isScrolling = false;
      }
    },

    /**
     * Positions an icon on the grid.
     * @param {Integer} pageX
     * @param {Integer} posY
     */
    positionIcon: function(pageX, pageY) {
      this.icon.transform(
        pageX - this.xAdjust,
        pageY - this.yAdjust,
        this.icon.scale + activeScaleAdjust);

      // Reposition in the icons array if necessary.
      // Find the icon with the closest X/Y position of the move,
      // and insert ours before it.
      // Todo: this could be more efficient with a binary search.
      var leastDistance;
      var foundIndex;
      for (var i = 0, iLen = app.items.length; i < iLen; i++) {
        var item = app.items[i];
        var distance = Math.sqrt(
          (pageX - item.x) * (pageX - item.x) +
          (pageY - item.y) * (pageY - item.y));
        if (!leastDistance || distance < leastDistance) {
          leastDistance = distance;
          foundIndex = i;
        }
      }

      // Insert at the found position
      var myIndex = this.icon.itemIndex;
      if (foundIndex !== myIndex) {
        this.icon.noRender = true;
        app.items.splice(foundIndex, 0, app.items.splice(myIndex, 1)[0]);
        app.render();
      }
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
          case 'touchstart':
            // If we get a second touch, cancel everything.
            if (e.touches.length > 1) {
              clearTimeout(this.timeout);
              return;
            }

            var touch = e.touches[0];
            this.startTouch = {
              pageX: touch.pageX,
              pageY: touch.pageY
            };

            this.target = touch.target;

            var identifier = this.target.dataset.identifier;
            this.icon = app.icons[identifier];

            if (!this.icon) {
              return;
            }

            this.timeout = setTimeout(this.begin.bind(this, e),
              activateDelay);

            break;
          case 'touchmove':
            // If we have an activate timeout, and our finger has moved past some
            // threshold, cancel it.
            var touch = e.touches[0];
            var distance = Math.sqrt(
              (touch.pageX - this.startTouch.pageX) * (touch.pageX - this.startTouch.pageX) +
              (touch.pageY - this.startTouch.pageY) * (touch.pageY - this.startTouch.pageY));

            if (!this.active && this.timeout && distance > 20) {
              clearTimeout(this.timeout);
              return;
            }

            if (!this.active || !this.icon) {
              return;
            }

            e.stopImmediatePropagation();
            e.preventDefault();

            this.currentTouch = {
              pageX: touch.pageX,
              pageY: touch.pageY
            };

            this.positionIcon(touch.pageX, touch.pageY);

            if (!this.isScrolling) {
              this.scrollIfNeeded();
            }

            break;
          case 'touchend':
            clearTimeout(this.timeout);

            if (!this.active) {
              return;
            }

            this.currentTouch = null;
            this.active = false;
            container.classList.remove('edit-mode');

            delete this.icon.noRender;
            this.icon = null;

            if (this.target) {
              this.target.classList.remove('active');
            }
            app.render();

            this.target = null;

            break;
        }
    }
  };

  exports.DragDrop = DragDrop;

}(window));
