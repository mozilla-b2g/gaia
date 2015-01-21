'use strict';

/* global SwipeablePageView */
require('/js/views/key_view.js');
require('/js/views/layout_page_view.js');
require('/js/views/swipeable_section_view.js');
require('/js/views/swipeable_panel_view.js');
require('/js/views/swipeable_page_view.js');

suite('Views > SwipeablePageView', function() {
  var pageView = null;
  var viewManager = {
    registerView: sinon.stub()
  };

  setup(function() {
    var dummyLayout = {
      width: 2,
      panelKeys: [
        [{ value: 'a' }, { value: 'b' }]

      ],
      keys: [
        [{ value: 'a' }, { value: 'b' }]
      ]

    };

    pageView = new SwipeablePageView(dummyLayout, {},
      viewManager);
  });

  suite('some basic functions',  function() {
    test('> render() ', function() {
      assert.equal(pageView.element, null);

      pageView.render();
      assert.notEqual(pageView.element, null);

      pageView.show();
      assert.equal(pageView.element.dataset.active, 'true');
      assert.ok(pageView.element.classList.contains('uppercase-only'));

      var rows = pageView.element.querySelectorAll('.keyboard-row');
      assert.equal(rows.length, 1);

      assert.ok(rows[0].classList.contains('swipe-switching-buttons'));
    });
  });

  suite('CSS classes on pageView', function() {
    test('with specificCssRule', function() {
      var layout = {
        panelKeys: [],
        keys: [],
        layoutName: 'ar',
        specificCssRule: true
      };

      var pageView = new SwipeablePageView(layout, {}, viewManager);
      pageView.render();

      var container = pageView.element;
      assert.equal(container.classList.contains('ar'), true);
    });

    test('without specificCssRule', function() {
      var layout = {
        width: 1,
        panelKeys: [],
        keys: [],
        layoutName: 'ar',
        specificCssRule: false
      };

      var pageView = new SwipeablePageView(layout, {}, viewManager);
      pageView.render();

      var container = pageView.element;
      assert.equal(container.classList.contains('ar'), false);
    });
  });
});
