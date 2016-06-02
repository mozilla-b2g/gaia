/* global MockNavigatorDatastore */
/* global MockDatastore */
/* global topSitesCustomizer */

'use strict';

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/topsites_customizer.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');

suite('TopSitesCustomizer >', function() {
  var realDatastore = null;

  suiteSetup(function() {
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
  });

  teardown(function() {
    MockDatastore._inError = false;
    MockDatastore._records = Object.create(null);
  });

  test('First run with valid SIM. Set places', function(done) {

    var url = 'http://example.org';
    var title = 'Example';
    var tile = 'atile';
    var data = {
      topSites: [{
        url: url,
        title: title,
        tile: tile,
      }]
    };

    MockDatastore.addEventListener('change', function() {
      assert.deepEqual(MockDatastore._records[url], {
        url: url,
        title: title,
        tile: tile,
        frecency: -1
      }, 'Arguments not equal');
      done();
    });
    topSitesCustomizer.simPresentOnFirstBoot = true;
    topSitesCustomizer.set(data);
  });
});
