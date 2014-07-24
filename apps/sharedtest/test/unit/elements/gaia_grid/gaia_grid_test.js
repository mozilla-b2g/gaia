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

var mocksHelperForGrid = new MocksHelper([
  'LazyLoader'
]).init();

suite('GaiaGrid', function() {

  mocksHelperForGrid.attachTestHelpers();

  setup(function() {
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
  });

  suite('items', function() {
    var element;

    setup(function() {
      this.container.innerHTML = '<gaia-grid></gaia-grid>';
      element = this.container.firstElementChild;
    });

    test('adding an item increments count', function() {
      var itemLength = element.getItems().length;
      element.add('hello');
      assert.equal(element.getItems().length, itemLength + 1);
    });

    test('null items do not change item count', function() {
      var itemLength = element.getItems().length;
      element.add(null);
      assert.equal(element.getItems().length, itemLength);
    });

    test('removeItemByIndex', function() {
      var itemLength = element.getItems().length;
      element.add(1);
      element.add(2);
      element.add(3);
      assert.equal(element.getItems().length, itemLength + 3);
      element.removeItemByIndex(0);
      assert.equal(element.getItems().length, itemLength + 2);
    });

    test('clear will dereference item elements', function() {
      var domEl = document.createElement('div');
      element.appendChild(domEl);
      var myObj = {element: domEl};
      element.add(myObj);
      element.clear();
      assert.equal(myObj.element, null);
    });
  });

});
