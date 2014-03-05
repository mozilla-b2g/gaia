suite('lib/picture-sizes/less-than-bytes', function() {
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
    var self = this;
    req(['lib/picture-sizes/less-than-bytes'], function(lessThanBytes) {
      self.lessThanBytes = lessThanBytes;
      done();
    });
  });

  test('Should filter picture sizes that are less than given bytes', function() {
    var output;

    output = this.lessThanBytes(300000, sizes);
    assert.ok(output.length === 1);

    output = this.lessThanBytes(1040000, sizes);
    assert.ok(output.length === 2);

    output = this.lessThanBytes(1228800, sizes);
    assert.ok(output.length === 3);

    output = this.lessThanBytes(1920000, sizes);
    assert.ok(output.length === 4);
  });
});