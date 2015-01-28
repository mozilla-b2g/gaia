'use strict';
/* global GaiaGrid */

require('/shared/js/url_helper.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');

suite('GridItem', function() {

  setup(function() {
    this.container = document.createElement('div');
    this.container.innerHTML = '<gaia-grid></gaia-grid>';
    document.body.appendChild(this.container);
  });

  test('renderIconFromSrc sets the background size', function(done) {
    var subject = new GaiaGrid.GridItem();
    subject.element = document.createElement('div');

    var original  = subject._displayDecoratedIcon;
    subject._displayDecoratedIcon = function(blob) {
      original.call(subject, blob);
      var gridItemHeight = parseInt(this.element.style.height, 10);
      var backgroundSize = parseInt(this.element.style.backgroundSize, 10);
      assert.ok(backgroundSize > 0);
      assert.isTrue(gridItemHeight >= backgroundSize);
      done();
    };

    subject.renderIconFromSrc('/style/icons/Blank.png');
  });

  test('basic auth in icon urls', function() {
    var subject = new GaiaGrid.GridItem();
    subject.app = {
      origin: 'app://user.mozilla.org',
      manifestURL: 'app://user.mozilla.org/manifest.webapp'
    };

    var result = subject.closestIconFromList({
      100: '/icon.png'
    });
    assert.equal(result, 'app://user.mozilla.org/icon.png');
  });

});
