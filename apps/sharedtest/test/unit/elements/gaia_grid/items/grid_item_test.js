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
      origin: 'some:user@mozilla.org'
    };

    var result = subject.closestIconFromList({
      100: '/icon.png'
    });
    assert.equal(result, 'some:user@mozilla.org/icon.png');
  });

  test('scale doesn\'t affect style width', function() {
    var subject = new GaiaGrid.GridItem();

    subject.grid.config.element =
      { appendChild: function() {}, offsetWidth: 333 };
    subject.updateTitle = function() {};
    subject.renderIcon = function() {};

    subject.render();

    var width1 = subject.element.style.width;

    subject.element = null;
    subject.scale = 2;
    subject.render();

    var width2 = subject.element.style.width;

    assert.equal(width1, width2);
  });

  test('Detect W3C web app manifest icons format', function() {
    var icons = [];
    window.WebManifestHelper = {
      'iconURLForSize': function() {}
    };
    var stubIconURLForSize = sinon.stub(window.WebManifestHelper,
      'iconURLForSize', function() {
        return new URL('http://example.com/icon.png');
      });
    var subject = new GaiaGrid.GridItem();
    subject.app = {
      'manifestURL': 'http://example.com/manifest.json'
    };
    var result = subject.closestIconFromList(icons);
    assert.equal(result, 'http://example.com/icon.png');
    stubIconURLForSize.restore();
    window.WebManifestHelper = undefined;
  });

});
