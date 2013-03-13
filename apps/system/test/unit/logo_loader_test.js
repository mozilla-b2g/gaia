requireApp('system/test/unit/mock_media_files.js');
requireApp('system/js/logo_loader.js');

suite('logoLoader', function() {

  var image;
  var video;
  var subject;
  var logoPath;
  const invalidURL = 'INVALID_URL';

  setup(function() {
    image = MockPng;
    video = MockVideo;
  });

  test('Find image logo', function(done) {
    subject = new LogoLoader({image: image, video: invalidURL});
    subject.onload = function() {
      assert.equal(subject.element.tagName, 'IMG');
      done();
    };
  });

  test('Find movie logo', function(done) {
    subject = new LogoLoader({image: 'INVALIDURL', video: video});
    subject.onload = function() {
      assert.equal(subject.element.tagName, 'VIDEO');
      done();
    };
  });

  test('Logo not found', function(done) {
    subject = new LogoLoader({image: invalidURL, video: invalidURL});
    subject.onnotfound = function() {
      assert.isFalse(subject.found);
      assert.isTrue(subject.ready);
      done();
    };
  });

  teardown(function() {
  });
});
