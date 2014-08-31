/* exported  ImageLoader */
'use strict';

if (!window.ImageLoader) {
  var ImageLoader = function ImageLoader(pContainer, pItems) {
    var container, items, itemsSelector, lastScrollTime, scrollLatency = 100,
        scrollTimer, itemHeight, total, imgsLoading = 0,
        loadImage = defaultLoadImage, self = this;

    init(pContainer, pItems);

    /**
     *  Initializer
     *
     */
    function init(pContainer, pItems) {
      itemsSelector = pItems;
      container = document.querySelector(pContainer);

      attachHandlers();
      window.addEventListener('image-loader-resume', resuming);
      window.addEventListener('image-loader-pause', unload);
      load();
    }

    function resuming() {
      window.clearTimeout(scrollTimer);
      attachHandlers();
      update();
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

    function attachHandlers() {
      container.addEventListener('scroll', onScroll);
      document.addEventListener('onupdate', onUpdate);
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
        image = item.querySelector('img[data-src]');
        if (!image) {
          // Image by default
          image = item.querySelector('span[data-type=img][data-group]');
          if (image) {
            item.dataset.visited = 'true';
          }
          return;
        }
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
        var theItem = items[j];
        if (!theItem) {
          // Returning because of index out of bound
          return;
        }

        if (theItem.offsetTop > viewTop + containerHeight) {
          return; // Below
        }

        if (theItem.dataset.visited !== 'true') {
          loadImage(theItem, self);
        }
      }
    } // update

    function releaseImage(item) {
      var image = item.querySelector('span[data-type=img][data-src]');
      if (!image) {
        // Image by default
        image = item.querySelector('span[data-type=img][data-group]');
        if (image) {
          item.dataset.visited = 'false';
        }
        return null;
      }
      image.style.backgroundImage = 'none';
      item.dataset.visited = 'false';
      return image;
    }

    // It's necessary to prevent unit test errors
    function destroy() {
      unload();
      window.removeEventListener('image-loader-pause', unload);
      window.removeEventListener('image-loader-resume', resuming);
      container = items = itemsSelector = lastScrollTime = scrollLatency = null;
      scrollTimer = itemHeight = total = imgsLoading = loadImage = null;
    }

    this.reload = load;
    this.unload = unload;
    this.setResolver = setResolver;
    this.defaultLoad = defaultLoadImage;
    this.releaseImage = releaseImage;
    this.destroy = destroy;
  };

}
