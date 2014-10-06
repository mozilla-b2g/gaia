'use strict';

/* global AlternativesCharMenuView, IMERender */

require('/js/views/alternatives_char_menu.js');
require('/js/render.js');

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

  var fakeLayoutRenderingManager;

  var rootElement = document.createElement('div');
  document.body.appendChild(rootElement);

  var key = {
    dummy: 'dummy'
  };

  setup(function(){
    fakeLayoutRenderingManager = {
      domObjectMap: new WeakMap(),
      getTargetObject: function(elem){
        return this.domObjectMap.get(elem);
      }
    };

    IMERender.init(fakeLayoutRenderingManager);

    var keyElem = document.createElement('button');
    IMERender.setDomElemTargetObject(keyElem, key);
  });

  suite('basic show/hide testing', function() {
    setup(function() {
      menu = new AlternativesCharMenuView(rootElement, altChars, renderer);
    });

    test(' > show()', function() {
      menu.show(key);

      assert.equal(rootElement.firstElementChild,
                   menu.getMenuContainer(),
                   'Menu was not inserted into root Element');
      menu.hide();
    });

    test(' > hide()', function() {
      menu.show(key);
      menu.hide();

      assert.equal(rootElement.childElementCount, 0,
                   'Menu was not removed from root Element!');
    });
  });

  suite(' > getMenuTarget() - single row case', function() {
    var childObjs = [];

    setup(function() {
      fakeMenu = document.createElement('div');
      fakeMenu.style.position = 'absolute';
      fakeMenu.style.fontSize = 0;

      childObjs = [];

      // insert 3 keys for 1 row
      for (var i = 0; i < 3; i++) {
        var child = document.createElement('div');
        child.style.display = 'inline-block';
        child.style.width = KEY_WIDTH + 'px';
        child.style.height = KEY_HEIGHT + 'px';

        fakeMenu.appendChild(child);

        var childObj = {
          dummy: i
        };

        IMERender.setDomElemTargetObject(child, childObj);

        childObjs.push(childObj);
      }

      rootElement.appendChild(fakeMenu);

      menu = new AlternativesCharMenuView(rootElement, altChars, renderer);
      menu.renderingManager = fakeLayoutRenderingManager;

      this.sinon.stub(menu, 'getMenuContainer');
      menu.getMenuContainer.returns(fakeMenu);

      this.sinon.stub(menu, 'getBoundingClientRect',
        fakeMenu.getBoundingClientRect.bind(fakeMenu));

      this.sinon.stub(menu, 'getLineHeight');
      menu.getLineHeight.returns(KEY_HEIGHT);

      var keyElem = document.createElement('button');
      IMERender.setDomElemTargetObject(keyElem, key);
    });

    teardown(function() {
      menu.hide();
    });

    test('the first element', function() {
      menu.show(key);

      var target = menu.getMenuTarget(0, 0);
      var expectedTarget = childObjs[0];

      assert.equal(target, expectedTarget, 'Should map to the first element');
    });

    test('the second element', function() {
      menu.show(key);

      var target = menu.getMenuTarget(fakeMenu.offsetLeft + KEY_WIDTH, 0);
      var expectedTarget = childObjs[1];

      assert.equal(target, expectedTarget, 'Should map to the second element');
    });

    test('the last element', function() {
      menu.show(key);

      var target = menu.getMenuTarget(fakeMenu.offsetLeft +
                                      fakeMenu.offsetWidth, 0);
      var expectedTarget = childObjs[2];

      assert.equal(target, expectedTarget, 'Should map to the last element');
    });
  });

  suite(' > getMenuTarget() - 2 row case', function() {
    var childObjs = [];

    setup(function() {
      fakeMenu = document.createElement('div');
      fakeMenu.style.position = 'absolute';
      fakeMenu.style.width = KEY_WIDTH * 3 + 'px';  // 2 row

      childObjs = [];

      // insert 6 keys for 2 rows
      for (var i = 0; i < 6; i++) {
         var child = document.createElement('div');
         child.style.display = 'inline-block';
         child.style.width = KEY_WIDTH + 'px';
         child.style.height = KEY_HEIGHT + 'px';

         fakeMenu.appendChild(child);

        var childObj = {
          dummy: i
        };

        IMERender.setDomElemTargetObject(child, childObj);

        childObjs.push(childObj);
      }

      rootElement.appendChild(fakeMenu);

      menu = new AlternativesCharMenuView(rootElement, altChars, renderer);
      menu.renderingManager = fakeLayoutRenderingManager;

      this.sinon.stub(menu, 'getMenuContainer');
      menu.getMenuContainer.returns(fakeMenu);

      this.sinon.stub(menu, 'getBoundingClientRect',
        fakeMenu.getBoundingClientRect.bind(fakeMenu));

      this.sinon.stub(menu, 'getLineHeight');
      menu.getLineHeight.returns(KEY_HEIGHT);

      var keyElem = document.createElement('button');
      IMERender.setDomElemTargetObject(keyElem, key);
    });

    teardown(function() {
      menu.hide();
    });

    test('2 row - the first element', function() {
      menu.show(key);

      var target = menu.getMenuTarget(0, fakeMenu.offsetTop +
                                         fakeMenu.offsetHeight);
      var expectedTarget = childObjs[0];

      assert.equal(target, expectedTarget, 'Should map to the first element');
    });

    test('2 row - the second element', function() {
      menu.show(key);

      var target = menu.getMenuTarget(fakeMenu.offsetLeft + KEY_WIDTH,
                                      fakeMenu.offsetTop +
                                      fakeMenu.offsetHeight);

      var expectedTarget = childObjs[1];

      assert.equal(target, expectedTarget, 'Should map to the second element');
    });

    test('2 row - the 4th element in the upper row', function() {
      menu.show(key);

      var target = menu.getMenuTarget(0, 0);
      var expectedTarget = childObjs[3];

      assert.equal(target, expectedTarget, 'Should map to the 4th element');
    });
  });

  suite(' > getMenuTarget() - 2 row with one empty cell case', function() {
    var childObjs = [];

    setup(function() {
      fakeMenu = document.createElement('div');
      fakeMenu.style.position = 'absolute';
      fakeMenu.style.width = KEY_WIDTH * 3 + 'px';  // 2 row

      childObjs = [];

      // insert 5 keys for 2 rows
      // (would result in 3x2 cells with top top-right one being empty)
      for (var i = 0; i < 5; i++) {
         var child = document.createElement('div');
         child.style.display = 'inline-block';
         child.style.width = KEY_WIDTH + 'px';
         child.style.height = KEY_HEIGHT + 'px';

         fakeMenu.appendChild(child);

        var childObj = {
          dummy: i
        };

        IMERender.setDomElemTargetObject(child, childObj);

        childObjs.push(childObj);
      }

      rootElement.appendChild(fakeMenu);

      menu = new AlternativesCharMenuView(rootElement, altChars, renderer);
      menu.renderingManager = fakeLayoutRenderingManager;

      this.sinon.stub(menu, 'getMenuContainer');
      menu.getMenuContainer.returns(fakeMenu);

      this.sinon.stub(menu, 'getBoundingClientRect',
        fakeMenu.getBoundingClientRect.bind(fakeMenu));

      this.sinon.stub(menu, 'getLineHeight');
      menu.getLineHeight.returns(KEY_HEIGHT);

      var keyElem = document.createElement('button');
      IMERender.setDomElemTargetObject(keyElem, key);
    });

    teardown(function() {
      menu.hide();
    });

    test('2 row - the empty element', function() {
      menu.show(key);

      var target = menu.getMenuTarget(fakeMenu.offsetLeft + KEY_WIDTH * 2, 0);
      var expectedTarget = childObjs[4];

      assert.equal(target, expectedTarget, 'Should map to the last element');
    });
  });
});
