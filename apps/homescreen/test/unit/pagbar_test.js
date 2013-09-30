'use strict';

requireApp('homescreen/js/pagbar.js');

suite('pagbar.js >', function() {

  var scroller;

  suiteSetup(function() {
    var markup = '<div class="paginationScroller" role="slider" ' +
                       'aria-valuemin="0" aria-valuenow="0" ' +
                       'aria-valuemax="0" aria-controls="icongrid"></div>';

    scroller = document.createElement('header');
    scroller.id = 'paginationBar';
    scroller.innerHTML = markup;
    document.body.appendChild(scroller);

    PaginationBar.init(scroller);
    // Current page index is 0 and the number of pages is 5
    PaginationBar.update(0, 5);
  });

  suiteTeardown(function() {
    document.body.removeChild(scroller);
  });

  suite('Pagination bar >', function() {

    test('Showing', function() {
      PaginationBar.show();
      assert.equal(scroller.style.visibility, 'visible');
    });

    test('Hiding', function() {
      PaginationBar.hide();
      assert.equal(scroller.style.visibility, 'hidden');
    });

    test('Current page index: 1, total pages: 5 >', function() {
      PaginationBar.update(1, 5);
      assert.equal(scroller.getAttribute('aria-valuenow'), '1');
      assert.equal(scroller.getAttribute('aria-valuemax'), '4');

      assert.equal('translateX(100%)', scroller.style.MozTransform);
    });

    test('Current page index: 3, total pages: 5 >', function() {
      PaginationBar.update(3, 5);
      assert.equal(scroller.getAttribute('aria-valuenow'), '3');
      assert.equal(scroller.getAttribute('aria-valuemax'), '4');

      assert.equal('translateX(300%)', scroller.style.MozTransform);
    });

    test('Keeping the position in the grid >', function() {
      PaginationBar.update(3, 5);
      assert.equal(scroller.getAttribute('aria-valuenow'), '3');
      assert.equal(scroller.getAttribute('aria-valuemax'), '4');

      // The bar should be in the same position
      assert.equal('translateX(300%)', scroller.style.MozTransform);
    });

    test('Adding a new page >', function() {
      // Current width of the bar
      var width = scroller.style.width;

      // Added a new page to the homescreen
      PaginationBar.update(3, 6);
      assert.equal(scroller.getAttribute('aria-valuenow'), '3');
      assert.equal(scroller.getAttribute('aria-valuemax'), '5');

      assert.equal('translateX(300%)', scroller.style.MozTransform);

      // The new width should be shorter
      assert.isTrue(parseInt(width) > parseInt(scroller.style.width));
    });

    test('Removing three pages >', function() {
      // Current width of the bar
      var width = scroller.style.width;

      // We remove three pages
      PaginationBar.update(2, 3);
      assert.equal(scroller.getAttribute('aria-valuenow'), '2');
      assert.equal(scroller.getAttribute('aria-valuemax'), '2');

      // The bar was translated
      assert.equal('translateX(200%)', scroller.style.MozTransform);

      // The new width should be higher due to have less pages
      assert.isTrue(parseInt(width) < parseInt(scroller.style.width));
    });

  });
});
