/* global GaiaGrid */
/* global GridView */

/**
 * The GaiaGrid component is a helper to display grid-like results.
 * You can find this component used in places like the homescreen and search
 * application.
 */
window.GaiaGrid = (function(win) {
  'use strict';

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

  /**
   * Helper for GridView.prototype.clear
   */
  proto.clear = function() {
    this._grid.clear.apply(this._grid, arguments);
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
   * Reoves placeholders from the list until we encounter a divider. Once we
   * find a divider, we return that item. If we do not find a divider, we
   * return null. This is useful for operations which append to the end of the
   * items array as we always have a divider at the end of the list, but often
   * want to add to the last group.
   */
  proto.removeUntilDivider = function() {
    var items = this._grid.items;
    for (var i = items.length - 1; i > 0; i--) {
      var item = items[i];
      if (item instanceof GaiaGrid.Placeholder) {
        items.pop();
        continue;
      } else if (item instanceof GaiaGrid.Divider) {
        return items.pop();
      } else {
        return null;
      }
    }
  };

  /**
   * Sets an element that should be considered as obscuring the top of the grid
   * when in edit mode.
   */
  proto.setEditHeaderElement = function(element) {
    if (this._grid.dragdrop) {
      this._grid.dragdrop.editHeaderElement = element;
    }
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
      if (items[i] instanceof GaiaGrid.Mozapp) {
        return i;
      }
    }
  };

  proto.removeNonVisualElements = function() {

    var nonVisualElements = [GaiaGrid.Placeholder];

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
    '<content></content>';

  // Register and return the constructor
  return document.registerElement('gaia-grid', { prototype: proto });
})(window);
