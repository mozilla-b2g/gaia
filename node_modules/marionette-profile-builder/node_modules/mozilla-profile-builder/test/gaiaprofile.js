suite('#gaiaProfile', function() {
  var baseProfile = __dirname + '/fixtures/b2g-profile/';
  var subject = require('../lib/gaiaprofile');
  var linux = __dirname + '/fixtures/b2g-linux';
  var mac = __dirname + '/fixtures/b2g-mac';

  test('mac', function(done) {
    subject(mac, function(err, path) {
      if (err) return done(err);
      assert.equal(path, mac + '/Contents/MacOS/gaia/profile');
      done();
    });
  });

  test('linux', function(done) {
    subject(linux, function(err, path) {
      if (err) return done(err);
      assert.equal(path, linux + '/gaia/profile');
      done();
    });
  });
});
