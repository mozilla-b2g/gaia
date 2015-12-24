/* jshint node: true*/
/* global marionette, setup, test*/
'use strict';

var System = require('./lib/system');
var assert = require('assert');

marionette('Audio channels which belong to system app', function() {
  var client = marionette.client();
  var sys;

  setup(function() {
    client.setScriptTimeout(20000);
    sys = new System(client);
  });

  // XXX: Will be enabled after Bug 1235011 is fixed.
  // Currently, there is no
  // `navigator.mozAudioChannelManager.allowedAudioChannels` object
  // in b2g desktop client.
  // SystemWindow will not declare any audio channel controller object
  // for System app.
  test.skip('System app should have ' +
            'all kinds of audio channel permissions', function() {
    sys.waitForStartup();
    var audioChannels = client.executeScript(function() {
      return window.wrappedJSObject.core.appCore.systemWindow
        .getAudioChannels();
    });
    assert.equal(audioChannels.size, 8);
    ['normal', 'content', 'alarm', 'system', 'ringer', 'telephony',
     'notification', 'publicnotification'].forEach(function(audioChannel) {
      assert.equal(audioChannels.get(audioChannel).name, audioChannel);
    });
  });

  test('All kinds of audio channels can be declared in System app', function() {
    ['normal', 'content', 'alarm', 'system', 'ringer', 'telephony',
     'notification', 'publicnotification'].forEach(function(audioChannel) {
      var audioChannelType = client.executeScript(function(audioChannel) {
        var audio = new Audio();
        audio.mozAudioChannelType = audioChannel;
        return audio.mozAudioChannelType;
      }, [audioChannel]);
      assert.equal(audioChannelType, audioChannel);
    });
  });
});
