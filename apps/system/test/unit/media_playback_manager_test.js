'use strict';

requireApp('system/js/media_playback_manager.js');

suite('system/MediaPlaybackManager', function() {
  var subject;
  setup(function() {
    subject = new window.MediaPlaybackManager();
  });

  teardown(function() {
    subject = null;
  });

  test('it would receive the player app\'s information', function() {
    var origin = 'app://fakemusic.gaiamobile.org',
        message = {
        'type': 'appinfo',
        'data': {
          'origin': origin
        }
      };
    subject.handleEvent(
      new CustomEvent('iac-mediacomms', {'detail': message} ));
    assert.equal(origin, subject.states.apporigin,
      'message of notifying appinfo did\'t let manager register the origin');
  });

  test('it would fire the correspond message while the app got terminated',
  function() {
    var stubPostMessage = this.sinon.stub(subject, 'postMessage'),
        origin = 'app://fakemusic.gaiamobile.org',
        message = {
        'type': 'appinfo',
        'data': {
          'origin': origin
        }
      };
    subject.handleEvent(
      new CustomEvent('iac-mediacomms', {'detail': message} ));
    subject.handleEvent(
      new CustomEvent('appterminated',{
        'detail': {
            'origin': origin
          }
        }
      ));
    assert.isTrue(stubPostMessage.called,
      'appterminated wasn\'t handled by the manager');
  });
});
