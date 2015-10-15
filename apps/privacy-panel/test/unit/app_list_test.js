'use strict';

var realMozApps;
var realMozL10n;
var fakeApp1;
var fakeApp2;
var fakeApp3;

suite('AppList', function() {

  suiteSetup(function(done) {

    var apps = [
      {
        manifest: {
          name: 'Mozilla Fake App 1',
          launch_path: '/fakeapp1/index.html',
          type: 'privileged',
          permissions: {
            permission_1: {}
          },
          developer: {
            name: 'Flying Platypus',
            url: 'https://flying.platypus.com/'
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
      },
      {
        manifest: {
          name: 'Mozilla Fake App 2',
          launch_path: '/fakeapp2/index.html',
          type: 'privileged',
          developer: {
            name: 'Mighty Duck',
            url: 'https://mighty.duck.com/'
          },
          permissions: {
            permission_2: {}
          }
        },
        manifestURL: 'http://fakeapp2/manifest.webapp'
      },
      {
        manifest: {
          name: 'Mozilla Fake App 3',
          launch_path: '/fakeapp3/index.html',
          type: 'web',
          developer: {
            name: 'Mighty Duck',
            url: 'https://mighty.duck.com/'
          },
          permissions: {
            permission_2: {}
          }
        }
      }
    ];

    require([
      'mocks/mock_navigator_moz_apps',
      'mocks/mock_l10n'
    ],
    function(mozApps, mozL10n) {
      realMozApps = navigator.mozApps;
      navigator.mozApps = mozApps;
      navigator.mozApps.mApps = apps;

      realMozL10n = navigator.mozL10n;
      navigator.mozL10n = mozL10n;

      done();
    });
  });

  setup(function(done) {
    require(['app_list'], appList => {
      this.subject = appList;
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    navigator.mozL10n = realMozL10n;
  });

  test('initializing, should get all apps', function(done) {
    this.subject.init().then(function() {
      var result = this.subject.applications;
      assert.lengthOf(result, 3);
      assert.equal(result[0].manifest.name, 'Mozilla Fake App 1');
      assert.equal(result[1].manifest.name, 'Mozilla Fake App 2');
      assert.equal(result[2].manifest.name, 'Mozilla Fake App 3');
      fakeApp1 = result[0];
      fakeApp2 = result[1];
      fakeApp3 = result[2];
      done();
    }.bind(this));
  });

  test('should get one app', function(done) {
    var result = this.subject.getFilteredApps('permission_1');
    assert.lengthOf(result, 1);
    assert.equal(result[0].manifest.name, 'Mozilla Fake App 1');
    done();
  });

  test('should get a list of apps', function(done) {
    var result = this.subject.getFilteredApps('permission_2');
    assert.lengthOf(result, 2);
    assert.equal(result[0].manifest.name, 'Mozilla Fake App 2');
    assert.equal(result[1].manifest.name, 'Mozilla Fake App 3');
    done();
  });

  test('should get an empty list of apps for an invalid permission',
    function(done) {
      var result = this.subject.getFilteredApps('invalidPermission');
      assert.isArray(result);
      assert.lengthOf(result, 0);
      done();
    }
  );

  test('should get path to app icon',
    function(done) {
      assert.notEqual(fakeApp1.iconURL, '../style/images/default.png');
      done();
    }
  );

  test('should get default path to app icon if path is not set in manifest',
    function(done) {
      assert.equal(fakeApp2.iconURL, '../style/images/default.png');
      done();
    }
  );

  test('should get an array of app groups (one group per trust level)',
    function(done) {
      assert.deepEqual(this.subject.getSortedApps('trust'), {
        'privileged': [ fakeApp1, fakeApp2 ],
        'web': [ fakeApp3 ]
      });
      done();
    }
  );

  test('should get an array of app groups (one group per vendor)',
    function(done) {
      assert.deepEqual(this.subject.getSortedApps('vendor'), {
        'Flying Platypus': [ fakeApp1 ],
        'Mighty Duck': [ fakeApp2, fakeApp3 ]
      });
      done();
    }
  );

});
