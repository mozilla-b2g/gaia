'use strict';
/* global GaiaGrid */

require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/bookmark.js');

suite('GaiaGrid > Bookmark', function() {

  var subject = null,
      stub = null;
  var stubPage1 = {
    name: 'first',
    id: 1,
    icon: 'no',
    url: 'http://mozilla.org'
  };

  setup(function() {
    stub = sinon.stub(GaiaGrid.GridItem.prototype, 'render', function() {
      this.element = document.createElement('div');
    });
    subject = new GaiaGrid.Bookmark(stubPage1);
  });

  teardown(function() {
    stub.restore();
  });

  test('Bookmark created properly', function() {
    assert.equal(subject.name, stubPage1.name);
    assert.equal(subject.icon, stubPage1.icon);
    assert.equal(subject.identifier, stubPage1.id);
    assert.equal(subject.detail.url, stubPage1.url);
    assert.isUndefined(subject.bookmarking);
    assert.isTrue(subject.isRemovable());
    assert.isTrue(subject.isEditable());
    subject.render();
    assert.isTrue(subject.element.classList.contains('editable'));
  });

  test('Bookmark is not editable', function() {
    subject = new GaiaGrid.Bookmark(stubPage1, {
      isEditable: false
    });
    assert.isFalse(subject.isEditable());
    subject.render();
    assert.isFalse(subject.element.classList.contains('editable'));
  });

  test('Launch bookmark', function(done) {
    var openStub = sinon.stub(window, 'open', function(url, name, features) {
      openStub.restore();
      assert.equal(url, stubPage1.url);
      assert.equal(name, '_samescope');
      assert.isTrue(features.contains('name=' + subject.name));
      assert.isTrue(features.contains('icon=' + subject.icon));
      assert.isTrue(features.contains('remote=true'));
      assert.isFalse(features.contains('searchName='));
      assert.isFalse(features.contains('searchUrl='));
      done();
    });

    subject.launch();
  });

  test('Launch bookmark with bookmarking feature', function(done) {
    var openStub = sinon.stub(window, 'open', function(url, name, features) {
      openStub.restore();
      assert.isTrue(features.contains('searchName=' + subject.name));
      assert.isTrue(features.contains('searchUrl=' +
                                       encodeURIComponent(subject.detail.url)));
      done();
    });

    subject = new GaiaGrid.Bookmark(stubPage1, {
      search: true
    });
    subject.launch();
  });

});
