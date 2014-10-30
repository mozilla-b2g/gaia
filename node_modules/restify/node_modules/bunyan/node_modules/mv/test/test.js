var assert, proxyquire, fs;

assert = require('assert');
proxyquire = require('proxyquire');
fs = require('fs');

describe("mv", function() {
  var mock_fs, mocked_mv;

  // makes fs.rename return cross-device error.
  mock_fs = {};
  mock_fs.rename = function(src, dest, cb) {
    setTimeout(function() {
      var err;
      err = new Error();
      err.code = 'EXDEV';
      cb(err);
    }, 10);
  };

  it("should rename a file on the same device", function (done) {
    var mv;

    mv = proxyquire.resolve('../index', __dirname, {});

    mv("test/a-file", "test/a-file-dest", function (err) {
      assert.ifError(err);
      fs.readFile("test/a-file-dest", 'utf8', function (err, contents) {
        assert.ifError(err);
        assert.strictEqual(contents, "sonic the hedgehog\n");
        // move it back
        mv("test/a-file-dest", "test/a-file", done);
      });
    });
  });

  it("should work across devices", function (done) {
    var mv;

    mv = proxyquire.resolve('../index', __dirname, {fs: mock_fs});
    mv("test/a-file", "test/a-file-dest", function (err) {
      assert.ifError(err);
      fs.readFile("test/a-file-dest", 'utf8', function (err, contents) {
        assert.ifError(err);
        assert.strictEqual(contents, "sonic the hedgehog\n");
        // move it back
        mv("test/a-file-dest", "test/a-file", done);
      });
    });
  });

  it("should move folders", function (done) {
    var mv;

    mv = proxyquire.resolve('../index', __dirname, {});

    mv("test/a-folder", "test/a-folder-dest", function (err) {
      assert.ifError(err);
      fs.readFile("test/a-folder-dest/another-file", 'utf8', function (err, contents) {
        assert.ifError(err);
        assert.strictEqual(contents, "tails\n");
        // move it back
        mv("test/a-folder-dest", "test/a-folder", done);
      });
    });
  });

  it("should move folders across devices", function (done) {
    var mv;

    mv = proxyquire.resolve('../index', __dirname, {fs: mock_fs});

    mv("test/a-folder", "test/a-folder-dest", function (err) {
      assert.ifError(err);
      fs.readFile("test/a-folder-dest/another-folder/file3", 'utf8', function (err, contents) {
        assert.ifError(err);
        assert.strictEqual(contents, "knuckles\n");
        // move it back
        mv("test/a-folder-dest", "test/a-folder", done);
      });
    });
  });
});
