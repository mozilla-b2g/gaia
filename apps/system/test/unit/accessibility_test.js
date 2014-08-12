'use strict';
/* global MocksHelper, Accessibility */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/accessibility.js');

var mocksForA11y = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/Accessibility', function() {

  var accessibility;

  var vcChangeKeyDetails = {
    eventType: 'vc-change',
    options: { pattern: [40], isKey: true }
  };

  var vcChangeNotKeyDetails = {
    eventType: 'vc-change',
    options: { pattern: [40], isKey: false }
  };

  var clickActionDetails = {
    eventType: 'action',
    data: [{ string: 'clickAction' }]
  };

  var liveRegionDetails = {
    eventType: 'liveregion-change',
    data: [{'string': 'hidden'}, 'Hiding live region'],
    options: { enqueue: true }
  };

  function getAccessFuOutput(aDetails) {
    return {
      detail: {
        type: 'accessfu-output',
        details: JSON.stringify(aDetails)
      }
    };
  }

  function getVolumeUp() {
    return {
      detail: { type: 'volume-up-button-press' },
      timeStamp: Date.now() * 1000
    };
  }

  function getVolumeDown() {
    return {
      detail: { type: 'volume-down-button-press' },
      timeStamp: Date.now() * 1000
    };
  }

  mocksForA11y.attachTestHelpers();
  setup(function() {
    accessibility = new Accessibility();
  });

  suite('handle volume button events', function() {
    test('volume up handler', function() {
      var stubHandleVolumeButtonPress = this.sinon.stub(accessibility,
        'handleVolumeButtonPress');
      var volumeUp = getVolumeUp();
      accessibility.handleEvent(volumeUp);
      assert.isTrue(stubHandleVolumeButtonPress.called);
      assert.isTrue(stubHandleVolumeButtonPress.calledWith(volumeUp));
    });

    test('volume down handler', function() {
      var stubHandleVolumeButtonPress = this.sinon.stub(accessibility,
        'handleVolumeButtonPress');
      var volumeDown = getVolumeDown();
      accessibility.handleEvent(volumeDown);
      assert.isTrue(stubHandleVolumeButtonPress.called);
      assert.isTrue(stubHandleVolumeButtonPress.calledWith(volumeDown));
    });

    test('reset', function() {
      var stubReset = this.sinon.stub(accessibility, 'reset');
      accessibility.handleEvent(getVolumeDown());
      assert.isTrue(stubReset.called);
    });

    test('announce screen reader', function() {
      var stubAnnounceScreenReader = this.sinon.stub(accessibility,
        'announceScreenReader');
      // Toggle volume up + volume down sequence three times.
      for (var i = 0; i < 3; ++i) {
        accessibility.handleEvent(getVolumeUp());
        accessibility.handleEvent(getVolumeDown());
      }
      assert.isTrue(stubAnnounceScreenReader.called);
    });
  });

  suite('handle accessfu-output events', function() {
    test('handleAccessFuOutput', function() {
      var stubHandleAccessFuOutput = this.sinon.stub(accessibility,
        'handleAccessFuOutput');
      accessibility.handleEvent(getAccessFuOutput(vcChangeKeyDetails));
      assert.isTrue(stubHandleAccessFuOutput.called);
      assert.isTrue(stubHandleAccessFuOutput.calledWith(vcChangeKeyDetails));
    });

    test('vc-change key event', function() {
      var stub_playSound = this.sinon.stub(accessibility,
        '_playSound');
      var stubSpeak = this.sinon.stub(accessibility, 'speak');
      accessibility.handleEvent(getAccessFuOutput(vcChangeKeyDetails));
      assert.isTrue(stub_playSound.called);
      assert.isTrue(stub_playSound.calledWith('vcKeyAudio'));
      assert.isTrue(stubSpeak.called);
    });

    test('vc-change not key event', function() {
      var stub_playSound = this.sinon.stub(accessibility,
        '_playSound');
      var stubSpeak = this.sinon.stub(accessibility, 'speak');
      accessibility.handleEvent(getAccessFuOutput(vcChangeNotKeyDetails));
      assert.isTrue(stub_playSound.called);
      assert.isTrue(stub_playSound.calledWith('vcMoveAudio'));
      assert.isTrue(stubSpeak.called);
    });

    test('action click event', function() {
      var stub_playSound = this.sinon.stub(accessibility,
        '_playSound');
      var stubSpeak = this.sinon.stub(accessibility, 'speak');
      accessibility.handleEvent(getAccessFuOutput(clickActionDetails));
      assert.isTrue(stub_playSound.called);
      assert.isTrue(stub_playSound.calledWith('clickedAudio'));
      assert.isFalse(stubSpeak.called);
    });

    test('liveregion change event', function() {
      var stub_playSound = this.sinon.stub(accessibility,
        '_playSound');
      var stubSpeak = this.sinon.stub(accessibility, 'speak');
      accessibility.handleEvent(getAccessFuOutput(liveRegionDetails));
      assert.isFalse(stub_playSound.called);
      assert.isTrue(stubSpeak.called);
      assert.isTrue(stubSpeak.calledWith(liveRegionDetails.data, null,
        liveRegionDetails.options));
    });
  });

});
