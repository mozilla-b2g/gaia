suite('profile', function() {
  var Profile = require('../lib/profile'),
      tmpdir = require('../lib/tmpdir'),
      fs = require('fs');


  var subject; // profile instance
  var profile; // tmpdir for profile
  setup(function(done) {
    tmpdir({}, function(err, path) {
      if (err) return done(err);
      // local copy for test comparison
      profile = path;
      subject = new Profile(path);
      done();
    });
  });

  suite('initialize', function() {
    test('.path', function() {
      assert.equal(subject.path, profile);
    });
  });

  suite('#destroy', function(done) {
    setup(function() {
      // write a file simply so removing a non-empty directory will explode.
      fs.writeFileSync(profile + '/yey', 'somecontent');
    });

    test('removal', function(done) {
      subject.destroy(function(err) {
        if (err) return done(err);
        assert.ok(!fs.existsSync(profile), 'profile removed');
        done();
      });
    });
  });
});
