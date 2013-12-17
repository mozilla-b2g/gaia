'use strict';

requireApp('/video/js/video_utils.js');

suite('Video Utils Unit Tests', function() {

  suite('#fitContiner tests - 4:3 video fit HVGA', function() {
    test('fit 640x480 to HVGA, 0deg', function() {
      var testPlayer = {videoWidth: 640, videoHeight: 480, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 0);
      assert.equal(testPlayer.style.transform,
                   'translate(0.0000px,120.0000px) scale(0.5000)');
    });

    test('fit 640x480 to HVGA, 90deg', function() {
      var testPlayer = {videoWidth: 640, videoHeight: 480, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 90);
      assert.equal(testPlayer.style.transform,
            'translate(320.0000px,26.6667px) rotate(90deg) scale(0.6667)');
    });

    test('fit 640x480 to HVGA, 180deg', function() {
      var testPlayer = {videoWidth: 640, videoHeight: 480, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 180);
      assert.equal(testPlayer.style.transform,
          'translate(320.0000px,360.0000px) rotate(180deg) scale(0.5000)');
    });

    test('fit 640x480 to HVGA, 270deg', function() {
      var testPlayer = {videoWidth: 640, videoHeight: 480, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 270);
      assert.equal(testPlayer.style.transform,
            'translate(0.0000px,453.3333px) rotate(270deg) scale(0.6667)');
    });

    test('fit 640x480 to HVGA landscape, 0deg', function() {
      var testPlayer = {videoWidth: 640, videoHeight: 480, style: {}};
      VideoUtils.fitContainer({clientWidth: 480, clientHeight: 320},
                             testPlayer, 0);
      assert.equal(testPlayer.style.transform,
                   'translate(26.6667px,0.0000px) scale(0.6667)');
    });

    test('fit 640x480 to HVGA landscape, 90deg', function() {
      var testPlayer = {videoWidth: 640, videoHeight: 480, style: {}};
      VideoUtils.fitContainer({clientWidth: 480, clientHeight: 320},
                             testPlayer, 90);
      assert.equal(testPlayer.style.transform,
                  'translate(360.0000px,0.0000px) rotate(90deg) scale(0.5000)');
    });

    test('fit 320x240 to HVGA, 0deg, no scale', function() {
      var testPlayer = {videoWidth: 320, videoHeight: 240, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 0);
      assert.equal(testPlayer.style.transform,
            'translate(0.0000px,120.0000px) scale(1.0000)');
    });

    test('fit 240x180 to HVGA, 0deg, scale up', function() {
      var testPlayer = {videoWidth: 240, videoHeight: 180, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 0);
      assert.equal(testPlayer.style.transform,
            'translate(0.0000px,120.0000px) scale(1.3333)');
    });

    test('fit 320x480 to HVGA, 0deg, 100% fit', function() {
      var testPlayer = {videoWidth: 320, videoHeight: 480, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 0);
      assert.equal(testPlayer.style.transform,
            'translate(0.0000px,0.0000px) scale(1.0000)');
    });
  });

  suite('#fitContiner tests - 16:9 video fit HVGA', function() {
    test('fit 720p to HVGA, 0deg', function() {
      var testPlayer = {videoWidth: 1280, videoHeight: 720, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 0);
      assert.equal(testPlayer.style.transform,
                   'translate(0.0000px,150.0000px) scale(0.2500)');
    });

    test('fit 720p to HVGA, 90deg', function() {
      var testPlayer = {videoWidth: 1280, videoHeight: 720, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 90);
      assert.equal(testPlayer.style.transform,
            'translate(295.0000px,0.0000px) rotate(90deg) scale(0.3750)');
    });

    test('fit 720p to HVGA, 180deg', function() {
      var testPlayer = {videoWidth: 1280, videoHeight: 720, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 180);
      assert.equal(testPlayer.style.transform,
            'translate(320.0000px,330.0000px) rotate(180deg) scale(0.2500)');
    });

    test('fit 720p to HVGA, 270deg', function() {
      var testPlayer = {videoWidth: 1280, videoHeight: 720, style: {}};
      VideoUtils.fitContainer({clientWidth: 320, clientHeight: 480},
                             testPlayer, 270);
      assert.equal(testPlayer.style.transform,
            'translate(25.0000px,480.0000px) rotate(270deg) scale(0.3750)');
    });

    test('fit 720p to HVGA landscape, 0deg', function() {
      var testPlayer = {videoWidth: 1280, videoHeight: 720, style: {}};
      VideoUtils.fitContainer({clientWidth: 480, clientHeight: 320},
                             testPlayer, 0);
      assert.equal(testPlayer.style.transform,
                   'translate(0.0000px,25.0000px) scale(0.3750)');
    });

    test('fit 720p to HVGA landscape, 90deg', function() {
      var testPlayer = {videoWidth: 1280, videoHeight: 720, style: {}};
      VideoUtils.fitContainer({clientWidth: 480, clientHeight: 320},
                             testPlayer, 90);
      assert.equal(testPlayer.style.transform,
                  'translate(330.0000px,0.0000px) rotate(90deg) scale(0.2500)');
    });
  });
});
