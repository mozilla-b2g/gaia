suite('apps', function() {
  var baseProfile = __dirname + '/../fixtures/b2g-profile',
      apps = require('../../lib/options/apps'),
      createProfile = require('../../lib/createprofile'),
      fs = require('fs');

  suite('app installation', function() {
    var options = {
      apps: {
        'testa.com': __dirname + '/../fixtures/test-app-a/',
        'testb.com': __dirname + '/../fixtures/test-app-b/'
      }
    };

    var profile;
    setup(function(done) {
      createProfile.baseProfile(baseProfile, function(err, _profile) {
        if (err) return done(err);
        profile = _profile;
        apps(profile, options, done);
      });
    });

    test('both apps are in primary manifest', function() {
      var installedApps = require(profile + '/webapps/webapps.json');

      assert.ok(installedApps['testa.com'], 'testa.com');
      assert.ok(installedApps['testb.com'], 'testb.com');
    });
  });

});

