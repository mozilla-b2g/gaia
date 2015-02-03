'use strict';

/* global AlternativesCharMenuView */

require('/js/views/alternatives_char_menu_view.js');
require('/js/views/key_view.js');

suite('Views > AlternativesCharMenuView', function() {
  var menu = null;
  var options = {
  };

  var KEY_WIDTH = 30;
  var KEY_HEIGHT = 20;
  var altChars = ['a', 'b', 'c'];
  var fakeMenu;

  var rootElement = document.createElement('div');
  document.body.appendChild(rootElement);

  var dummyKeyElement = document.createElement('button');

  var viewManager = {
    registerView: sinon.stub()
  };

  suite('basic show/hide testing', function() {
    setup(function() {
      menu = new AlternativesCharMenuView(rootElement, altChars, options,
                                          viewManager);
    });

    test(' > show()', function() {
      menu.show(dummyKeyElement);

      assert.equal(rootElement.firstElementChild,
                   menu.getMenuContainer(),
                   'Menu was not inserted into root Element');
      menu.hide();
    });

    test(' > hide()', function() {
      menu.show(dummyKeyElement);
      menu.hide();

      assert.equal(rootElement.childElementCount, 0,
                   'Menu was not removed from root Element!');
    });
  });

  suite(' > getMenuTarget() - single row case', function() {
    setup(function() {
      fakeMenu = document.createElement('div');
      fakeMenu.style.position = 'absolute';
      fakeMenu.style.fontSize = 0;

      // insert 3 keys for 1 row
      for (var i = 0; i < 3; i++) {
        var child = document.createElement('div');
        child.style.display = 'inline-block';
        child.style.width = KEY_WIDTH + 'px';
        child.style.height = KEY_HEIGHT + 'px';

        fakeMenu.appendChild(child);
      }

      rootElement.appendChild(fakeMenu);

      menu = new AlternativesCharMenuView(rootElement, altChars, options,
                                          viewManager);

      this.sinon.stub(menu, 'getMenuContainer');
      menu.getMenuContainer.returns(fakeMenu);

      this.sinon.stub(menu, 'getBoundingClientRect',
        fakeMenu.getBoundingClientRect.bind(fakeMenu));

      this.sinon.stub(menu, 'getLineHeight');
      menu.getLineHeight.returns(KEY_HEIGHT);
    });

    teardown(function() {
      menu.hide();
    });

    test('the first element', function() {
      menu.show(dummyKeyElement);

      var rect = fakeMenu.getBoundingClientRect();
      var target = menu.getMenuTarget(rect.left, rect.top);

      assert.equal(target, menu.altKeyTargets[0],
                   'Should map to the first element');
    });

    test('the second element', function() {
      menu.show(dummyKeyElement);

      var rect = fakeMenu.getBoundingClientRect();
      var target = menu.getMenuTarget(fakeMenu.offsetLeft + KEY_WIDTH +
        rect.left, rect.top);

      assert.equal(target, menu.altKeyTargets[1],
                   'Should map to the second element');
    });

    test('the last element', function() {
      menu.show(dummyKeyElement);

      var rect = fakeMenu.getBoundingClientRect();
      var target = menu.getMenuTarget(fakeMenu.offsetLeft +
                                      fakeMenu.offsetWidth +
                                      rect.left, rect.top);

      assert.equal(target, menu.altKeyTargets[menu.altKeyTargets.length -1],
                   'Should map to the last element');
    });
  });

  suite(' > getMenuTarget() - 2 row case', function() {
    setup(function() {
      fakeMenu = document.createElement('div');
      fakeMenu.style.position = 'absolute';
      fakeMenu.style.width = KEY_WIDTH * 3 + 'px';  // 2 row

      // insert 6 keys for 2 rows
      for (var i = 0; i < 6; i++) {
         var child = document.createElement('div');
         child.style.display = 'inline-block';
         child.style.width = KEY_WIDTH + 'px';
         child.style.height = KEY_HEIGHT + 'px';

         fakeMenu.appendChild(child);
      }

      rootElement.appendChild(fakeMenu);

      var altChars = ['a', 'b', 'c', 'd', 'e', 'f'];
      menu = new AlternativesCharMenuView(rootElement, altChars, options,
                                          viewManager);

      this.sinon.stub(menu, 'getMenuContainer');
      menu.getMenuContainer.returns(fakeMenu);

      this.sinon.stub(menu, 'getBoundingClientRect',
        fakeMenu.getBoundingClientRect.bind(fakeMenu));

      this.sinon.stub(menu, 'getLineHeight');
      menu.getLineHeight.returns(KEY_HEIGHT);
    });

    teardown(function() {
      menu.hide();
    });

    test('2 row - the first element', function() {
      menu.show(dummyKeyElement);

      var rect = fakeMenu.getBoundingClientRect();

      var target = menu.getMenuTarget(rect.left, fakeMenu.offsetTop +
                                         fakeMenu.offsetHeight +
                                         rect.top);

      assert.equal(target, menu.altKeyTargets[0],
                   'Should map to the first element');
    });

    test('2 row - the second element', function() {
      menu.show(dummyKeyElement);

      var rect = fakeMenu.getBoundingClientRect();
      var target = menu.getMenuTarget(fakeMenu.offsetLeft + KEY_WIDTH +
                                      rect.left,
                                      fakeMenu.offsetTop +
                                      fakeMenu.offsetHeight +
                                      rect.top);

      assert.equal(target, menu.altKeyTargets[1],
                   'Should map to the second element');
    });

    test('2 row - the 4th element in the upper row', function() {
      menu.show(dummyKeyElement);

      var rect = fakeMenu.getBoundingClientRect();
      var target = menu.getMenuTarget(rect.left, rect.top);

      assert.equal(target, menu.altKeyTargets[3],
                   'Should map to the 4th element');
    });
  });

  suite(' > getMenuTarget() - 2 row with one empty cell case', function() {
    setup(function() {
      fakeMenu = document.createElement('div');
      fakeMenu.style.position = 'absolute';
      fakeMenu.style.width = KEY_WIDTH * 3 + 'px';  // 2 row

      // insert 5 keys for 2 rows
      // (would result in 3x2 cells with top top-right one being empty)
      for (var i = 0; i < 5; i++) {
         var child = document.createElement('div');
         child.style.display = 'inline-block';
         child.style.width = KEY_WIDTH + 'px';
         child.style.height = KEY_HEIGHT + 'px';

         fakeMenu.appendChild(child);
      }

      rootElement.appendChild(fakeMenu);

      var altChars = ['a', 'b', 'c', 'd', 'e'];
      menu = new AlternativesCharMenuView(rootElement, altChars, options,
                                          viewManager);

      this.sinon.stub(menu, 'getMenuContainer');
      menu.getMenuContainer.returns(fakeMenu);

      this.sinon.stub(menu, 'getBoundingClientRect',
        fakeMenu.getBoundingClientRect.bind(fakeMenu));

      this.sinon.stub(menu, 'getLineHeight');
      menu.getLineHeight.returns(KEY_HEIGHT);
    });

    teardown(function() {
      menu.hide();
    });

    test('2 row - the empty element', function() {
      menu.show(dummyKeyElement);

      var rect = fakeMenu.getBoundingClientRect();
      var target = menu.getMenuTarget(fakeMenu.offsetLeft + rect.left +
        KEY_WIDTH * 2, rect.top);

      assert.equal(target, menu.altKeyTargets[4],
                   'Should map to the last element');
    });
  });

  suite(' isMenuTarget()', function() {
    test('isMenuTarget() returns true', function() {
      assert.isTrue(menu.isMenuTarget(menu.altKeyTargets[0]));
    });

    test('isMenuTarget() returns false', function() {
      assert.isFalse(menu.isMenuTarget({dummy: 'dummy'}));
    });
  });
});
