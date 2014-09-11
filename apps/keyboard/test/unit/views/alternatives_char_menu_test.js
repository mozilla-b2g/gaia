'use strict';

/* global AlternativesCharMenuView */

require('/js/views/alternatives_char_menu.js');

suite('Views > AlternativesCharMenuView', function() {
  var menu = null;
  var renderer = {
    buildKey: function(alt) {
      var button = document.createElement('button');
      button.textContent = alt;
      return button;
    }
  };

  var KEY_WIDTH = 30;
  var KEY_HEIGHT = 20;
  var altChars = ['a', 'b', 'c'];
  var fakeMenu;

  var rootElement = document.createElement('div');
  document.body.appendChild(rootElement);

  suite('basic show/hide testing', function() {
    setup(function() {
      menu = new AlternativesCharMenuView(rootElement, altChars, renderer);
    });

    test(' > show()', function() {
      var key = document.createElement('button');
      menu.show(key);

      assert.equal(rootElement.firstElementChild,
                   menu.getMenuContainer(),
                   'Menu was not inserted into root Element');
      menu.hide();
    });

    test(' > hide()', function() {
      var key = document.createElement('button');
      menu.show(key);
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

      // insert 6 keys for 2 rows
      for (var i = 0; i < 3; i++) {
         var child = document.createElement('div');
         child.style.display = 'inline-block';
         child.style.width = KEY_WIDTH + 'px';
         child.style.height = KEY_HEIGHT + 'px';

         fakeMenu.appendChild(child);
      }

      rootElement.appendChild(fakeMenu);

      menu = new AlternativesCharMenuView(rootElement, altChars, renderer);

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
      var key = document.createElement('button');
      menu.show(key);

      var target = menu.getMenuTarget(0, 0);
      var expectedTarget = menu.getMenuContainer().children[0];

      assert.equal(target, expectedTarget,
                   'Should map to the first element');
    });

    test('the second element', function() {
      var key = document.createElement('button');
      menu.show(key);

      var target = menu.getMenuTarget(fakeMenu.offsetLeft +   KEY_WIDTH, 0);
      var expectedTarget = menu.getMenuContainer().children[1];

      assert.equal(target, expectedTarget,
                   'Should map to the second element');
    });

    test('the last element', function() {
      var key = document.createElement('button');
      menu.show(key);

      var target = menu.getMenuTarget(fakeMenu.offsetLeft +
                                      fakeMenu.offsetWidth, 0);
      var expectedTarget = menu.getMenuContainer().children[2];

      assert.equal(target, expectedTarget,
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

      menu = new AlternativesCharMenuView(rootElement, altChars, renderer);

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
      var key = document.createElement('button');
      menu.show(key);

      var target = menu.getMenuTarget(0, fakeMenu.offsetTop +
                                         fakeMenu.offsetHeight);
      var expectedTarget = menu.getMenuContainer().children[0];

      assert.equal(target, expectedTarget,
                   'Should map to the first element');
    });

    test('2 row - the second element', function() {
      var key = document.createElement('button');
      menu.show(key);

      var target = menu.getMenuTarget(fakeMenu.offsetLeft + KEY_WIDTH,
                                      fakeMenu.offsetTop +
                                      fakeMenu.offsetHeight);

      var expectedTarget = menu.getMenuContainer().children[1];

      assert.equal(target, expectedTarget,
                   'Should map to the second element');
    });

    test('2 row - the 4th element in the upper row', function() {
      var key = document.createElement('button');
      menu.show(key);

      var target = menu.getMenuTarget(0, 0);
      var expectedTarget = menu.getMenuContainer().children[3];

      assert.equal(target, expectedTarget,
                   'Should map to the 4th element');
    });
  });
});
