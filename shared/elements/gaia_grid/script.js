/* global Divider */
/* global GridView */
/* global Placeholder */
/* global Icon */

/**
 * The GaiaGrid component is a helper to display grid-like results.
 * You can find this component used in places like the homescreen and search
 * application.
 */
window.GaiaGrid = (function(win) {
  'use strict';

  var nonVisualElements = [Placeholder];

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaGridBaseurl ||
    '/shared/elements/gaia_grid/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();
    this._template = template.content.cloneNode(true);
    this._styleHack();

    // Todo: render in the shadowRoot
    // By changing the element to this._template we should be able to render
    // to the shadowRoot, although some things are not yet working.
    this._grid = new GridView({
      element: this,
      features: {
        dragdrop: this.getAttribute('dragdrop') !== null,
        zoom: this.getAttribute('zoom') !== null
      }
    });

    shadow.appendChild(this._template);
  };

  /**
   * Helper for GridView.prototype.add
   */
  proto.add = function() {
    this._grid.add.apply(this._grid, arguments);
  };

  proto.clear = function() {
    this._grid.items = [];
    this._grid.icons = {};
    var children = this.childNodes;
    var i = children.length;
    while (i--) {
      if (children[i].nodeName !== 'STYLE') {
        this.removeChild(children[i]);
      }
    }
  };

  /**
   * Helper for GridView.prototype.render
   */
  proto.render = function() {
    this._grid.layout.calculateSize();
    this._grid.render.apply(this._grid, arguments);
  };

  /**
   * Helper for GridView.prototype.start
   */
  proto.start = function() {
    this._grid.start.apply(this._grid, arguments);
  };

  /**
   * Helper for GridView.prototype.stop
   */
  proto.stop = function() {
    this._grid.stop.apply(this._grid, arguments);
  };

  /**
   * Adds an item to the grid.
   * Items (only dividers currently) are like icons, but do not need a
   * mapping to each one for click handling.
   * @param {String} identifier
   * @param {Object} obj
   */
  proto.addItem = function(item) {
    if (item) {
      this._grid.items.push(item);
    }
  };

  /**
   * Adds an icon to the grid.
   * Icons need an identifier to for object lookup during event bubbling.
   * @param {String} identifier
   * @param {Object} obj
   */
  proto.addIcon = function(identifier, obj) {
    this._grid.icons[identifier] = obj;
    this._grid.items.push(obj);
  };

  /**
   * Returns a reference of the grid icons.
   */
  proto.getIcons = function() {
    return this._grid.icons;
  };

  /**
   * Returns a copy of the grid items.
   */
  proto.getItems = function() {
    return this._grid.items;
  };

  proto.getIcon = function(identifier) {
    return this._grid.icons[identifier];
  };

  /**
   * Removes an icon by identifier.
   * @param {String} identifier
   */
  proto.removeIconByIdentifier = function(identifier) {
    delete this._grid.icons[identifier];
  };

  /**
   * Removes an item by an index.
   * @param {Integer} itemIndex
   */
  proto.removeItemByIndex = function(itemIndex) {
    this._grid.items.splice(itemIndex, 1);
  };

  /**
   * Returns the last item if a divider, otherwise returns null.
   * This is useful for operations which append to the end of the items array
   * as we always have a divider at the end of the list, but often want
   * to add to the last group.
   */
  proto.getLastIfDivider = function() {
    var items = this._grid.items;
    var lastItem = items[items.length - 1];
    if (lastItem instanceof Divider) {
      var divider = items.pop();
      return divider;
    }
    return null;
  };

  Object.defineProperty(proto, 'maxIconSize', {
    get: function() {
      return this._grid.layout.gridMaxIconSize;
    }
  });

  /**
   * Returns the position of the last item which is not a divider
   */
  proto.getIndexLastIcon = function() {
    var items = this._grid.items;
    for (var i = this._grid.items.length - 1; i >= 0; i--) {
      if ((items[i] instanceof Icon)) {
        return i;
      }
    }
  };

  proto.removeNonVisualElements = function() {

    function isNonVisual(elem) {
      var retVal = false;
      for (var i = 0, iLen = nonVisualElements.length; i < iLen && !retVal;
           i++) {
        retVal = elem instanceof nonVisualElements[i];
      }
      return retVal;
    }

    var i = 0 ;
    var iLen = this._grid.items.length;
    while (i < iLen) {
      this._grid.items[i].detail.index = i;
      if (isNonVisual(this._grid.items[i])) {
        this._grid.items.splice(i,1);
        iLen -= 1;
      } else {
        i += 1;
      }
    }
  };

  /**
   * Move item on orig position to dst position
   * This function only moves elements on the items array, without calling
   * render.
   * @param {number} orig Element's position to move
   * @param {number} orig New position of the item
   */
  proto.moveTo = function(orig, dst) {
    this._grid.items.splice(dst, 0,
      this._grid.items.splice(orig, 1)[0]);
  };

  /**
   * We clone the scoped stylesheet and append
   * it outside the shadow-root so that we can
   * style projected <content> without the need
   * of the :content selector.
   *
   * When the :content selector lands, we won't
   * need this hack anymore and can style projected
   * <content> from stylesheets within the shadow root.
   * (bug 992249)
   *
   * @private
   */
  proto._styleHack = function() {
    var style = this._template.querySelector('style');
    this.appendChild(style.cloneNode(true));
  };

  var stylesheet = baseurl + 'style.css';
  var template = document.createElement('template');
  template.innerHTML = '<style scoped>' +
    '@import url(' + stylesheet + ');</style>' +
    '<content select=".icons"></content>';

  // Register and return the constructor
  return document.registerElement('gaia-grid', { prototype: proto });
})(window);
