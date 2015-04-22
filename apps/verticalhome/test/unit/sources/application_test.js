'use strict';
/* global App, ApplicationSource, GaiaGrid, ItemStore */
/* global MocksHelper, MockNavigatormozApps, loadBodyHTML */

require('/shared/js/l10n.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/elements/gaia_grid/js/grid_dragdrop.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/js/grid_zoom.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/placeholder.js');
require('/shared/elements/gaia_grid/js/items/mozapp.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');

require('/test/unit/mock_app.js');
require('/test/unit/mock_item_store.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');

var mocksHelperForApp = new MocksHelper([
  'App',
  'ItemStore'
]).init();

suite('app.js > ', function() {

  mocksHelperForApp.attachTestHelpers();

  var subject;
  var realMozApps;

  suiteSetup(function(done) {
    window.app = new App();
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
    require('/js/sources/application.js', done);
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    MockNavigatormozApps.mTeardown();
  });

  setup(function() {
    loadBodyHTML('/index.html');
    subject = new ApplicationSource(new ItemStore());
  });

  test('synchronize removes app', function() {
    var removeStub = this.sinon.stub(subject, 'removeIconFromGrid');

    subject.store._allItems = [
      new GaiaGrid.Mozapp({
        manifestURL: 'mozilla'
      }),
      new GaiaGrid.Mozapp({
        manifestURL: 'removeme'
      })
    ];

    subject.synchronize();
    assert.ok(removeStub.calledTwice);
  });

});
