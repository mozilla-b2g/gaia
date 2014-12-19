'use strict';
/* global GaiaGrid, MocksHelper */

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/js/grid_zoom.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/divider.js');
require('/shared/elements/gaia_grid/js/items/mozapp.js');
require('/shared/elements/gaia_grid/js/items/bookmark.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/shared/elements/gaia_grid/js/items/group.js');

var mocksHelperForDragDrop = new MocksHelper([
  'LazyLoader'
]).init();

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
    id: 2,
    icon: 'no',
    url: 'http://mozilla.org/2'
  };

  var stubPage3 = {
    name: 'third',
    id: 3,
    icon: 'no',
    url: 'http://mozilla.org/3'
  };

  var countDividers = function() {
    var nDividers = 0;
    for (var i = 0, iLen = grid.items.length; i < iLen; i++) {
      if (grid.items[i].detail.type === 'divider') {
        nDividers ++;
      }
    }
    return nDividers;
  };

  mocksHelperForDragDrop.attachTestHelpers();

  suiteSetup(function() {
    document.head.innerHTML += '<meta name="urlbar-control">';
    document.body.innerHTML = `<div class="arrows"></div>
      <div class="curtain"></div>
      <div class="indicator"></div>`;
    this.container = document.createElement('div');

    this.container.innerHTML = '<gaia-grid dragdrop group></gaia-grid>';
    document.body.appendChild(this.container);
    grid = this.container.firstElementChild._grid;
    dragdrop = this.container.firstElementChild._grid;

    grid.add(new GaiaGrid.Bookmark(stubPage1));
    grid.add(new GaiaGrid.Bookmark(stubPage2));
    grid.render();
  });

  setup(function() {
    this.sinon.useFakeTimers();
  });

  test('changes position of icons', function() {
    var firstBookmark = document.querySelector('.icon');
    firstBookmark.dispatchEvent(new CustomEvent('contextmenu',
      {bubbles: true}));
    assert.ok(grid.dragdrop.inEditMode);
    assert.ok(firstBookmark.classList.contains('active'));
    assert.equal(grid.items[0].name, 'first');

    var moveTo = grid.layout.gridItemWidth + 1;

    // XXX: Stub the x/y adjustments, we should probably not depend on this
    grid.dragdrop.xAdjust = 0;
    grid.dragdrop.yAdjust = 0;

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

    grid.dragdrop.handleEvent({ type: 'transitionend' });

    assert.equal(grid.items[0].name, 'second');
    assert.equal(grid.items[1].name, 'first');
  });

  test('cleanup if the touch gesture is canceled', function() {
    var firstBookmark = grid.items[0].element;
    firstBookmark.dispatchEvent(new CustomEvent('contextmenu',
      {bubbles: true}));
    assert.ok(grid.dragdrop.inEditMode);
    assert.ok(firstBookmark.classList.contains('active'));

    grid.dragdrop.handleEvent({
      type: 'touchcancel',
      stopImmediatePropagation: function() {},
      preventDefault: function() {}
    });

    grid.dragdrop.handleEvent({ type: 'transitionend' });

    assert.isFalse(firstBookmark.classList.contains('active'));
  });

  test('rearrange uses reference of icon for position', function() {
    var subject = grid.dragdrop;
    subject.icon = grid.items[0];

    // The current positions are second -> first -> placeholder
    // Simulate a drop onto the second item (index 2).
    subject.rearrange(grid.items[2]);

    assert.equal(grid.items[0].name, 'first');
    assert.equal(grid.items[1].name, 'second');
  });

  test('create new groups by dropping items at the end', function() {
    var dividers = countDividers();
    var subject = grid.dragdrop;

    // The current positions are first, second, placeholder, divider,
    subject.icon = grid.items[1];
    subject.createNewDivider(grid.items[3]);

    // After creating the new group, there should be one extra divider.
    assert.equal(countDividers(), dividers + 1);
  });

  test('rearrange collapsed group before expanded group', function() {
    var divider = grid.items[7];
    assert.equal(divider.detail.type, 'divider');
    assert.ok(divider.element.classList.contains('group'));

    divider.collapse();
    this.sinon.clock.tick(20);
    assert.equal(divider.detail.collapsed, true);

    var subject = grid.dragdrop;
    subject.icon = divider;
    subject.rearrange(grid.items[0]);

    assert.equal(grid.items[0].name, 'second');
    assert.equal(grid.items[2].name, 'first');
  });

  test('rearrange collapsed group after expanded group', function() {
    var divider = grid.items[1];
    assert.equal(divider.detail.type, 'divider');

    var subject = grid.dragdrop;
    subject.icon = divider;
    subject.createNewDivider(grid.items[grid.items.length - 1]);

    assert.equal(grid.items[0].name, 'first');
    assert.equal(grid.items[4].name, 'second');
  });

  test('rearrange collapsed group before collapsed group', function() {
    var divider = grid.items[3];
    assert.equal(divider.detail.type, 'divider');
    divider.collapse();
    this.sinon.clock.tick(20);

    divider = grid.items[3];
    assert.equal(divider.detail.type, 'divider');

    var subject = grid.dragdrop;
    subject.icon = divider;
    subject.rearrange(grid.items[0]);

    assert.equal(grid.items[0].name, 'second');
    assert.equal(grid.items[2].name, 'first');
  });

  test('rearrange collapsed group after collapsed group', function() {
    var divider = grid.items[1];
    assert.equal(divider.detail.type, 'divider');

    var subject = grid.dragdrop;
    subject.icon = divider;
    subject.createNewDivider(grid.items[grid.items.length - 1]);

    assert.equal(grid.items[0].name, 'first');
    assert.equal(grid.items[2].name, 'second');
  });

  test('create new group between groups', function() {
    var divider = grid.items[1];
    assert.equal(divider.detail.type, 'divider');
    divider.expand();
    this.sinon.clock.tick(20);

    divider = grid.items[3];
    assert.equal(divider.detail.type, 'divider');
    divider.expand();
    this.sinon.clock.tick(20);

    // Add a new item to test adding groups between groups
    grid.add(new GaiaGrid.Bookmark(stubPage3), 0);
    grid.render();

    // Now simulate dragging the first icon over the first divider and check
    // that a new divider is created, and that the new app is in it
    var dividers = countDividers();

    divider = grid.items[3];
    assert.equal(divider.detail.type, 'divider');

    var subject = grid.dragdrop;
    subject.icon = grid.items[0];
    subject.createNewDivider(divider);

    assert.equal(countDividers(), dividers + 1);
    assert.equal(grid.items[4].name, 'third');
  });
});
