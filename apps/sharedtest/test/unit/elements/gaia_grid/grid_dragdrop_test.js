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
    document.body.innerHTML = '<div id="zoom"><div class="arrows">' +
    '</div><div class="curtain"></div><div class="indicator"></div></div>';
    this.container = document.createElement('div');

    this.container.innerHTML = '<gaia-grid dragdrop group></gaia-grid>';
    document.body.appendChild(this.container);
    grid = this.container.firstElementChild._grid;

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
    this.sinon.clock.tick(grid.dragdrop.touchEndFinishDelay);

    grid.dragdrop.handleEvent({ type: 'transitionend' });

    assert.equal(grid.items[0].name, 'second');
    assert.equal(grid.items[1].name, 'first');
  });

  test('attention requested if item doesn\'t move', function() {
    var firstBookmark = grid.items[0].element;
    var requestAttentionStub = sinon.stub(grid.items[0], 'requestAttention');

    firstBookmark.dispatchEvent(new CustomEvent('contextmenu',
      {bubbles: true}));
    grid.dragdrop.handleEvent({
      type: 'touchend',
      stopImmediatePropagation: function() {},
      preventDefault: function() {}
    });

    this.sinon.clock.tick(grid.dragdrop.touchEndFinishDelay);
    grid.dragdrop.handleEvent({ type: 'transitionend' });

    assert.ok(requestAttentionStub.called);
    requestAttentionStub.restore();
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

  test('long-press listener not activated during dragging', function() {
    grid.dragdrop.icon = grid.items[0];
    grid.dragdrop.handleEvent({
      type: 'touchstart',
      touches: [ { pageX: 0, pageY: 0, screenX: 0, screenY: 0 } ],
      target: grid.items[0].element
    });
    assert.equal(grid.dragdrop.longPressTimeout, null);
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
    var requestAttentionStub =
      sinon.stub(GaiaGrid.Divider.prototype, 'requestAttention');
    var dividers = countDividers();
    var subject = grid.dragdrop;

    // The current positions are first, second, placeholder, divider,
    subject.icon = grid.items[1];
    subject.createNewDivider(grid.items[3]);

    // After creating the new group, there should be one extra divider.
    assert.equal(countDividers(), dividers + 1);

    // And attention should have been requested on the new divider.
    var newDivider;
    for (var i = grid.items.length - 1; i >= 0; i--) {
      if (grid.items[i].detail.type === 'divider') {
        newDivider = grid.items[i];
        break;
      }
    }
    assert.ok(requestAttentionStub.calledOn(newDivider));
    requestAttentionStub.restore();
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

  test('check no visual indicator for redundant moves', function() {
    // Each of these dividers represents a group with one item, so dragging any
    // group or item should mark the previous group and the group itself as
    // invalid drop targets
    var divider1 = grid.items[3];
    var divider2 = grid.items[7];
    var divider3 = grid.items[9];

    var subject = grid.dragdrop;
    subject.icon = divider2;
    subject.begin({});

    assert.isTrue(divider1.element.classList.contains('invalid-drop'));
    assert.isTrue(divider2.element.classList.contains('invalid-drop'));
    assert.isFalse(divider3.element.classList.contains('invalid-drop'));

    subject.finish();
    subject.finalize();

    // Check that dragging the first divider over the top of the container
    // wouldn't cause a redundant move.
    subject.icon = divider1;
    subject.begin({});
    subject.handleEvent({
      type: 'touchmove',
      touches: [{
        pageX: 0,
        pageY: -100
      }]
    });

    assert.isFalse(grid.element.classList.contains('hover-over-top'));

    // Tidy up
    subject.finish();
    subject.finalize();

    assert.isFalse(divider1.element.classList.contains('invalid-drop'));
    assert.isFalse(divider2.element.classList.contains('invalid-drop'));
  });

  test('empty groups remain during dragging', function() {
    // Each of the three bookmark items is now in a group by itself. Dragging
    // any of them outside of that group should leave an empty group, until
    // dragging finishes (and then that group should disappear).

    // Test this by dragging the first and last items into the middle group,
    // testing that the empty group remains until the drag finishes.
    var firstIcon = grid.items[0];
    var middleIcon = grid.items[4];
    var lastIcon = grid.items[8];

    // Expand the last divider
    grid.items[9].expand();
    this.sinon.clock.tick(20);

    var nDividers = countDividers();
    var subject = grid.dragdrop;
    subject.icon = firstIcon;
    subject.target = firstIcon.element;
    subject.begin({});
    subject.rearrange(middleIcon);
    assert.equal(nDividers, countDividers());
    subject.finish();
    subject.finalize();
    assert.equal(nDividers - 1, countDividers());

    nDividers = countDividers();
    subject.icon = lastIcon;
    subject.target = lastIcon.element;
    subject.begin({});
    subject.rearrange(firstIcon);
    assert.equal(nDividers, countDividers());
    subject.finish();
    subject.finalize();
    assert.equal(nDividers - 1, countDividers());
  });
});
