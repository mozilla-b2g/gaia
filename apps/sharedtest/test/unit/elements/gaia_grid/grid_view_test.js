/* global GridView, GridLayout */

'use strict';

require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');

suite('GridView', function() {

  var container;

  setup(function() {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  teardown(function() {
    document.body.removeChild(container);
  });

  test(' reset last scroll time after touchend event', function() {
    this.sinon.stub(window, 'GridLayout');

    var subject = new GridView({
      features: {},
      element: container
    });

    assert.equal(subject.lastScrollTime, 0);

    subject.lastScrollTime = 1000;
    
    container.dispatchEvent(new CustomEvent('touchend'));

    assert.equal(subject.lastScrollTime, 0);

    GridLayout.restore();
  });

});
