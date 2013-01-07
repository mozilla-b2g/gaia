'use strict';

if (!ImageLoader) {
  var ImageLoader = (function() {

    var container, items, itemsSelector, scrollLatency = 100, scrollTimer,
        lastViewTop = 0, index, total;

    var forEach = Array.prototype.forEach;

    /**
     *  Initializer
     *
     */
    function init(pContainer, pItems) {
      itemsSelector = pItems;
      container = document.querySelector(pContainer);

      container.addEventListener('scroll', onScroll);
      document.addEventListener('onupdate', function(evt) {
        evt.stopPropagation();
        update();
      });

      load();
    }

    function load() {
      index = 0;
      items = container.querySelectorAll(itemsSelector);
      total = items.length;
      // Initial check if items should appear
      window.setTimeout(update, 0);
    }

    function onScroll() {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(update, scrollLatency);
    }

    /**
     *  Loads images contained in a DOM Element. Basically, it requests the URI
     *  defined in data-src and when the resource is laoded, the image will be
     *  linked to that resource
     *
     */
    function loadImages(item) {
      forEach.call(item.querySelectorAll('img[data-src]'), function(image) {
        var tmp = new Image();
        var src = tmp.src = image.dataset.src;
        tmp.addEventListener('load', function onload() {
          image.src = src;
          image.hidden = false;
          tmp.removeEventListener('load', onload);
        });
      });
    }

    /**
     *  Calculates the set of items are in the current viewport
     *
     */
    function update() {
      var viewTop = container.scrollTop;

      if (lastViewTop > viewTop) {
        index = 0; // Scroll to top
      }

      lastViewTop = viewTop;

      for (; index < total; index++) {
        var item = items[index];
        var itemTop = item.offsetTop;

        if (itemTop > viewTop + container.offsetHeight) {
          return; // Below
        }

        if (!item.visited && itemTop + item.offsetHeight >= viewTop) {
          loadImages(item); // Inside
          item.visited = true;
        }
      }
    }

    return {
      'init': init,
      'reload': load
    };

  })();
}
