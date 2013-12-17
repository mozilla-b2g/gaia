suite('settings', function() {
  var createProfile = require('../../lib/createprofile'),
      settings = require('../../lib/options/settings'),
      fs = require('fs'),
      baseProfile = __dirname + '/../fixtures/b2g-profile';

  suite('intial settings', function() {

    var profile;
    var originalSettings;
    var options;

    setup(function(done) {
      options = { settings: { myfoo: true } };
      originalSettings = require(baseProfile + '/settings.json');
      createProfile.baseProfile(baseProfile, function(err, _profile) {
        if (err) return done(err);
        profile = _profile;
        settings(profile, options, done);
      });
    });

    test('new settings', function() {
      var settings = require(profile + '/settings.json');
      originalSettings.myfoo = true;
      assert.deepEqual(
        originalSettings,
        settings,
        'updates setting'
      );
    });

    test('update settings', function(done) {
      var perms = 'permissions.sqlite';
      options.settings.myfoo = 111;

      settings(profile, options, function(err, newProfile) {
        if (err) return callback(err);
        var settings = require(newProfile + '/settings.json');
        assert.ok(!fs.existsSync(newProfile + '/' + perms));
        assert.equal(settings.myfoo, 111);
        done();
      });
    });

  });

});
