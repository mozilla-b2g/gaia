/* global Seeker, performance */
'use strict';

requireApp('/video/js/seeker.js');

// We need a simple mock <video> element for these testsx
function MockVideo() {
  this.fastSeek = sinon.spy();
  this.seekedHandlers = [];
  this.addEventListener = function(type, handler) {
    if (type === 'seeked') {
      this.seekedHandlers.push(handler);
    }
  };
  this._fireSeekedEvent = function() {
    this.seekedHandlers.forEach((f) => {
      typeof f === 'object' ? f.handleEvent() : f();
    });
  };
}

suite('seeker.js unit tests', function() {
  var player, seeker;

  setup(function() {
    player = new MockVideo();
    seeker = new Seeker(player);
  });

  test('it calls fastSeek()', function() {
    seeker.seekTo(1);
    assert.ok(player.fastSeek.calledOnce);
    assert.ok(player.fastSeek.calledWith(1));
  });

  test('it doesn\'t seek twice to same spot', function() {
    seeker.seekTo(1);
    seeker.seekTo(1);
    assert.ok(player.fastSeek.calledOnce);
    assert.ok(player.fastSeek.calledWith(1));
  });

  test('it defers rapidly repeated seeks', function() {
    seeker.seekTo(1);
    seeker.seekTo(2);
    seeker.seekTo(3);
    seeker.seekTo(4);
    assert.ok(player.fastSeek.calledOnce);
    assert.ok(player.fastSeek.calledWith(1));
    player._fireSeekedEvent();
    assert.ok(player.fastSeek.calledTwice);
    assert.ok(player.fastSeek.calledWith(4));
    player._fireSeekedEvent();
    assert.ok(player.fastSeek.calledTwice);
  });

  test('it does not defer seeks if previous seek has ended', function() {
    seeker.seekTo(1);
    player._fireSeekedEvent();
    assert.ok(player.fastSeek.calledOnce);
    assert.ok(player.fastSeek.calledWith(1));

    seeker.seekTo(2);
    assert.ok(player.fastSeek.calledTwice);
    assert.ok(player.fastSeek.calledWith(2));
    player._fireSeekedEvent();

    seeker.seekTo(3);
    assert.ok(player.fastSeek.calledThrice);
    assert.ok(player.fastSeek.calledWith(3));
  });

  test('it does not defer seeks to 0', function() {
    seeker.seekTo(4);
    seeker.seekTo(3);
    seeker.seekTo(2);
    assert.ok(player.fastSeek.calledOnce);
    assert.ok(player.fastSeek.calledWith(4));
    seeker.seekTo(0);
    assert.ok(player.fastSeek.calledTwice);
    assert.ok(player.fastSeek.calledWith(0));
    player._fireSeekedEvent();
    assert.ok(player.fastSeek.calledTwice);
  });

  test('it does not defer long-distance seeks', function() {
    seeker.seekTo(1);
    assert.ok(player.fastSeek.calledOnce);
    assert.ok(player.fastSeek.calledWith(1));
    Seeker.SEEK_DISTANCE = 5;
    seeker.seekTo(7);
    assert.ok(player.fastSeek.calledTwice);
    assert.ok(player.fastSeek.calledWith(7));
    Seeker.SEEK_DISTANCE = 50;
    seeker.seekTo(17); // not far enough, it gets deferred
    assert.ok(player.fastSeek.calledTwice);
    assert.ok(player.fastSeek.calledWith(7));
    seeker.seekTo(58);
    assert.ok(player.fastSeek.calledThrice);
    assert.ok(player.fastSeek.calledWith(58));
    player._fireSeekedEvent();
    assert.ok(player.fastSeek.calledThrice);
  });

  test('it does not defer infrequent seeks', function() {
    // We need to fake out performance.now() for this test
    var realPerformanceNow = performance.now;
    var time = 0;
    performance.now = function() { return time; };

    try {
      seeker.seekTo(1);
      assert.ok(player.fastSeek.calledOnce);
      assert.ok(player.fastSeek.calledWith(1));
      Seeker.SEEK_INTERVAL = 10;
      time = 12;
      seeker.seekTo(2);
      assert.ok(player.fastSeek.calledTwice);
      assert.ok(player.fastSeek.calledWith(2));
      Seeker.SEEK_INTERVAL = 100;
      time = 50;
      seeker.seekTo(3);  // not enough fake time has passed, this is deferred
      assert.ok(player.fastSeek.calledTwice);
      assert.ok(player.fastSeek.calledWith(2));
      time = 113;
      seeker.seekTo(4);
      assert.ok(player.fastSeek.calledThrice);
      assert.ok(player.fastSeek.calledWith(4));
      player._fireSeekedEvent();
      assert.ok(player.fastSeek.calledThrice);
    }
    finally {
      performance.now = realPerformanceNow;
    }
  });
});
