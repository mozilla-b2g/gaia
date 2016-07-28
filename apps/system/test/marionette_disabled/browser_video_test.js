'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar');
var VideoPlayer = require('../../../system/test/marionette/lib/video_player');
var assert = require('assert');

marionette('Video', function() {
  var system, actions, rocketbar, client, server, player;

  var ACCEPTABLE_DELAY = 0.2;

  client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    system = client.loader.getAppClass('system');
    player = new VideoPlayer(client);
    rocketbar = new Rocketbar(client);
    actions = client.loader.getActions();
    system.waitForFullyLoaded();
  });

  // https://moztrap.mozilla.org/manage/case/6073/
  test('Confirm video playback', function() {
    var videoUrl = server.url('VID_0001.webm');
    rocketbar.homescreenFocus();
    rocketbar.enterText(videoUrl, true);
    var browserFrame = system.waitForUrlLoaded(videoUrl);
    client.switchToFrame(browserFrame);

    player.waitForVideoLoaded();
    assert(player.isPlaying());

    player.invokeControls();

    var stoppedAt = player.currentTimestamp;
    player.tapPause();
    assert(!player.isPlaying());

    var resumedAt = player.currentTimestamp;
    player.tapPlay();
    player.waitForVideoLoaded();
    assert(player.isPlaying());

    assert(stoppedAt - resumedAt < ACCEPTABLE_DELAY);

    player.invokeControls();
    player.tapMute();
    player.tapUnmute();

    player.invokeControls();
    player.tapFullscreen();

    client.switchToFrame();
    client.waitFor(function() {
      return system.permissionDialog.displayed();
    });

    system.permissionYes.tap();
    system.gotoBrowser(videoUrl);

    client.waitFor(function() {
      return player.isFullScreen();
    });

    client.helper.wait (1000);
    player.invokeControls();
    player.tapFullscreen();

    client.waitFor(function() {
      return !player.isFullScreen() && !player.visibleControls();
    });
  });
});
