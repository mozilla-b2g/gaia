'use strict';
/* global MocksHelper, MockSpeechSynthesis, MockSpeechSynthesisUtterance,
          Accessibility, SettingsListener, MockL10n */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_speech_synthesis.js');
requireApp('system/js/accessibility.js');
requireApp('system/js/accessibility_quicknav_menu.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForA11y = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/Accessibility', function() {

  var accessibility, speechSynthesizer;

  var vcChangeKeyDetails = {
    eventType: 'vc-change',
    options: { pattern: [40], isKey: true }
  };

  var vcChangeNotKeyDetails = {
    eventType: 'vc-change',
    options: { pattern: [40], isKey: false }
  };

  var vcChangeHintsEnabledDetails = {
      eventType: 'vc-change',
      data: [{string: 'link'}],
      options: {
        hints: [{string: 'link-hint'}]
      }
  };

  var screenChangeScreenDisabledEvent = {
    type: 'screenchange',
    detail: {
      screenEnabled: false
    }
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

  var quicknavShowDetails = {
    eventType: 'quicknav-menu'
  };

  var fakeLogoHidden = {
    type: 'logohidden'
  };

  function getAccessFuOutput(aDetails) {
    return {
      type: 'mozChromeEvent',
      detail: {
        type: 'accessibility-output',
        details: JSON.stringify(aDetails)
      }
    };
  }

  function getAccessFuControl(aDetails) {
    return {
      type: 'mozChromeEvent',
      detail: {
        type: 'accessibility-control',
        details: JSON.stringify(aDetails)
      }
    };
  }

  function getVolumeUp() {
    return {
      type: 'volumeup',
      timeStamp: Date.now() * 1000
    };
  }

  function getVolumeDown() {
    return {
      type: 'volumedown',
      timeStamp: Date.now() * 1000
    };
  }

  var fakeSentence = 'This is captions text';

  var realL10n = navigator.mozL10n;

  mocksForA11y.attachTestHelpers();
  setup(function() {
    accessibility = new Accessibility();
    accessibility.start();
    speechSynthesizer = accessibility.speechSynthesizer;
    this.sinon.stub(speechSynthesizer, 'speech', MockSpeechSynthesis);
    this.sinon.stub(speechSynthesizer, 'utterance',
      MockSpeechSynthesisUtterance);
    navigator.mozL10n = MockL10n;
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
  });

  test('logohidden handler', function() {
    var stubActivateScreen = this.sinon.stub(accessibility,
      'activateScreen');
    accessibility.handleEvent(fakeLogoHidden);
    assert.isTrue(stubActivateScreen.called);
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

  suite('speech captions', function() {
    test('no captions by default', function() {
      var stubShowSpeech = this.sinon.stub(speechSynthesizer,
        'showSpeech');
      var stubHideSpeech = this.sinon.stub(speechSynthesizer,
        'hideSpeech');
      speechSynthesizer.speak(fakeSentence, {});
      assert.isTrue(stubShowSpeech.notCalled);
      assert.isTrue(stubHideSpeech.notCalled);
    });

    test('captions when accessibility.screenreader-captions is set',
      function() {
        var stubShowSpeech = this.sinon.stub(speechSynthesizer,
          'showSpeech');
        var stubHideSpeech = this.sinon.stub(speechSynthesizer,
          'hideSpeech');
        SettingsListener.mTriggerCallback(
          'accessibility.screenreader-captions', true);
        speechSynthesizer.speak(fakeSentence, {});
        assert.isTrue(stubShowSpeech.called);
        assert.isTrue(stubHideSpeech.called);
      });

    test('showSpeech', function() {
      this.sinon.stub(document, 'getElementById').returns(
        document.createElement('div'));
      assert.isUndefined(speechSynthesizer.captionsBox);
      speechSynthesizer.showSpeech(fakeSentence);
      assert.notEqual(speechSynthesizer.captionsBox, undefined);
      assert.equal(speechSynthesizer.captionsBox.id,
        'accessibility-captions-box');
      assert.equal(speechSynthesizer.captionsBox.getAttribute('aria-hidden'),
        'true');
      assert.equal(speechSynthesizer.captionsBox.getAttribute(
        'data-z-index-level'), 'accessibility-captions');
      assert.equal(speechSynthesizer.captionsBox.innerHTML, fakeSentence);
      assert.isTrue(speechSynthesizer.captionsBox.classList.contains(
        'visible'));
    });

    test('hideSpeech', function() {
      this.sinon.stub(document, 'getElementById').returns(
        document.createElement('div'));
      this.sinon.stub(window, 'setTimeout', function(callback) {
        callback();
      });
      speechSynthesizer.showSpeech(fakeSentence);
      assert.isTrue(speechSynthesizer.captionsBox.classList.contains(
        'visible'));
      speechSynthesizer.hideSpeech();
      assert.isFalse(speechSynthesizer.captionsBox.classList.contains(
        'visible'));
    });

    test('hideSpeech immediately', function() {
      this.sinon.stub(document, 'getElementById').returns(
        document.createElement('div'));
      speechSynthesizer.showSpeech(fakeSentence);
      assert.isTrue(speechSynthesizer.captionsBox.classList.contains(
        'visible'));
      speechSynthesizer.hideSpeech(true);
      assert.isFalse(speechSynthesizer.captionsBox.classList.contains(
        'visible'));
    });
  });

  suite('handle accessibility-output events', function() {
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
      assert.deepEqual(liveRegionDetails.data, stubSpeak.args[0][0]);
      assert.equal(typeof stubSpeak.args[0][1], 'function');
      assert.deepEqual(liveRegionDetails.options, stubSpeak.args[0][2]);
    });

    test('no-move event', function() {
      var stub_playSound = this.sinon.stub(accessibility,
        '_playSound');
      accessibility.handleEvent(getAccessFuOutput({ eventType: 'no-move' }));
      assert.isTrue(stub_playSound.called);
      assert.isTrue(stub_playSound.calledWith('noMoveAudio'));
    });

  });

  suite('quicknav menu', function() {
    var screenNode;
    setup(function() {
      screenNode = document.createElement('div');
      screenNode.id = 'screen';
      document.body.appendChild(screenNode);
    });

    teardown(function() {
      screenNode.parentNode.removeChild(screenNode);
    });

    test('handle show quicknav menu event', function() {
      var stubHandleAccessFuControl = this.sinon.stub(accessibility,
        'handleAccessFuControl');
      accessibility.handleEvent(getAccessFuControl(quicknavShowDetails));
      assert.isTrue(stubHandleAccessFuControl.called);
      assert.isTrue(stubHandleAccessFuControl.calledWith(quicknavShowDetails));
    });

    test('show quicknav menu', function() {
      assert.isFalse(!!accessibility.quicknav);
      accessibility.handleAccessFuControl(quicknavShowDetails);
      assert.isTrue(!!accessibility.quicknav);
      assert.isTrue(
        accessibility.quicknav.element.classList.contains('visible'));
    });
  });

  suite('interaction hints', function() {
    test('handle vc change event with hints enabled', function() {
      var stubSetHintsTimeout = this.sinon.stub(accessibility,
        'setHintsTimeout');
      accessibility.handleAccessFuOutput(vcChangeHintsEnabledDetails);
      assert.isTrue(stubSetHintsTimeout.called);
      assert.isTrue(stubSetHintsTimeout.calledWith(
        vcChangeHintsEnabledDetails.options.hints));
    });

    test('make sure hints are canceled on screen off', function() {
      var stubCancelHints = this.sinon.stub(accessibility, 'cancelHints');
      accessibility.handleEvent(screenChangeScreenDisabledEvent);
      assert.isTrue(stubCancelHints.called);
    });

    test('make sure hints are canceled with output/control event', function(){
      // Output event
      accessibility.isSpeakingHints = true;
      accessibility.handleAccessFuOutput(vcChangeHintsEnabledDetails);
      assert.isFalse(accessibility.isSpeakingHints);

      // Control event
      accessibility.isSpeakingHints = true;
      accessibility.handleAccessFuControl({});
      assert.isFalse(accessibility.isSpeakingHints);
    });

    suite('timeout based hint tests', function(){
      var clock;

      setup(function() {
        clock = this.sinon.useFakeTimers();
      });

      teardown(function() {
        clock.restore();
      });

      test('make sure hints are spoken', function() {
        var stubSpeak = this.sinon.stub(accessibility, 'speak');
        accessibility.setHintsTimeout(
          vcChangeHintsEnabledDetails.options.hints);
        clock.tick(accessibility.HINTS_TIMEOUT + 50);
        assert.isTrue(stubSpeak.called);
      });

    });
  });
});
