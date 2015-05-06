'use strict';

/* global SwipeablePanelView */
require('/js/views/base_view.js');
require('/js/views/key_view.js');
require('/js/views/emoji_key_view.js');
require('/js/views/swipeable_panel_view.js');

suite('Views > SwipeablePanelView', function() {
  var panelView = null;
  var viewManager = {
    registerView: sinon.stub()
  };

  var layout = {
    panelKeys: []
  };

  var sectionCount = 4;

  for (var i = 0; i < 18 * sectionCount; i++) {
    layout.panelKeys.push({ value: i, type: 'emoji' });
  }

  function sendTouchEvent(type, node, coords) {
    if (typeof document.createTouch === 'function') {
      var touch = document.createTouch(window, node, 1,
        coords.x, coords.y, coords.x, coords.y);
      var touchList = document.createTouchList(touch);

      var evt = document.createEvent('TouchEvent');
      evt.initTouchEvent(type, true, true, window,
        0, false, false, false, false,
        touchList, touchList, touchList);
      node.dispatchEvent(evt);
    }
  }

  setup(function() {
    var options = {
    };

    panelView = new SwipeablePanelView(layout, options,
      viewManager);
  });

  suite('some basic functions',  function() {
    test('> render() ', function() {
      assert.equal(panelView.element, null);

      panelView.render();
      assert.notEqual(panelView.element, null);
    });

    test('> render() check indicator elements', function() {
      panelView.render();

      var indicators = panelView.element.querySelectorAll('.section-indicator');
      assert.equal(indicators.length, sectionCount);

      assert.ok(indicators[0].classList.contains('active'));
    });

    test('> move to the next section', function() {
      panelView.render();

      panelView.gotoSection(1);
      var indicators = panelView.element.querySelectorAll('.section-indicator');

      assert.isFalse(indicators[0].classList.contains('active'));
      assert.ok(indicators[1].classList.contains('active'));
    });
  });

  suite('utilize different KeyView type',  function() {
    test('> render() with KeyView ', function() {
      var layout = {
        panelKeys: [{value: 'key1'}, {value: 'key2'}]
      };

      var panelView = new SwipeablePanelView(layout, {}, viewManager);
      panelView.render();

      var keyView = panelView.element.querySelector('button.keyboard-key');
      assert.notEqual(keyView, null);
    });

    test('> render() with EmojiKeyView ', function() {
      var layout = {
        panelKeys: [{value: 'key1', type: 'emoji'},
                    {value: 'key2', type: 'emoji'}]
      };

      var panelView = new SwipeablePanelView(layout, {}, viewManager);
      panelView.render();

      var keyView = panelView.element.querySelector('button.emoji');
      assert.notEqual(keyView, null);
    });
  });

  suite('Render different number of elements',  function() {
    test('> render() with no elements', function() {
      var layout = {
        panelKeys: [{value: 'key1'}, {value: 'key2'}]
      };

      panelView = new SwipeablePanelView(layout, {}, viewManager);
      panelView.render();

      assert.equal(panelView.sections[1], null);
    });

    test('> render() with 2 emoji elements', function() {
      var layout = {
        panelKeys: [{value: 'key1', type: 'emoji'},
                    {value: 'key2', type: 'emoji'}]
      };

      panelView = new SwipeablePanelView(layout, {}, viewManager);
      panelView.render();

      var section = panelView.sections[0];
      var keys = section.querySelectorAll('button.emoji');
      assert.equal(keys.length, 2);

      var dummyElement = section.querySelector('span');
      assert.equal(dummyElement.style.flexGrow, 4);
    });

    test('> render() one section at a time', function() {
      var layout = {
        panelKeys: []
      };

      for (var i = 0; i < 20; i++) {
        layout.panelKeys.push({value: 'key' + i, type: 'emoji'});
      }

      panelView = new SwipeablePanelView(layout, {}, viewManager);
      panelView.render();

      var keys = panelView.sections[0].querySelectorAll('button.emoji');
      assert.equal(keys.length, 18);

      keys = panelView.sections[1].querySelectorAll('button.emoji');
      assert.equal(keys.length, 2);

      assert.equal(keys[0].textContent, 'key18');
    });
  });

  suite('panning',  function() {
    var rootElement = document.createElement('div');

    setup(function() {
      document.body.appendChild(rootElement);
      var options = {
        totalWidth: 320
      };

      panelView = new SwipeablePanelView(layout, options,
        viewManager);
    });

    teardown(function() {
      rootElement.innerHTML = '';
    });

    test('> panning the first section - forward', function() {
      panelView.render();

      assert.equal(panelView.sections[0].style.transform, '');

      sendTouchEvent('touchstart', panelView.element, {x: 20, y: 0});
      sendTouchEvent('touchmove', panelView.element, {x: 0, y: 0});

      assert.equal(panelView.sections[0].style.transform, 'translateX(-20px)');
      assert.equal(panelView.sections[1].style.transform, 'translateX(300px)');
    });

    test('> panning the first section - backward', function() {
      panelView.render();

      assert.equal(panelView.sections[0].style.transform, '');

      sendTouchEvent('touchstart', panelView.element, {x: 0, y: 0});
      sendTouchEvent('touchmove', panelView.element, {x: 20, y: 0});

      assert.equal(panelView.sections[0].style.transform, '');
    });

    test('> panning the second section - forward', function() {
      panelView.render();

      panelView.gotoSection(1);

      sendTouchEvent('touchstart', panelView.element, {x: 20, y: 0});
      sendTouchEvent('touchmove', panelView.element, {x: 0, y: 0});

      assert.equal(panelView.sections[1].style.transform, 'translateX(-20px)');
      assert.equal(panelView.sections[2].style.transform, 'translateX(300px)');
    });

    test('> panning the second section - backward', function() {
      panelView.render();

      panelView.gotoSection(1);

      sendTouchEvent('touchstart', panelView.element, {x: 20, y: 0});
      sendTouchEvent('touchmove', panelView.element, {x: 40, y: 0});

      assert.equal(panelView.sections[0].style.transform, 'translateX(-300px)');
      assert.equal(panelView.sections[1].style.transform, 'translateX(20px)');
    });

    test('> panning the last section - forward', function() {
      panelView.render();

      panelView.gotoSection(sectionCount - 1);

      sendTouchEvent('touchstart', panelView.element, {x: 20, y: 0});
      sendTouchEvent('touchmove', panelView.element, {x: 0, y: 0});

      assert.equal(panelView.sections[sectionCount - 1].style.transform,
                   'translateX(0px)');
    });

    test('> panning the last section - backward', function() {
      panelView.render();

      panelView.gotoSection(sectionCount - 1);

      sendTouchEvent('touchstart', panelView.element, {x: 20, y: 0});
      sendTouchEvent('touchmove', panelView.element, {x: 40, y: 0});

      assert.equal(panelView.sections[sectionCount - 1].style.transform,
                   'translateX(20px)');
      assert.equal(panelView.sections[sectionCount - 2].style.transform,
                   'translateX(-300px)');
    });

    test('> swiping through the first section < threshold', function() {
      panelView.render();

      rootElement.appendChild(panelView.element);

      sendTouchEvent('touchstart', panelView.element, {x: 20, y: 0});
      sendTouchEvent('touchmove', panelView.element, {x: 0, y: 0});

      assert.equal(panelView.sections[0].style.transform, 'translateX(-20px)');

      sendTouchEvent('touchend', panelView.element, {x: 0, y: 0});

      assert.equal(panelView.sections[0].style.transform, 'translateX(0px)');
    });

    test('> swiping through the first section > threshold', function() {
      panelView.render();

      rootElement.appendChild(panelView.element);

      sendTouchEvent('touchstart', panelView.element, {x: 30, y: 0});
      sendTouchEvent('touchmove', panelView.element, {x: 0, y: 0});

      assert.equal(panelView.sections[0].style.transform, 'translateX(-30px)');

      sendTouchEvent('touchend', panelView.element, {x: 0, y: 0});

      assert.equal(panelView.sections[0].style.transform, 'translateX(-320px)');
      assert.equal(panelView.sections[1].style.transform, 'translateX(0px)');
    });

    test('> swiping back to the first section, > threshold', function() {
      panelView.render();
      rootElement.appendChild(panelView.element);

      panelView.gotoSection(1);

      sendTouchEvent('touchstart', panelView.element, {x: 20, y: 0});
      sendTouchEvent('touchmove', panelView.element, {x: 50, y: 0});

      assert.equal(panelView.sections[1].style.transform, 'translateX(30px)');

      sendTouchEvent('touchend', panelView.element, {x: 50, y: 0});

      assert.equal(panelView.sections[0].style.transform, 'translateX(0px)');
      assert.equal(panelView.sections[1].style.transform, 'translateX(320px)');
    });
  });
});
