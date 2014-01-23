suite('createprofile', function() {
  var subject = require('../lib/createprofile'),
      fs = require('fs'),
      fsPath = require('path');

  suite('.gaia', function() {
    var target = __dirname + '/fixtures/b2g-mac';
    var path;

    setup(function(done) {
      subject.gaia(target, function(err, _path) {
        if (err) return callback(err);
        path = _path;
        done();
      });
    });

    test('copied files from profile', function() {
      assert.ok(fs.existsSync(path + '/yey.js'));
    });
  });

  suite('.baseProfile', function() {
    var target = __dirname + '/fixtures/b2g-profile';

    var path;
    setup(function(done) {
      subject.baseProfile(target, function(err, _path) {
        if (err) return done(err);
        path = _path;
        done();
      });
    });

    test('exists', function(done) {
      subject.profile(path, done);
    });

    test('is a new path', function() {
      assert.ok(path !== target);
    });

    [
      'webapps/a.js',
      'webapps/webapps.json',
      'settings.json'
    ].forEach(function(file) {
      test('copies ' + file, function() {
        var targetFile = fsPath.join(target, file);
        // verify they are not symlinked
        var stat = fs.lstatSync(targetFile);
        assert.ok(!stat.isSymbolicLink(), 'is not a symlink');

        assert.equal(
          fs.readFileSync(targetFile, 'utf8'),
          fs.readFileSync(path + '/' + file, 'utf8'),
          'file equality'
        );
      });
    });


    [
      'webapps/app1',
      'webapps/app2'
    ].forEach(function(file) {
      test('symlinks ' + file, function() {
        var sourceFile = fsPath.join(target, file);
        var targetFile = fsPath.join(path, file);

        assert.ok(fs.existsSync(targetFile), 'link exists');
        assert.equal(sourceFile, fs.readlinkSync(targetFile), 'is symlinked');
      });
    });

  });

  test('.tmp', function(done) {
    subject.tmp(function(err, profile) {
      if (err) return done(err);
      assert.ok(fs.existsSync(profile));
      done();
    });
  });

  suite('.profile', function() {
    test('missing', function(done) {
      subject.profile('probably/is/not/here', function(err) {
        if (!err) done(new Error('should throw an error'));

        assert.ok(/invalid/.test(err.message));
        done();
      });
    });

    test('exists', function(done) {
      subject.tmp(function(err, path) {
        subject.profile(path, function(err, givenPath) {
          if (err) return done(err);
          assert.equal(path, givenPath);
          done();
        });
      });
    });
  });

});
