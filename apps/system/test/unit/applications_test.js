'use strict';


requireApp('system/test/unit/mock_app.js');
requireApp('system/js/applications.js');

suite('system/Applications >', function() {
  suite('getByOrigin >', function() {

    var apps, app1, app2, app3;

    setup(function() {
      app1 = new MockApp({ origin: 'http://www.mozilla.com' });
      app2 = new MockApp({ origin: 'http://www.mozilla.com' });
      app3 = new MockApp({ origin: 'http://www.mozilla.org' });

      apps = {};

      [ app1, app2, app3 ].forEach(function(app) {
        apps[app.manifestURL] = app;
      });

      // TODO mock mozApps.mgmt instead
      Applications.installedApps = apps;
    });

    test('returns the correct array', function() {
      var result = Applications.getByOrigin('http://www.mozilla.com');
      assert.isArray(result);
      assert.include(result, app1);
      assert.include(result, app2);
      assert.lengthOf(result, 2);
    });
  });
});
