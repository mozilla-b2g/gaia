'use strict';

var realMozApps;
var fakeApp1;
var fakeApp2;

suite('ALA AppList', function() {
  suiteSetup(function(done) {

    var apps = [{
      manifest: {
        name: 'Mozilla Fake App 1',
        launch_path: '/fakeapp1/index.html',
        permissions: {
          permission_1: {}
        },
        icons: {
          84: '/style/icons/settings_84.png',
          126: '/style/icons/settings_126.png',
          142: 'style/icons/settings_142.png',
          189: '/style/icons/settings_189.png',
          284: '/style/icons/settings_284.png'
        }
      },
      manifestURL: 'http://fakeapp1/manifest.webapp'
    }, {
      manifest: {
        name: 'Mozilla Fake App 2',
        launch_path: '/fakeapp2/index.html',
        permissions: {
          permission_2: {}
        }
      },
      manifestURL: 'http://fakeapp2/manifest.webapp'
    }, {
      manifest: {
        name: 'Mozilla Fake App 3',
        launch_path: '/fakeapp3/index.html',
        permissions: {
          permission_2: {}
        }
      }
    }];

    require(['mocks/mock_navigator_moz_apps'], function(mozApps) {
      realMozApps = navigator.mozApps;
      navigator.mozApps = mozApps;
      navigator.mozApps.mApps = apps;
      done();
    });
  });

  setup(function(done) {
    require(['ala/app_list'], appList => {
      this.subject = appList;
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
  });

  test('should get one apps', function(done) {
    this.subject.get('permission_1', function(result) {
      assert.lengthOf(result, 1);
      assert.equal(result[0].manifest.name, 'Mozilla Fake App 1');
      fakeApp1 = result[0];
      done();
    });
  });

  test('should get list of apps', function(done) {
    this.subject.get('permission_2', function(result) {
      assert.lengthOf(result, 2);

      assert.equal(result[0].manifest.name, 'Mozilla Fake App 2');
      fakeApp2 = result[0];

      assert.equal(result[1].manifest.name, 'Mozilla Fake App 3');
      done();
    });
  });

  test('should get empty list of apps when we are giving invalid permission',
    function(done) {
      this.subject.get('invalidPermission', function(result) {
        assert.isArray(result);
        assert.lengthOf(result, 0);
        done();
      });
    }
  );

  test('should get path to app icon',
    function(done) {
      var icon1 = this.subject.icon(fakeApp1);
      assert.notEqual(icon1, '../style/images/default.png');
      done();
    }
  );

  test('should get default path to app icon if path is not set in manifest',
    function(done) {
      var icon2 = this.subject.icon(fakeApp2);
      assert.equal(icon2, '../style/images/default.png');
      done();
    }
  );
});
