/* global GaiaGrid */
/* global MocksHelper */

'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/js/grid_zoom.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/divider.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/shared/elements/gaia_grid/js/items/group.js');

var mocksHelperForGrid = new MocksHelper([
  'LazyLoader'
]).init();

suite('GaiaGrid', function() {

  mocksHelperForGrid.attachTestHelpers();

  setup(function() {
    this.sinon.useFakeTimers();
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
  });

  teardown(function() {
    document.body.removeChild(this.container);
  });

  suite('features', function() {
    test('default features', function() {
      this.container.innerHTML = '<gaia-grid></gaia-grid>';
      var grid = this.container.firstElementChild._grid;
      // Some features are loaded after rendering like dragdrop
      grid.render();
      assert.equal(grid.dragdrop, undefined);
      assert.equal(grid.zoom, undefined);
      assert.ok(grid.layout);
    });

    test('/w dragdrop', function() {
      this.container.innerHTML = '<gaia-grid dragdrop></gaia-grid>';
      var grid = this.container.firstElementChild._grid;
      grid.render();
      assert.ok(grid.dragdrop);
      assert.equal(grid.zoom, undefined);
      assert.ok(grid.layout);
    });

    test('/w zoom', function() {
      this.sinon.stub(window, 'GridZoom');
      this.container.innerHTML = '<gaia-grid zoom></gaia-grid>';
      var grid = this.container.firstElementChild._grid;
      grid.render();
      assert.ok(grid.zoom);
      assert.equal(grid.dragdrop, undefined);
      assert.ok(grid.layout);
    });

    test('/w dragdrop and disable-sections', function() {
      this.container.innerHTML =
        '<gaia-grid dragdrop disable-sections></gaia-grid>';
      var grid = this.container.firstElementChild._grid;
      grid.render();
      assert.ok(grid.config.features.disableSections);
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
      },
      setPosition: function() {},
      setCoordinates: function() {},
      render: function() {}
    };

    var fakeBookmarkItem2 = {
      identifier: 'http://tid.es',
      detail: {
        type: 'bookmark',
        id: 'http://tid.es',
        url: 'http://tid.es'
      },
      setPosition: function() {},
      setCoordinates: function() {},
      render: function() {}
    };

    var fakeBookmarkItem3 = {
      identifier: 'http://firefoxos.com',
      detail: {
        type: 'bookmark',
        id: 'http://firefoxos.com',
        url: 'http://firefoxos.com'
      },
      setPosition: function() {},
      setCoordinates: function() {},
      render: function() {}
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

    test('appendItem adds before divider', function() {
      element.clear();

      var divider = new GaiaGrid.Divider();
      element.add(fakeBookmarkItem);
      element.add(divider);

      var itemLength = element.getItems().length;
      element.appendItemToExpandedGroup(fakeBookmarkItem2);

      var items = element.getItems();
      assert.equal(items.length, itemLength + 1);
      assert.equal(items[items.length - 1], divider);
    });

    test('appendItemToExpandedGroup expands collapsed divider', function() {
      element.clear();

      var divider = new GaiaGrid.Divider();
      element.add(fakeBookmarkItem);
      element.add(divider);

      var itemLength = element.getItems().length;
      divider.detail.collapsed = true;
      element.appendItemToExpandedGroup(fakeBookmarkItem2);
      this.sinon.clock.tick(20);

      var items = element.getItems();
      assert.ok(items.length > itemLength);
      assert.notEqual(divider.detail.collapsed, true);
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

    test('height with text-rows attribute', function() {
      this.container.innerHTML = '<gaia-grid></gaia-grid>';
      var gridEl = this.container.firstElementChild;
      var grid = this.container.firstElementChild._grid;
      var defaultItemHeight = grid.layout.gridItemHeight;
      assert.ok(defaultItemHeight > 0);

      gridEl.setAttribute('text-rows', 3);
      var threeRowHeight = grid.layout.gridItemHeight;
      assert.ok(threeRowHeight > defaultItemHeight);

      gridEl.setAttribute('text-rows', 4);
      var fourRowHeight = grid.layout.gridItemHeight;
      assert.ok(fourRowHeight > threeRowHeight);
      assert.equal(fourRowHeight - threeRowHeight,
        threeRowHeight - defaultItemHeight,
        'additional text rows match height');
    });
  });

});

