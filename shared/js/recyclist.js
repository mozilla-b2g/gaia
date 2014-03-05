'use strict';

/**
 * Asynchronously scrolls a list using position: absolute.
 * Recycles old nodes for new content as the list is scrolled.
 * Requires the stylesheet located at: shared/style/recyclist.css.
 * @param {Object} config Configuration object with:
 * - template: A reference to the template node.
 * - numItems: The total number of items in the list.
 * - populate: A method to call which will render the item.
 * - scrollParent: The parent of the container to scroll.
 *   If there are no overflow areas, this is probably the window.
 * - scrollChild: The child list to scroll.
 *   The height set to be numItems * itemHeight.
 * - getScrollHeight: Returns the height of the scroll port.
 * - getScrollPos: Returns the current scroll position.
 */
function Recyclist(config) {
  var template = config.template;
  this.itemHeight = template.clientHeight;

  // The template should not be rendered, so take it out of the document.
  template.parentNode.removeChild(template);

  // Remove its id attribute now so that that attribute doesn't get cloned
  // into all the items.
  template.removeAttribute('id');

  var header = config.headerTemplate;
  if (header) {
    this.headerHeight = header.clientHeight;
    header.parentNode.removeChild(header);
    header.removeAttribute('id');
  }

  for (var i in config) {
    this[i] = config[i];
  }

  this.visibleMultiplier = this.visibleMultiplier || 1;
  this.asyncMultiplier = this.asyncMultiplier || 4;

  this.addItems(config.numItems);
}

Recyclist.prototype = {

  /**
   * Indexed by item number, the item elements currently in the DOM.
   * @type {Object}
   */
  domItems: {},

  /**
   * The header elements currently in the DOM.
   * @type {Object}
   */
  domHeaders: {},

  /**
   * A mapping of index to item data.
   * Each index is an array that contains the scroll position, and whether
   * or not the item is a header. E.g., {0: [0, true], 1: [20, false]}
   */
  positions: {},

  lastScrollPos: 0,

  /**
   * Initializes recyclist, adds listeners, and renders items.
   */
  init: function() {
    this.scrollParent.addEventListener('scroll', this);
    this.scrollParent.addEventListener('resize', this);

    // Synchronously generate all items that are immediately or nearly visible
    this.generate(this.visibleMultiplier);

    this.fix();
  },

  /**
   * Searches for the startIndex using a binary search.
   * @param {Number} startPos The start of the display port.
   */
  searchStartIndex: function(startPos) {
    var min = 0;
    var max = Object.keys(this.positions).length - 1;
    var index;
    var current;
    var currentHeight;

    while (min <= max) {
      index = (min + max) / 2 | 0;
      current = this.positions[index][0];
      currentHeight = (this.positions[index][0] ?
        this.headerHeight : this.itemHeight);

      if (current > startPos) {
        max = index - 1;
      } else if (current < startPos - currentHeight) {
        min = index + 1;
      } else {
        return index;
      }
    }

    return min;
  },

  /**
   * Searches for the endIndex using a binary search.
   * @param {Number} endPos The end of the display port.
   */
  searchEndIndex: function(endPos) {
    var min = 1;
    var max = Object.keys(this.positions).length - 1;
    var index;
    var current;
    var currentHeight;

    while (min <= max) {
      index = (min + max) / 2 | 0;
      current = this.positions[index][0];
      currentHeight = (this.positions[index][0] ?
        this.headerHeight : this.itemHeight);

      if (current < endPos) {
        min = index + 1;
      } else if (current > endPos + currentHeight) {
        max = index - 1;
      } else {
        return index;
      }
    }

    return max;
  },

  /**
   * Sets the number of items in the list.
   * Calculates sizing and position information for all items.
   */
  addItems: function(numItems) {
    var start = Object.keys(this.positions).length;
    var i = start;
    for (i = start; i < start + numItems; i++) {
      var position;
      var isHeader = this.isHeader(i);
      var lastPosition = this.positions[i - 1];

      if (lastPosition) {
        position = lastPosition[0] +
          (lastPosition[1] ? this.headerHeight : this.itemHeight);
      } else {
        position = 0;
      }

      this.positions[i] = [position, isHeader];
    }
    this.numItems += numItems;

    this.scrollChild.style.height = this.positions[i - 1][0] + this.itemHeight + 'px';
  },

  /**
   * Generates all items within a multiplier of the display port size.
   * If you only wanted to render what's on screen, you would just pass 1.
   * @param {Integer} multiplier A multiplier of the display port size.
   */
  generate: function(multiplier) {
    var itemHeight = this.itemHeight;
    var scrollPos = this.getScrollPos();
    var scrollPortHeight = this.getScrollHeight();

    // Determine which items we *need* to have in the DOM. displayPortMargin
    // is somewhat arbitrary. If there is fast async scrolling, increase
    // multiplier to make sure more items can be prerendered. If
    // populate triggers slow async activity (e.g. image loading or
    // database queries to fill in an item), increase multiplier
    // to reduce the likelihood of the user seeing incomplete items.
    var displayPortMargin = multiplier * scrollPortHeight;

    var startPosition = Math.max(0,
      (scrollPos - displayPortMargin));

    var endPosition = Math.max(0,
      (scrollPos + scrollPortHeight + displayPortMargin));

    // Use a binary search to find the startIndex.
    // The start index is the first item before our display port.
    var startIndex = this.searchStartIndex(startPosition);

    // Use a binary search to find the endIndex.
    // The endIndex is the first item after our display port.
    var endIndex = this.searchEndIndex(endPosition);

    // indices of items which are eligible for recycling
    var recyclableItems = [];
    for (var i in this.domItems) {
      if (i < startIndex || i >= endIndex) {
        if (this.forget) {
          this.forget(this.domItems[i], i);
        }
        recyclableItems.push(i);
      }
    }
    recyclableItems.sort();

    var recyclableHeaders = [];
    for (var i in this.domHeaders) {
      if (i < startIndex || i >= endIndex) {
        recyclableHeaders.push(i);
      }
    }
    recyclableHeaders.sort();

    for (i = startIndex; i <= endIndex; ++i) {
      if (this.domItems[i] || this.domHeaders[i]) {
        continue;
      }

      var recycleIndex;
      var item;
      var isHeader = this.isHeader(i);
      if (!isHeader && recyclableItems.length > 0) {
        // Delete the item furthest from the direction we're scrolling toward
        if (scrollPos >= this.lastScrollPos) {
          recycleIndex = recyclableItems.shift();
        } else {
          recycleIndex = recyclableItems.pop();
        }

        item = this.domItems[recycleIndex];
        delete this.domItems[recycleIndex];

        // NOTE: We must detach and reattach the node even though we are
        //       essentially just repositioning it.  This avoid pathological
        //       layerization behavior where each item gets assigned its own
        //       layer.
        this.scrollChild.removeChild(item);

      } else if (isHeader && recyclableHeaders.length > 0) {
        // Delete the item furthest from the direction we're scrolling toward
        if (scrollPos >= this.lastScrollPos) {
          recycleIndex = recyclableHeaders.shift();
        } else {
          recycleIndex = recyclableHeaders.pop();
        }

        item = this.domHeaders[recycleIndex];
        delete this.domHeaders[recycleIndex];

        // NOTE: We must detach and reattach the node even though we are
        //       essentially just repositioning it.  This avoid pathological
        //       layerization behavior where each item gets assigned its own
        //       layer.
        this.scrollChild.removeChild(item);
      } else {
        if (isHeader) {
          item = this.headerTemplate.cloneNode(true);
        } else {
          item = this.template.cloneNode(true);
        }
      }
      this.populate(item, i);
      item.style.top = this.positions[i][0] + 'px';

      if (isHeader) {
        this.domHeaders[i] = item;
      } else {
        this.domItems[i] = item;
      }
      this.scrollChild.appendChild(item);
    }
  },

  /**
   * Generates items for the viewport and sets lastScrollPos
   */
  fix: function() {
    this.generate(this.asyncMultiplier);
    this.lastScrollPos = this.getScrollPos();
  },

  handleEvent: function() {
    this.fix();
  },

  /**
   * Returns true if an item at a given index is a header.
   */
  isHeader: function() {
    return false;
  },

};
