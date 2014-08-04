'use strict';
/* global MockApp, App, MocksHelper, loadBodyHTML, CollectionSource */

require('/shared/js/collections_database.js');
require('/shared/js/l10n.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/collection.js');
require('/js/sources/collection.js');

require('/test/unit/mock_app.js');

var mocksHelperForCollection = new MocksHelper([
  'App'
]).init();

suite('collection.js > ', function() {

  mocksHelperForCollection.attachTestHelpers();

  var subject = null;

  suiteSetup(function() {
    window.app = new App();
    loadBodyHTML('/index.html');

    var mockStore = {
      getNextPosition: function() {}
    };

    subject = new CollectionSource(mockStore);
    subject.synchronize();
  });

  test('proper ordering, datastore sync from during activity', function() {
    window.dispatchEvent(new CustomEvent('collections-create-begin'));

    subject.addIconToGrid({id: 'rocks'});
    subject.addIconToGrid({id: 'homescreen'});
    subject.addIconToGrid({id: 'fxos'});

    window.dispatchEvent(new CustomEvent('collections-create-return', {
      detail: {
        ids: ['fxos', 'homescreen', 'rocks']
      }
    }));

    assert.equal(MockApp.mItems[0].detail.id, 'fxos');
    assert.equal(MockApp.mItems[1].detail.id, 'homescreen');
    assert.equal(MockApp.mItems[2].detail.id, 'rocks');
  });

});
