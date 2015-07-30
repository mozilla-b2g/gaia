/* global PlayingIcon, Service */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/playing_icon.js');

suite('system/PlayingIcon', function() {
  var subject;
  var fakeRecordingIcon = {
    name: 'RecordingIcon',
    isVisible: function() {}
  };
  var manager = {
    currentChannel: 'none'
  };

  setup(function() {
    subject = new PlayingIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('No audio is playing', function() {
    manager.currentChannel = 'none';
    subject.update();
    assert.isFalse(subject.isVisible());
  });

  test('Content channel is playing', function() {
    manager.currentChannel = 'content';
    subject.update();
    assert.isTrue(subject.isVisible());
  });

  test('Content channel is playing with recording icon active', function() {
    manager.currentChannel = 'content';
    Service.registerState('isVisible', fakeRecordingIcon);
    this.sinon.stub(fakeRecordingIcon, 'isVisible').returns(true);
    subject.update();
    assert.isFalse(subject.isVisible());
    Service.unregisterState('isVisible', fakeRecordingIcon);
  });
});
