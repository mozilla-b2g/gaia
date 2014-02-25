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

  for (var i in config) {
    this[i] = config[i];
  }

  this.visibleMultiplier = this.visibleMultiplier || 1;
  this.asyncMultiplier = this.asyncMultiplier || 4;
}

Recyclist.prototype = {

  /**
   * Indexed by item number, the item elements currently in the DOM.
   * @type {Array}
   */
  domItems: [],

  lastScrollPos: 0,

  /**
   * Initializes recyclist, adds listeners, and renders items.
   */
  init: function() {
    // Make sure we can scroll the required distance.
    this.scrollChild.style.height = this.itemHeight * this.numItems + 'px';

    this.scrollParent.addEventListener('scroll', this);
    this.scrollParent.addEventListener('resize', this);

    this.fix();
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
    var startIndex = Math.max(0,
      Math.floor((scrollPos - displayPortMargin) / itemHeight));

    var endIndex = Math.min(this.numItems,
      Math.ceil((scrollPos + scrollPortHeight + displayPortMargin) /
        itemHeight));

    // indices of items which are eligible for recycling
    var recyclableItems = [];
    for (var i in this.domItems) {
      if (i < startIndex || i >= endIndex) {
        this.forget(this.domItems[i], i);
        recyclableItems.push(i);
      }
    }

    recyclableItems.sort();

    for (i = startIndex; i < endIndex; ++i) {
      if (this.domItems[i]) {
        continue;
      }
      var item;
      if (recyclableItems.length > 0) {
        var recycleIndex;
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
      } else {
        item = this.template.cloneNode(true);
      }
      this.populate(item, i);
      item.style.top = i * itemHeight + 'px';
      this.domItems[i] = item;
      this.scrollChild.appendChild(item);
    }
  },

  /**
   * Immediately renders items within the display port.
   * Also generates items outside the display port on next tick.
   */
  fix: function() {
    // Synchronously generate all items that are immediately or nearly visible
    this.generate(this.visibleMultiplier);

    // Asynchronously generate the other items for the displayport
    setTimeout(function() {
      this.generate(this.asyncMultiplier);
      this.lastScrollPos = this.getScrollPos();
    }.bind(this));
  },

  handleEvent: function() {
    this.fix();
  }

};
