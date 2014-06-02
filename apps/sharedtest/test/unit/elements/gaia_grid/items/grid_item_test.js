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

  test('displayFromImage sets the background size', function(done) {
    var img = document.createElement('img');
    img.src = '/style/icons/Blank.png';
    img.onload = displayImage();

    function displayImage() {
      var subject = new GridItem();
      subject.element = document.createElement('div');

      var originalRenderIconFromBlob = subject.renderIconFromBlob;
      subject.renderIconFromBlob = function(blob) {
        originalRenderIconFromBlob.call(subject, blob);
        var backgroundSize = parseInt(this.element.style.backgroundSize, 10);
        assert.ok(backgroundSize > 0);
        done();
      };

      subject.displayFromImage(img);
    }
  });

});
