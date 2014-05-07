'use strict';
/* global SpatialNavigator */

requireApp('homescreen-stingray/js/vendor/evt.js');
requireApp('homescreen-stingray/js/spatial_navigator.js');

suite('SpatialNavigator', function() {

  suite('predefined list - without overlapping', function() {
    var spatialNav;
    /*  |--------------------------|
     *  | item 1 | item 2 | item 3 |
     *  |--------+--------+--------|
     *  | item 4 | item 5 | item 6 |
     *  |--------+--------+--------|
     *  | item 7 | item 8 | item 9 |
     *  |--------+--------+--------|
     *
     */
     var itemList = [
        {'id': 'item1', 'left': 100, 'top': 100, 'width': 100, 'height': 100},
        {'id': 'item2', 'left': 200, 'top': 100, 'width': 100, 'height': 100},
        {'id': 'item3', 'left': 300, 'top': 100, 'width': 100, 'height': 100},
        {'id': 'item4', 'left': 100, 'top': 200, 'width': 100, 'height': 100},
        {'id': 'item5', 'left': 200, 'top': 200, 'width': 100, 'height': 100},
        {'id': 'item6', 'left': 300, 'top': 200, 'width': 100, 'height': 100},
        {'id': 'item7', 'left': 100, 'top': 300, 'width': 100, 'height': 100},
        {'id': 'item8', 'left': 200, 'top': 300, 'width': 100, 'height': 100},
        {'id': 'item9', 'left': 300, 'top': 300, 'width': 100, 'height': 100}
      ];
    setup(function() {
      spatialNav = new SpatialNavigator(itemList);
    });

    test('focus without argument', function(done) {
      spatialNav.on('focus', function(elm) {
        assert.equal(elm.id, 'item1');
        done();
      });
      spatialNav.focus();
    });

    test('focus item 5', function(done) {
      spatialNav.on('focus', function(elm) {
        assert.equal(elm.id, 'item5');
        done();
      });
      spatialNav.focus(itemList[4]);
    });

    test('move up on item 5', function() {
      spatialNav.focus(itemList[4]);
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item2');
    });

    test('move right on item 5', function() {
      spatialNav.focus(itemList[4]);
      spatialNav.move('right');
      assert.equal(spatialNav.getFocusedElement().id, 'item6');
    });

    test('move down on item 5', function() {
      spatialNav.focus(itemList[4]);
      spatialNav.move('down');
      assert.equal(spatialNav.getFocusedElement().id, 'item8');
    });

    test('move left on item 5', function() {
      spatialNav.focus(itemList[4]);
      spatialNav.move('left');
      assert.equal(spatialNav.getFocusedElement().id, 'item4');
    });

    test('move up on item 2', function() {
      spatialNav.focus(itemList[1]);
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item2');
    });

    test('move right on item 6', function() {
      spatialNav.focus(itemList[5]);
      spatialNav.move('right');
      assert.equal(spatialNav.getFocusedElement().id, 'item6');
    });

    test('move down on item 8', function() {
      spatialNav.focus(itemList[7]);
      spatialNav.move('down');
      assert.equal(spatialNav.getFocusedElement().id, 'item8');
    });

    test('move left on item 4', function() {
      spatialNav.focus(itemList[3]);
      spatialNav.move('left');
      assert.equal(spatialNav.getFocusedElement().id, 'item4');
    });
  });

  suite('predefined list - without overlapping 2', function() {
    var spatialNav;
    /*  |--------------------------|
     *  | item 1 |        | item 2 |
     *  |--------+--------+--------|
     *  |        | item 3 |        |
     *  |--------+--------+--------|
     *  | item 4 |        | item 5 |
     *  |--------+--------+--------|
     *
     */
     var itemList = [
        {'id': 'item1', 'left': 100, 'top': 100, 'width': 100, 'height': 100},
        {'id': 'item2', 'left': 300, 'top': 100, 'width': 100, 'height': 100},
        {'id': 'item3', 'left': 200, 'top': 200, 'width': 100, 'height': 100},
        {'id': 'item4', 'left': 100, 'top': 300, 'width': 100, 'height': 100},
        {'id': 'item5', 'left': 300, 'top': 300, 'width': 100, 'height': 100}
      ];
    setup(function() {
      spatialNav = new SpatialNavigator(itemList);
    });

    test('move up on item 3', function() {
      spatialNav.focus(itemList[2]);
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item1');
    });

    test('move right on item 3', function() {
      spatialNav.focus(itemList[2]);
      spatialNav.move('right');
      assert.equal(spatialNav.getFocusedElement().id, 'item2');
    });

    test('move down on item 3', function() {
      spatialNav.focus(itemList[2]);
      spatialNav.move('down');
      assert.equal(spatialNav.getFocusedElement().id, 'item4');
    });

    test('move left on item 3', function() {
      spatialNav.focus(itemList[2]);
      spatialNav.move('left');
      assert.equal(spatialNav.getFocusedElement().id, 'item1');
    });
  });


  suite('predefined list with overlapping', function() {
    var spatialNav;
    /*  |----item 2---------------|
     *  | item 1
     *  |--------+------ item 3 ---|
     *  |        | item 5 | item 6 |
     *  item 4 --+--------+--------|
     *  | item 7 |        |
     *  |--------+--------+---item 8
     *
     */
     var itemList = [
        {'id': 'item1', 'left': 100, 'top': 100, 'width': 100, 'height': 100},
        {'id': 'item2', 'left': 50, 'top': 50, 'width': 100, 'height': 100},
        {'id': 'item3', 'left': 250, 'top': 150, 'width': 100, 'height': 100},
        {'id': 'item4', 'left': 50, 'top': 250, 'width': 100, 'height': 100},
        {'id': 'item5', 'left': 200, 'top': 200, 'width': 100, 'height': 100},
        {'id': 'item6', 'left': 300, 'top': 200, 'width': 100, 'height': 100},
        {'id': 'item7', 'left': 100, 'top': 300, 'width': 100, 'height': 100},
        {'id': 'item8', 'left': 350, 'top': 350, 'width': 100, 'height': 100}
      ];
    setup(function() {
      spatialNav = new SpatialNavigator(itemList);
    });

    test('move up on item 5', function() {
      spatialNav.focus(itemList[4]);
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item3');
    });

    test('move up on item 7', function() {
      spatialNav.focus(itemList[6]);
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item4');
    });

    test('move up on item 6', function() {
      spatialNav.focus(itemList[5]);
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item3');
    });

    test('move up on item 1', function() {
      spatialNav.focus(itemList[0]);
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item2');
    });

    test('move right on item 5', function() {
      spatialNav.focus(itemList[4]);
      spatialNav.move('right');
      assert.equal(spatialNav.getFocusedElement().id, 'item3');
    });

    test('move left on item 5', function() {
      spatialNav.focus(itemList[4]);
      spatialNav.move('left');
      assert.equal(spatialNav.getFocusedElement().id, 'item4');
    });

    test('move down on item 5', function() {
      spatialNav.focus(itemList[4]);
      spatialNav.move('down');
      assert.equal(spatialNav.getFocusedElement().id, 'item7');
    });

    test('move down on item 4', function() {
      spatialNav.focus(itemList[3]);
      spatialNav.move('down');
      assert.equal(spatialNav.getFocusedElement().id, 'item7');
    });
  });

  suite('dynamic group', function() {
    var spatialNav;

    setup(function() {
      spatialNav = new SpatialNavigator([
        {'id': 'item-center',
         'left': 200, 'top': 200, 'width': 100, 'height': 100}
      ]);
      spatialNav.focus();
    });

    test('add top and move up', function() {
      assert.isTrue(spatialNav.add(
        {'id': 'item-top',
         'left': 200, 'top': 100, 'width': 100, 'height': 100}));
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item-top');
    });

    test('add left and move left', function() {
      assert.isTrue(spatialNav.add(
        {'id': 'item-left',
         'left': 100, 'top': 200, 'width': 100, 'height': 100}));
      spatialNav.move('left');
      assert.equal(spatialNav.getFocusedElement().id, 'item-left');
    });

    test('add bottom and move down', function() {
      assert.isTrue(spatialNav.add(
        {'id': 'item-bottom',
         'left': 200, 'top': 300, 'width': 100, 'height': 100}));
      spatialNav.move('down');
      assert.equal(spatialNav.getFocusedElement().id, 'item-bottom');
    });

    test('add right and move right', function() {
      assert.isTrue(spatialNav.add(
        {'id': 'item-right',
         'left': 300, 'top': 200, 'width': 100, 'height': 100}));
      spatialNav.move('right');
      assert.equal(spatialNav.getFocusedElement().id, 'item-right');
    });

    test('add left-top and move top', function() {
      assert.isTrue(spatialNav.add(
        {'id': 'item-lt',
         'left': 100, 'top': 100, 'width': 100, 'height': 100}));
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item-lt');
    });

    test('add right-top and move top', function() {
      assert.isTrue(spatialNav.add(
        {'id': 'item-rt',
         'left': 300, 'top': 100, 'width': 100, 'height': 100}));
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item-rt');
    });

    test('add twice', function() {
      var item = {'id': 'item',
                  'left': 300, 'top': 100, 'width': 100, 'height': 100};
      assert.isTrue(spatialNav.add(item));
      assert.isFalse(spatialNav.add(item));
    });

    test('add, remove, move', function() {
      var item = {'id': 'item',
                  'left': 300, 'top': 100, 'width': 100, 'height': 100};
      assert.isTrue(spatialNav.add(item));
      assert.isTrue(spatialNav.remove(item));
      spatialNav.move('up');
      assert.equal(spatialNav.getFocusedElement().id, 'item-center');
    });
  });
});
