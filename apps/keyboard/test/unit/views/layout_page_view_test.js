'use strict';
/* global LayoutPageView, KeyboardEvent */

require('/js/views/key_view.js');
require('/js/views/handwriting_pad_view.js');
require('/js/views/layout_page_view.js');

suite('Views > LayoutPageView', function() {

  var dummyLayout = {
    width: 2,
    keys: [
      [{ value: 'a' }, { value: 'b' }]
    ]
  };

  test(' > show() ', function() {
    var pageView = new LayoutPageView(dummyLayout, {});
    pageView.render();

    pageView.show();

    var container = pageView.element;
    assert.equal(container.dataset.active, 'true');
  });

  test(' > hide() ', function() {
    var pageView = new LayoutPageView(dummyLayout, {});
    pageView.render();

    pageView.hide();

    var container = pageView.element;
    assert.equal(container.dataset.active, null);
  });

  suite(' > render()', function() {
    test('Should add last-row class to last row', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a' }, { value: 'b' }],
          [{ value: 'c' }, { value: 'd' }],
          [{ value: 'e' }, { value: 'f' }]
        ]
      };

      var pageView = new LayoutPageView(layout, {});
      pageView.render();

      var container = pageView.element;

      var rows = container.querySelectorAll('.keyboard-row');
      assert.equal(rows.length, 3);
      assert.equal(rows[2].classList.contains('keyboard-last-row'), true);
      var keys = container.querySelectorAll('.keyboard-key');
      assert.equal(keys.length, 6);
    });

    test('layout.keyClassName should be added to all keys', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a' }, { value: 'b' }]
        ],
        keyClassName: 'c9'
      };

      var pageView = new LayoutPageView(layout, {});
      pageView.render();

      var container = pageView.element;
      assert.equal(container.querySelectorAll('.keyboard-key').length, 2);
      assert.equal(container.querySelectorAll('.keyboard-key.c9').length, 2);
    });

    test('rowLayoutWidth should be sum of all key ratios', function() {
      var layout = {
        width: 9,
        keys: [
          [{ value: 'a', ratio: 3 }, { value: 'b', ratio: 2 }],
          [{ value: 'a' }, { value: 'b' }],
          [{ value: 'a', ratio: 5 }, { value: 'b' }]
        ]
      };

      var pageView = new LayoutPageView(layout, {});
      pageView.render();

      var container = pageView.element;
      var rows = container.querySelectorAll('.keyboard-row');
      assert.equal(rows[0].dataset.layoutWidth, 5);
      assert.equal(rows[1].dataset.layoutWidth, 2);
      assert.equal(rows[2].dataset.layoutWidth, 6);
    });

    test('Keycode should be set', function() {
      var layout = {
        width: 9,
        keys: [
          [{ value: 'a', keyCode: 3 }, { value: 'b', keyCode: 98 }]
        ]
      };

      var pageView = new LayoutPageView(layout, {});
      pageView.render();

      var container = pageView.element;

      var keys = container.querySelectorAll('.keyboard-key');
      assert.equal(keys[0].dataset.keycode, 3);
      assert.equal(keys[1].dataset.keycode, 98);
    });

    test('On uppercase flag, uppercase on keys, ' +
          'no lowercase class on container', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a', uppercaseValue: 'A' },
           { value: 'b', uppercaseValue: 'B' }]
        ]
      };

      var pageView = new LayoutPageView(layout, {});
      pageView.render();
      pageView.toggleCase({upperCase: true});

      var container = pageView.element;

      var keys = container.querySelectorAll('.keyboard-key .key-element');
      assert.equal(keys[0].firstChild.textContent, 'A');
      assert.equal(keys[1].firstChild.textContent, 'B');

      assert.isFalse(container.classList.contains('lowercase'));
    });

    test('No uppercase flag, uppercase on keys, ' +
          'lowercase class on container', function() {
      var layout = {
        width: 2,
        keys: [
          [{ value: 'a', uppercaseValue: 'A' },
           { value: 'b', uppercaseValue: 'B' }]
        ]
      };

      var pageView = new LayoutPageView(layout, {});
      pageView.render();
      pageView.toggleCase({upperCase: false});

      var container = pageView.element;

      var keys = container.querySelectorAll('.keyboard-key .key-element');
      assert.equal(keys[0].firstChild.textContent, 'A');
      assert.equal(keys[1].firstChild.textContent, 'B');

      assert.isTrue(container.classList.contains('lowercase'));
    });

    test('w/ secondLayout, two label DOMs on buttons', function() {
      var layout = {
        width: 2,
        secondLayout: true,
        keys: [
          [{ value: 'a', uppercaseValue: 'A' },
           { value: 'b', uppercaseValue: 'B' }]
        ]
      };

      var pageView = new LayoutPageView(layout, {});
      pageView.render();
      pageView.toggleCase({upperCase: false});

      var container = pageView.element;

      var keys = container.querySelectorAll('.keyboard-key .key-element');
      assert.equal(keys[0].firstChild.textContent, 'A');
      assert.equal(keys[1].firstChild.textContent, 'a');
      assert.equal(keys[2].firstChild.textContent, 'B');
      assert.equal(keys[3].firstChild.textContent, 'b');

      assert.isTrue(container.classList.contains('lowercase'));
    });

    test('create keyboard with handwriting pad', function() {
      var layout = {
        handwritingPadOptions: {
          ratio: 8.5,
          rowspan: 3
        },
        keys: [
          [
            { value: 'a', ratio: 1.5 }
          ], [
            { value: 'b', ratio: 1.5 }
          ], [
            { value: 'c', ratio: 1.5 }
          ], [
            { value: 'd', ratio: 10 }
          ]
        ]
      };

      var pageView = new LayoutPageView(layout, {});
      pageView.render();

      var container = pageView.element;
      var pads = container.querySelectorAll('.handwriting-pad');
      assert.equal(pads.length, 1);
    });

    suite('CSS classes on pageView', function() {
      test('with specificCssRule', function() {
        var layout = {
          width: 1,
          keys: [],
          layoutName: 'ar',
          specificCssRule: true
        };

        var pageView = new LayoutPageView(layout, {});
        pageView.render();

        var container = pageView.element;
        assert.equal(container.classList.contains('ar'), true);
      });

      test('without specificCssRule', function() {
        var layout = {
          width: 1,
          keys: [],
          layoutName: 'ar',
          specificCssRule: false
        };

        var pageView = new LayoutPageView(layout, {});
        pageView.render();

        var container = pageView.element;
        assert.equal(container.classList.contains('ar'), false);
      });
    });
  });

  suite(' > setUpperCaseLock()', function() {
    var pageView  = null;
    setup(function() {

      var layout = {
        width: 2,
        keys: [
          [{ value: 'a' },
           { value: 'Shift', keyCode: KeyboardEvent.DOM_VK_CAPS_LOCK }
          ]
        ]
      };
      pageView = new LayoutPageView(layout, {});
      pageView.render();
    });

    test('turn to uppercase', function() {
      pageView.setUpperCaseLock({
        isUpperCase: true,
        isUpperCaseLocked: false
      });

      var container = pageView.element;
      assert.isFalse(container.classList.contains('lowercase'));

      var capsLockKey = container.querySelector(
        '[data-keycode="' + KeyboardEvent.DOM_VK_CAPS_LOCK + '"]'
      );

      assert.isTrue(capsLockKey.classList.contains('kbr-key-active'));
      assert.isFalse(capsLockKey.classList.contains('kbr-key-hold'));

      assert.equal(capsLockKey.getAttribute('aria-pressed'), 'true');
    });

    test('turn to lowercase', function() {
      pageView.setUpperCaseLock({
        isUpperCase: false,
        isUpperCaseLocked: false
      });

      var container = pageView.element;
      assert.isTrue(container.classList.contains('lowercase'));

      var capsLockKey = container.querySelector(
        '[data-keycode="' + KeyboardEvent.DOM_VK_CAPS_LOCK + '"]'
      );

      assert.isFalse(capsLockKey.classList.contains('kbr-key-active'));
      assert.isFalse(capsLockKey.classList.contains('kbr-key-hold'));

      assert.equal(capsLockKey.getAttribute('aria-pressed'), 'false');
    });

    test('enable CapsLock', function() {
      pageView.setUpperCaseLock({
        isUpperCase: true,
        isUpperCaseLocked: true
      });

      var container = pageView.element;
      assert.isFalse(container.classList.contains('lowercase'));

      var capsLockKey = container.querySelector(
        '[data-keycode="' + KeyboardEvent.DOM_VK_CAPS_LOCK + '"]'
      );

      assert.isFalse(capsLockKey.classList.contains('kbr-key-active'));
      assert.isTrue(capsLockKey.classList.contains('kbr-key-hold'));

      assert.equal(capsLockKey.getAttribute('aria-pressed'), 'true');
    });
  });
});
