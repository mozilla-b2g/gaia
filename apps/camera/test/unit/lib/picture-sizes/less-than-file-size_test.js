suite('lib/picture-sizes/less-than-file-size', function() {
  'use strict';

  var sizes = [{
    key: "1920x1080",
    title: "2MP 1920x1080 16:9",
    data: {
      height: 1080,
      width: 1920,
      aspect: "16:9",
      mp: 2
    }
  }, {
    key: "1600x1200",
    title: "2MP 1600x1200 4:3",
    data: {
      height: 1200,
      width: 1600,
      aspect: "4:3",
      mp: 2
    }
  }, {
    key: "1280x960",
    title: "1MP 1280x960 4:3",
    data: {
      height: 960,
      width: 1280,
      aspect: "4:3",
      mp: 1
    }
  }, {
    key: "1280x720",
    title: "1MP 1280x720 16:9",
    data: {
      height: 720,
      width: 1280,
      aspect: "16:9",
      mp: 1
    }
  }, {
    key: "176x144",
    title: "176x144 11:9",
    data: {
      height: 144,
      width: 176,
      aspect: "11:9",
      mp: 0
    }
  }];

  suiteSetup(function(done) {
    
    // Assume the default JPEG compression ratio of `8` for tests
    window.CONFIG_AVG_JPEG_COMPRESSION_RATIO = 8;

    var self = this;
    req(['lib/picture-sizes/less-than-file-size'], function(lessThanFileSize) {
      self.lessThanFileSize = lessThanFileSize;
      done();
    });
  });

  test('Should filter picture sizes that are less than given bytes', function() {
    var output;

    output = this.lessThanFileSize(9504, sizes);
    assert.ok(output.length === 1);

    output = this.lessThanFileSize(345600, sizes);
    assert.ok(output.length === 2);

    output = this.lessThanFileSize(460800, sizes);
    assert.ok(output.length === 3);

    output = this.lessThanFileSize(720000, sizes);
    assert.ok(output.length === 4);

    output = this.lessThanFileSize(777600, sizes);
    assert.ok(output.length === 5);
  });
});
