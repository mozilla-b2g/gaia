/* global sinon, assert, suite, setup, teardown, test, app, loadBodyHTML */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/js/datastore.js');
require('/js/metadata.js');

suite('Homescreen app', function() {
  setup(function(done) {
    this.sinon = sinon.sandbox.create();

    loadBodyHTML('/index.html');

    // Mock
    navigator.mozApps = {};
    navigator.mozApps.mgmt = {
      addEventListener: () => {},
      getAll: () => {},
      uninstall: () => {}
    };

    require('/js/app.js', done);
  });

  teardown(function() {
    this.sinon.restore();
  });

  test('saveSettings() should persist data', function() {
    app.small = true;
    app.saveSettings();
    app.small = false;
    app.restoreSettings();
    assert.equal(app.small, true);
  });
});
