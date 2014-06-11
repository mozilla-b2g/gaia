'use strict';
/* global GridItem */

require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/shared/elements/gaia_grid/script.js');

suite('GridItem', function() {

  setup(function() {
    this.container = document.createElement('div');
    this.container.innerHTML = '<gaia-grid></gaia-grid>';
    document.body.appendChild(this.container);
  });

  test('renderIconFromSrc sets the background size', function(done) {
    var subject = new GridItem();
    subject.element = document.createElement('div');

    var original  = subject._displayDecoratedIcon;
    subject._displayDecoratedIcon = function(blob) {
      original.call(subject, blob);
      var backgroundSize = parseInt(this.element.style.backgroundSize, 10);
      assert.ok(backgroundSize > 0);
      done();
    };

    subject.renderIconFromSrc('/style/icons/Blank.png');
  });

});
