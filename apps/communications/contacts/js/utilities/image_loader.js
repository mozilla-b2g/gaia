'use strict';

if (!window.ImageLoader) {
  var ImageLoader = function ImageLoader(pContainer, pItems) {
    var container, items, itemsSelector, lastScrollTime, scrollLatency = 100,
        scrollTimer, lastViewTop = 0, itemHeight, total, imgsLoading = 0,
        loadImage = defaultLoadImage, self = this;

    var forEach = Array.prototype.forEach;

    init(pContainer, pItems);

    /**
     *  Initializer
     *
     */
    function init(pContainer, pItems) {
      itemsSelector = pItems;
      container = document.querySelector(pContainer);

      container.addEventListener('scroll', onScroll);
      document.addEventListener('onupdate', onUpdate);

      load();
    }

    function onUpdate(evt) {
      evt.stopPropagation();
      onScroll();
    }

    function load() {
      window.clearTimeout(scrollTimer);
      scrollTimer = null;
      items = container.querySelectorAll(itemsSelector);
      // All items have the same height
      itemHeight = items[0] ? items[0].offsetHeight : 1;
      total = items.length;
      // Initial check if items should appear
      window.setTimeout(update, 0);
    }

    function unload() {
      container.removeEventListener('scroll', onScroll);
      document.removeEventListener('onupdate', onUpdate);
      window.clearTimeout(scrollTimer);
      scrollTimer = null;
    }

    function setResolver(pResolver) {
      loadImage = pResolver;
    }

    function onScroll() {
      if (imgsLoading > 0) {
        // Stop the pending images load
        window.stop();
        imgsLoading = 0;
      }
      // Clearing and setting a timer on every scroll event is too slow on
      // some mobile devices. Therefore, set a timer once here and then
      // check how long it has been since the last scroll event in the
      // timer handler to determine what to do.
      lastScrollTime = Date.now();
      if (!scrollTimer) {
        scrollTimer = window.setTimeout(updateFromScroll, scrollLatency);
      }
    }

    function updateFromScroll() {
      scrollTimer = null;
      // If we scrolled more since the timer was set, then we need to
      // delay again.  Otherwise, go ahead and update now.
      var deltaLatency = lastScrollTime - Date.now() + scrollLatency;
      if (deltaLatency > 0) {
        scrollTimer = window.setTimeout(updateFromScroll, deltaLatency);
      } else {
        update();
      }
    }

    /**
     *  Loads the image contained in a DOM Element.
     */
    function defaultLoadImage(item) {
      var image = item.querySelector('span[data-type=img][data-src]');
      if (!image) {
        return;
      }

      ++imgsLoading;
      var tmp = new Image();
      var src = tmp.src = image.dataset.src;
      tmp.onload = function onload() {
        --imgsLoading;
        image.style.backgroundImage = 'url(' + src + ')';
        if (tmp.complete) {
          item.dataset.visited = 'true';
        }
        tmp = null;
      };

      tmp.onabort = tmp.onerror = function onerror() {
        --imgsLoading;
        item.dataset.visited = 'false';
        tmp = null;
      };
    }

    /**
     *  Calculates the set of items are in the current viewport
     *
     */
    function update() {
      if (total === 0) {
        return;
      }

      var viewTop = container.scrollTop;
      // Index is always inside or below viewport
      var index = Math.floor(viewTop / itemHeight);
      var containerHeight = container.offsetHeight;

      // Goes backward
      for (var i = index; i >= 0; i--) {
        var item = items[i];
        if (item) {
          if (item.offsetTop + itemHeight < viewTop) {
            break; // Over
          }

          if (item.dataset.visited !== 'true' &&
              item.offsetTop <= viewTop + containerHeight) {
            loadImage(item, self); // Inside
          }
        }
      }

      // Goes forward
      for (var j = index + 1; j < total; j++) {
        var item = items[j];
        if (!item) {
          // Returning because of index out of bound
          return;
        }

        if (item.offsetTop > viewTop + containerHeight) {
          return; // Below
        }

        if (item.dataset.visited !== 'true') {
          loadImage(item, self);
        }
      }
    } // update

    function releaseImage(item) {
      var image = item.querySelector('span[data-type=img][data-src]');
      if (!image) {
        return null;
      }
      image.style.backgroundImage = 'none';
      item.dataset.visited = 'false';
      return image;
    }

    this.reload = load;
    this.unload = unload;
    this.setResolver = setResolver;
    this.defaultLoad = defaultLoadImage;
    this.releaseImage = releaseImage;
  };
}
