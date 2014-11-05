'use strict';

(function(module) {
  var LockScreenMediaPlayChecks = function() {
    this.Ensure = require('./ensure.js');
    this.FakeMusic = require('./media_playback_fake_music.js');
    this.assert = require('assert');
    this.selector = {
      // should use it in the frame
      lockScreenContainer: '#lockscreen-media-container',
      trackElement: '#lockscreen-media-container .track',
      playPauseElement: '#lockscreen-media-container .play-pause',
    };
    this.fakeMusicInfo = new this.FakeMusic();
    // XXX: when it becomes an app, should has its own app info class.
    this.lockScreenFrameOrigin = 'app://lockscreen.gaiamobile.org';
  };

  LockScreenMediaPlayChecks.prototype.start =
  function (client) {
    this.client = client;
    return this;
  };

  LockScreenMediaPlayChecks.prototype.ensure =
  function (condition, name) {
    var ensure = (new this.Ensure()).start(this.client);
    return ensure;
  };

  LockScreenMediaPlayChecks.prototype.containerShown =
  function (requireDisplayed) {
    var displayed = this.ensure()
      .frame(this.lockScreenFrameOrigin)
      .element(this.client.findElement(
        this.selector.lockScreenContainer))
      .elements.current.displayed();

    this.assert.equal(displayed, requireDisplayed,
      'the container.displayed is NOT ' + requireDisplayed);
    return this;
  };

  LockScreenMediaPlayChecks.prototype.nowPlayingText =
  function (artist, title) {
    var selected =
      this.ensure()
      .frame(this.lockScreenFrameOrigin)
      .element(this.client.findElement(
          this.selector.trackElement))
      .as('track')
      .elements;
    this.assert.equal(artist + ' — ' + title,
      selected.track.text(),
      'the track doesn\'t match the expected one: ' +
      artist + ' — ' + title +
      ' vs.' +
      selected.track.text());
  };

  LockScreenMediaPlayChecks.prototype.isPlaying =
  function (should) {
    var button = this.ensure()
      .frame(this.lockScreenFrameOrigin)
      .element(this.client.findElement(this.selector.playPauseElement))
      .elements.current;
    if (true === should) {
      return button.getAttribute('data-icon') === 'pause';
    } else if (false === should) {
      return button.getAttribute('data-icon') !== 'pause';
    }
  };

  module.exports = LockScreenMediaPlayChecks;
})(module);
