'use strict';

(function(module) {
  var MediaPlayChecks = function() {
    this.Ensure = require('./ensure.js');
    this.FakeMusic = require('./media_playback_fake_music.js');
    this.assert = require('assert');
    this.selector = {
      notificationContainer: '#media-playback-container',
      trackElement: '#media-playback-container .track',
      playPauseElement: '#media-playback-container .play-pause'
    };
    this.fakeMusicInfo = new this.FakeMusic();
  };

  MediaPlayChecks.prototype.start =
  function (client) {
    this.client = client;
    return this;
  };

  MediaPlayChecks.prototype.ensure =
  function (condition, name) {
    var ensure = (new this.Ensure()).start(this.client);
    return ensure;
  };

  MediaPlayChecks.prototype.containerShown =
  function (requireDisplayed) {
    var displayed = this.ensure()
      .frame()
      .element(this.client.findElement(
        this.selector.notificationContainer))
      .elements.current.displayed();

    this.assert.equal(displayed, requireDisplayed,
      'the container.displayed is NOT ' + requireDisplayed);
    return this;
  };

  MediaPlayChecks.prototype.nowPlayingText =
  function (artist, title) {
    var selected =
      this.ensure()
      .frame(this.lockScreenFrameOrigin)
      .element(this.client.findElement(
          this.selector.trackElement))
      .as('track')
      .elements;
    this.assert.equal(title + ' — ' + artist,
      selected.track.text(),
      'the track doesn\'t match the expected one: ' +
      artist + ' — ' + title +
      ' vs.' +
      selected.track.text());
  };

  MediaPlayChecks.prototype.isPlaying =
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

  module.exports = MediaPlayChecks;
})(module);
