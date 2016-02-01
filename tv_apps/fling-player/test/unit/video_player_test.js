/* global VideoPlayer, MockVideoElement */
'use strict';

requireApp('fling-player/test/unit/mock_video_element.js');
requireApp('fling-player/js/video_player.js');

suite('fling-player/VideoPlayer', function() {

  var player, video;

  var videoURL =
    'app://fling-player.gaiamobile.org/test_media/Movies/elephants-dream.webm';

  setup(function () {
    video = new MockVideoElement();
    player = new VideoPlayer(video);
    player.init();
  });

  teardown(function () {
    player = video = undefined;
  });

  test('should return video element', function () {
    assert.equal(player.getVideo(), video);
  });

  test('should return video duration in rounded sec', function () {

    video.duration = NaN;
    player = new VideoPlayer(video);
    player.init();
    assert.equal(player.getRoundedDuration(), 0);

    video.duration = 100;
    player = new VideoPlayer(video);
    player.init();
    assert.equal(player.getRoundedDuration(), Math.round(video.duration));

    video.duration = 100.01;
    player = new VideoPlayer(video);
    player.init();
    assert.equal(player.getRoundedDuration(), Math.round(video.duration));

    video.duration = 100.55;
    player = new VideoPlayer(video);
    player.init();
    assert.equal(player.getRoundedDuration(), Math.round(video.duration));
  });

  test('should return current video time in rounded sec', function () {

    video.currentTime = NaN;
    player = new VideoPlayer(video);
    player.init();
    assert.equal(player.getRoundedCurrentTime(), 0);

    video.currentTime = 100;
    player = new VideoPlayer(video);
    player.init();
    assert.equal(player.getRoundedCurrentTime(), Math.round(video.currentTime));

    video.currentTime = 100.01;
    player = new VideoPlayer(video);
    player.init();
    assert.equal(player.getRoundedCurrentTime(), Math.round(video.currentTime));

    video.currentTime = 100.55;
    player = new VideoPlayer(video);
    player.init();
    assert.equal(player.getRoundedCurrentTime(), Math.round(video.currentTime));
  });

  test('should show video element', function () {
    video.hidden = true;
    player.show();
    assert.isFalse(video.hidden);
  });

  test('should hide video element', function () {
    video.hidden = false;
    player.hide();
    assert.isTrue(video.hidden);
  });

  test('should load video src url', function () {
    player.load(videoURL);
    assert.equal(video.src, videoURL);
  });

  test('should release video src url', function () {
    video.src = videoURL;
    player.release();
    assert.equal(video.src, '');
  });

  test('should play', function () {
    var exp = sinon.mock(video);
    exp.expects('play').once();
    player.play();
    exp.verify();
  });

  test('should pause', function () {
    var exp = sinon.mock(video);
    exp.expects('pause').once();
    player.pause();
    exp.verify();
  });

  test('should seek with loading metadata', function () {
    var exp = video.currentTime + 10;
    video.src = videoURL;
    video.load();
    player.seek(exp);
    assert.equal(video.currentTime, exp);
  });

  test('should not seek without loading metadata', function () {
    var origin = video.currentTime;
    player.seek(origin + 10);
    assert.equal(video.currentTime, origin);
  });

  suite('Event handling', function () {

    var exp;

    setup(function () {
      exp = sinon.mock(player);
    });

    test('should handle the loadedmetadata event', function () {
      var t = video.currentTime + 10;
      exp.expects('seek').once().withExactArgs(t);
      player.handleEvent({ type : 'loadedmetadata' });
      player.seek(t);
      exp.verify();
    });

    test('should handle the playing event', function () {
      exp.expects('show').once();
      player.handleEvent({ type : 'playing' });
      exp.verify();
    });
  });

  suite('Time parsing', function () {

    var act, exp = {};

    var toSec = (t) => {
      return t.hh * 3600 + t.mm * 60 + t.ss;
    };

    test('should parse hh well', function () {

      exp.hh = 99;
      exp.mm = 0;
      exp.ss = 0;

      act = player.parseTime(toSec(exp));
      assert.equal(act.hh, exp.hh);
      assert.equal(act.mm, exp.mm);
      assert.equal(act.ss, exp.ss);
    });

    test('should parse mm well', function () {

      exp.hh = 0;
      exp.mm = 59;
      exp.ss = 0;

      act = player.parseTime(toSec(exp));
      assert.equal(act.hh, exp.hh);
      assert.equal(act.mm, exp.mm);
      assert.equal(act.ss, exp.ss);
    });

    test('should parse ss well', function () {

      exp.hh = 0;
      exp.mm = 0;
      exp.ss = 59;

      act = player.parseTime(toSec(exp));
      assert.equal(act.hh, exp.hh);
      assert.equal(act.mm, exp.mm);
      assert.equal(act.ss, exp.ss);
    });

    test('should parse hh, mm and ss well', function () {

      exp.hh = 39;
      exp.mm = 28;
      exp.ss = 17;

      act = player.parseTime(toSec(exp));
      assert.equal(act.hh, exp.hh);
      assert.equal(act.mm, exp.mm);
      assert.equal(act.ss, exp.ss);
    });

    test('should parse zero sec well', function () {
      act = player.parseTime(0);
      assert.equal(act.hh, 0);
      assert.equal(act.mm, 0);
      assert.equal(act.ss, 0);
    });

    test('should parse negative time well', function () {
      act = player.parseTime(-1234567890);
      assert.equal(act.hh, 0);
      assert.equal(act.mm, 0);
      assert.equal(act.ss, 0);
    });
  });
});
