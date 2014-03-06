suite('lib/picture-sizes/closest-to-size', function() {
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
    key: "800x480",
    title: "800x480 5:3",
    data: {
      height: 480,
      width: 800,
      aspect: "5:3",
      mp: 0
    }
  }, {
    key: "640x480",
    title: "640x480 4:3",
    data: {
      height: 480,
      width: 640,
      aspect: "4:3",
      mp: 0
    }
  }, {
    key: "352x288",
    title: "352x288 11:9",
    data: {
      height: 288,
      width: 352,
      aspect: "11:9",
      mp: 0
    }
  }, {
    key: "720x480",
    title: "720x480 3:2",
    data: {
      height: 480,
      width: 720,
      aspect: "3:2",
      mp: 0
    }
  }, {
    key: "320x240",
    title: "320x240 4:3",
    data: {
      height: 240,
      width: 320,
      aspect: "4:3",
      mp: 0
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
    req(['lib/picture-sizes/closest-to-size'], function(closestToSize) {
      self.closestToSize = closestToSize;
      done();
    });
  });

  test('Should pick the closest resolution >= to target', function() {
    var output;

    output = this.closestToSize({ width: 800, height: 480 }, sizes);
    assert.ok(output.key === '800x480', output.key + ' is not 800x400');

    output = this.closestToSize({ width: 799, height: 479 }, sizes);
    assert.ok(output.key === '800x480', output.key + ' is not 800x400');

    output = this.closestToSize({ width: 639, height: 479 }, sizes);
    assert.ok(output.key === '640x480', output.key + ' is not 640x480');

    output = this.closestToSize({ width: 176, height: 150 }, sizes);
    assert.ok(output.key === '320x240', output.key + ' is not 320x240');

    output = this.closestToSize({ width: 720, height: 480 }, sizes);
    assert.ok(output.key === '720x480', output.key + ' is not 720x480');
  });
});