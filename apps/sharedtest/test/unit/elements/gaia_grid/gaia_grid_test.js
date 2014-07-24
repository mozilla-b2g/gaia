'use strict';

require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/js/grid_zoom.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/shared/elements/gaia_grid/script.js');

suite('GaiaGrid', function() {
  setup(function() {
    this.container = document.createElement('div');
  });

  suite('features', function() {
    test('default features', function() {
      this.container.innerHTML = '<gaia-grid></gaia-grid>';
      var grid = this.container.firstElementChild._grid;
      assert.equal(grid.dragdrop, undefined);
      assert.equal(grid.zoom, undefined);
      assert.ok(grid.layout);
    });

    test('/w dragdrop', function() {
      this.container.innerHTML = '<gaia-grid dragdrop></gaia-grid>';
      var grid = this.container.firstElementChild._grid;
      assert.ok(grid.dragdrop);
      assert.equal(grid.zoom, undefined);
      assert.ok(grid.layout);
    });

    test('/w zoom', function() {
      this.sinon.stub(window, 'GridZoom');
      this.container.innerHTML = '<gaia-grid zoom></gaia-grid>';
      var grid = this.container.firstElementChild._grid;
      assert.ok(grid.zoom);
      assert.equal(grid.dragdrop, undefined);
      assert.ok(grid.layout);
    });
  });

  suite('items', function() {
    var element;

    var fakeBookmarkItem = {
      identifier: 'http://mozilla.org',
      detail: {
        type: 'bookmark',
        id: 'http://mozilla.org',
        url: 'http://mozilla.org'
      }
    };

    var fakeBookmarkItem2 = {
      identifier: 'http://tid.es',
      detail: {
        type: 'bookmark',
        id: 'http://tid.es',
        url: 'http://tid.es'
      }
    };

    var fakeBookmarkItem3 = {
      identifier: 'http://firefoxos.com',
      detail: {
        type: 'bookmark',
        id: 'http://firefoxos.com',
        url: 'http://firefoxos.com'
      }
    };

    setup(function() {
      this.container.innerHTML = '<gaia-grid></gaia-grid>';
      element = this.container.firstElementChild;
    });

    test('adding an item increments count', function() {
      var itemLength = element.getItems().length;
      element.add(fakeBookmarkItem);
      assert.equal(element.getItems().length, itemLength + 1);
    });

    test('null items do not change item count', function() {
      var itemLength = element.getItems().length;
      element.add(null);
      assert.equal(element.getItems().length, itemLength);
    });

    test('removeItemByIndex', function() {
      var itemLength = element.getItems().length;
      element.add(fakeBookmarkItem2);
      element.add(fakeBookmarkItem3);
      assert.equal(element.getItems().length, itemLength + 2);
      element.removeItemByIndex(0);
      assert.equal(element.getItems().length, itemLength + 1);
    });

    test('clear will dereference item elements', function() {
      element.clear();
      var domEl = document.createElement('div');
      element.appendChild(domEl);
      var myObj = fakeBookmarkItem;
      myObj.element = domEl;
      element.add(myObj);
      element.clear();
      assert.equal(myObj.element, null);
    });

    test('items with null identifiers are not added to the grid', function() {
      element.clear();
      var oldIdentifier = fakeBookmarkItem.identifier;
      fakeBookmarkItem.identifier = null;
      element.add(fakeBookmarkItem);
      assert.equal(element.getItems().length, 0);
      fakeBookmarkItem.identifier = oldIdentifier;
    });
  });

});
