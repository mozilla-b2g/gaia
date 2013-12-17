suite('mozprofilebuilder', function() {
  var subject = require('../index'),
      Profile = require('../lib/profile'),
      fs = require('fs');

  test('without options', function(done) {
    subject.create({}, function(err, profile) {
      if (err) return done(err);
      assert.ok(profile instanceof Profile, 'is Profile instance');
      assert.ok(fs.existsSync(profile.path), 'path exists');
      done();
    });
  });

  test('with options', function(done) {
    // mostly to make sure things don't explode- this functionality
    // should be 100% covered from the unit level and we should cover
    // the rest at the integration test level if possible.
    subject.create({ settings: {}, prefs: {}, apps: {} }, done);
  });
});
