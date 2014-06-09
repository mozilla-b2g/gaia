'use strict';
/* global Bookmark */

require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/js/grid_zoom.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/divider.js');
require('/shared/elements/gaia_grid/js/items/icon.js');
require('/shared/elements/gaia_grid/js/items/bookmark.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/shared/elements/gaia_grid/script.js');

suite('GaiaGrid > DragDrop', function() {
  var grid;
  var dragdrop;

  var stubPage1 = {
    name: 'first',
    id: 1,
    icon: 'no',
    url: 'http://mozilla.org'
  };

  var stubPage2 = {
    name: 'second',
    id: 1,
    icon: 'no',
    url: 'http://mozilla.org'
  };

  suiteSetup(function() {
    document.body.innerHTML = '<div id="zoom"><div class="arrows">' +
    '</div><div class="curtain"></div><div class="indicator"></div></div>';
    this.container = document.createElement('div');

    this.container.innerHTML = '<gaia-grid dragdrop></gaia-grid>';
    document.body.appendChild(this.container);
    grid = this.container.firstElementChild._grid;
    dragdrop = this.container.firstElementChild._grid;

    grid.add(new Bookmark(stubPage1));
    grid.add(new Bookmark(stubPage2));
    grid.render();
  });

  test('changes position of icons', function() {
    var firstBookmark = document.querySelector('.icon');
    firstBookmark.dispatchEvent(new CustomEvent('contextmenu',
      {bubbles: true}));
    assert.ok(grid.dragdrop.inEditMode);
    assert.ok(firstBookmark.classList.contains('active'));
    assert.equal(grid.items[0].name, 'first');

    var moveTo = grid.layout.gridItemWidth + 1;

    grid.dragdrop.handleEvent({
      type: 'touchmove',
      touches: [{
        pageX: moveTo,
        pageY: 0
      }]
    });

    grid.dragdrop.handleEvent({
      type: 'touchend',
      stopImmediatePropagation: function() {},
      preventDefault: function() {}
    });

    assert.equal(grid.items[0].name, 'second');
    assert.equal(grid.items[1].name, 'first');
  });

  test('rearrange uses reference of icon for position', function() {
    var subject = grid.dragdrop;
    subject.icon = grid.items[0];

    // The current positions are second -> first -> placeholder
    // Simulate a drop past the placeholder (index 2).
    subject.rearrange(2);

    assert.equal(grid.items[0].name, 'first');
    assert.equal(grid.items[1].name, 'second');
  });
});
