'use strict';
/* global MocksHelper, MockSpeechSynthesis, MockSpeechSynthesisUtterance,
          Accessibility, SettingsListener, MockL10n, Service,
          MockSettingsHelper */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');
requireApp('system/test/unit/mock_speech_synthesis.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/accessibility.js');
requireApp('system/js/accessibility_quicknav_menu.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_service.js');

var mocksForA11y = new MocksHelper([
  'SettingsListener',
  'SettingsHelper',
  'LazyLoader',
  'Service'
]).init();

suite('system/Accessibility', function() {

  var accessibility, speechSynthesizer, screenNode;

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

  var fakeFTUCommsStarted = {
    type: 'iac-ftucomms',
    detail: 'started',
    timeStamp: Date.now()
  };

  var fakeFTUCommsStep = {
    type: 'iac-ftucomms',
    detail: { type: 'step', hash: '#foo' },
    timeStamp: Date.now()
  };

  var fakeAppwillopen = {
    type: 'appwillopen'
  };

  var fakeHomescreenopening = {
    type: 'homescreenopening'
  };

  var fakeAppopened = {
    type: 'appopened',
    detail: { name: 'test-app' }
  };

  var fakeHomescreenopened = {
    type: 'homescreenopened',
    detail: { name: 'homescreen-app' }
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
    screenNode = document.createElement('div');
    screenNode.id = 'screen';
    document.body.appendChild(screenNode);
    accessibility = new Accessibility();
    accessibility.start();
    speechSynthesizer = accessibility.speechSynthesizer;
    this.sinon.stub(speechSynthesizer, 'speech', MockSpeechSynthesis);
    this.sinon.stub(speechSynthesizer, 'utterance',
      MockSpeechSynthesisUtterance);
    MockSettingsHelper.instances['language.current'] = { value: 'en-US' };
    navigator.mozL10n = MockL10n;
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    screenNode.parentNode.removeChild(screenNode);
  });

  test('logohidden handler', function() {
    var stubActivateScreen = this.sinon.stub(accessibility,
      'activateScreen');
    accessibility.handleEvent(fakeLogoHidden);
    assert.isTrue(stubActivateScreen.called);
  });

  suite('ftu events', function() {
    test('ftucomms started handler', function() {
      var stubHandleFTUStarted = this.sinon.stub(accessibility,
        'handleFTUStarted');
      accessibility.handleEvent(fakeFTUCommsStarted);
      assert.isTrue(stubHandleFTUStarted.calledWith(fakeFTUCommsStarted));
    });

    test('ftustep handler', function() {
      var stubHandleFTUStep = this.sinon.stub(accessibility, 'handleFTUStep');
      accessibility.handleEvent(fakeFTUCommsStep);
      assert.isTrue(stubHandleFTUStep.called);
    });

    test('handleFTUStep', function() {
      var stubReset = this.sinon.stub(accessibility, 'reset');
      var stubCancelSpeech = this.sinon.stub(accessibility, 'cancelSpeech');
      var spyDisableFTUStartedTimeout = this.sinon.spy(accessibility,
        'disableFTUStartedTimeout');
      var stubRemoveEventListener = this.sinon.stub(window,
        'removeEventListener');
      accessibility.FTUStartedTimeout = {};

      accessibility.handleFTUStep();

      assert.ok(!accessibility.FTUStartedTimeout);
      assert.isTrue(stubReset.called);
      assert.isTrue(stubCancelSpeech.called);
      assert.isTrue(spyDisableFTUStartedTimeout.called);
      assert.isTrue(stubRemoveEventListener.calledWith('iac-ftucomms',
        accessibility));
    });

    test('handleFTUStarted screen reader turned off', function(done) {
      var stubReset = this.sinon.stub(accessibility, 'reset');
      var stubCancelSpeech = this.sinon.stub(accessibility, 'cancelSpeech');
      var stubAnnounceScreenReader = this.sinon.stub(accessibility,
        'announceScreenReader').returns(Promise.resolve());
      SettingsListener.mTriggerCallback('accessibility.screenreader', false);
      accessibility.FTU_STARTED_TIMEOUT = 0;

      accessibility.handleFTUStarted();
      // Wait until the FTU_STARTED_TIMEOUT expires.
      setTimeout(() => {
        assert.isTrue(stubReset.called);
        assert.isTrue(stubCancelSpeech.called);
        assert.isTrue(stubAnnounceScreenReader.called);
        done();
      }, 10);
    });

    test('handleFTUStarted screen reader turned on', function() {
      SettingsListener.mTriggerCallback('accessibility.screenreader', true);
      // make sure the timeout starts false and stays false
      assert.ok(!this.FTUStartedTimeout);

      accessibility.handleFTUStarted();
      assert.ok(!this.FTUStartedTimeout);
      // Turn the screen reader back off.
      SettingsListener.mTriggerCallback('accessibility.screenreader', false);
    });
  });

  suite('screenreader speak - screenreader off', function () {
    test('screenreader off', function () {
      var stubSpeak = this.sinon.stub(speechSynthesizer,
        'speak').returns(Promise.resolve());
      accessibility.speak(fakeSentence, {});
      assert.isTrue(stubSpeak.notCalled);
    });

    test('screenreader off, forced', function () {
      var stubSpeak = this.sinon.stub(speechSynthesizer,
        'speak').returns(Promise.resolve());
      accessibility.speak(fakeSentence, {force: true});
      assert.isTrue(stubSpeak.called);
    });
  });

  suite('screenreader speak - screenreader on', function () {
    setup(function() {
      // Enable screenreader
      SettingsListener.mTriggerCallback('accessibility.screenreader', true);
    });

    teardown(function() {
      // Disable screenreader
      SettingsListener.mTriggerCallback('accessibility.screenreader', false);
    });

    test('screenreader on', function () {
      var stubSpeak = this.sinon.stub(speechSynthesizer,
        'speak').returns(Promise.resolve());
      accessibility.speak(fakeSentence, {});
      assert.isTrue(stubSpeak.called);
    });

    test('screenreader on, forced', function () {
      var stubSpeak = this.sinon.stub(speechSynthesizer,
        'speak').returns(Promise.resolve());
      accessibility.speak(fakeSentence, {force: true});
      assert.isTrue(stubSpeak.called);
    });
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
        'announceScreenReader').returns(Promise.resolve());
      var stubDisableFTUStartedTimeout = this.sinon.stub(accessibility,
        'disableFTUStartedTimeout');
      // Toggle volume up + volume down sequence three times.
      for (var i = 0; i < 3; ++i) {
        accessibility.handleEvent(getVolumeUp());
        accessibility.handleEvent(getVolumeDown());
      }
      assert.isTrue(stubAnnounceScreenReader.called);
      assert.isTrue(stubDisableFTUStartedTimeout.called);
    });

    test('announce screen reader - force option', function() {
      var stubSpeak = this.sinon.stub(accessibility, 'speak').returns(
        Promise.resolve());
      accessibility.announceScreenReader();
      assert.isTrue(stubSpeak.called);

      // asserts that the force option is enabled
      assert.isTrue(stubSpeak.getCall(0).args[1].force);
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
    var stubSpeak;
    setup(function() {
      stubSpeak = this.sinon.stub(accessibility, 'speak').returns(
        Promise.resolve());
    });
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
      accessibility.handleEvent(getAccessFuOutput(vcChangeKeyDetails));
      assert.isTrue(stub_playSound.called);
      assert.isTrue(stub_playSound.calledWith('vcKeyAudio'));
      assert.isTrue(stubSpeak.called);
    });

    test('vc-change not key event', function() {
      var stub_playSound = this.sinon.stub(accessibility,
        '_playSound');
      accessibility.handleEvent(getAccessFuOutput(vcChangeNotKeyDetails));
      assert.isTrue(stub_playSound.called);
      assert.isTrue(stub_playSound.calledWith('vcMoveAudio'));
      assert.isTrue(stubSpeak.called);
    });

    test('action click event', function() {
      var stub_playSound = this.sinon.stub(accessibility,
        '_playSound');
      accessibility.handleEvent(getAccessFuOutput(clickActionDetails));
      assert.isTrue(stub_playSound.called);
      assert.isTrue(stub_playSound.calledWith('clickedAudio'));
      assert.isFalse(stubSpeak.called);
    });

    test('liveregion change event', function() {
      var stub_playSound = this.sinon.stub(accessibility,
        '_playSound');
      accessibility.handleEvent(getAccessFuOutput(liveRegionDetails));
      assert.isFalse(stub_playSound.called);
      assert.isTrue(stubSpeak.called);
      assert.deepEqual(liveRegionDetails.data, stubSpeak.args[0][0]);
      assert.deepEqual(liveRegionDetails.options, stubSpeak.args[0][1]);
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
    setup(function() {
      // Enable screenreader
      SettingsListener.mTriggerCallback('accessibility.screenreader', true);
    });

    teardown(function() {
      // Disable screenreader
      SettingsListener.mTriggerCallback('accessibility.screenreader', false);
    });

    test('handle vc change event with hints enabled', function(done) {
      var stubSetHintsTimeout = this.sinon.stub(accessibility,
        'setHintsTimeout');
      this.sinon.stub(accessibility, 'speak').returns(
        Promise.resolve());
      accessibility.handleAccessFuOutput(vcChangeHintsEnabledDetails);
      setTimeout(() => {
        assert.isTrue(stubSetHintsTimeout.called);
        assert.isTrue(stubSetHintsTimeout.calledWith(
          vcChangeHintsEnabledDetails.options.hints));
        done();
      });
    });

    test('make sure hints are canceled on screen off', function() {
      var stubCancelHints = this.sinon.stub(accessibility, 'cancelHints');
      accessibility.handleEvent(screenChangeScreenDisabledEvent);
      assert.isTrue(stubCancelHints.called);
    });

    test('make sure hints are canceled with output/control event', function(){
      var stubCancelHints = this.sinon.stub(accessibility, 'cancelHints');

      // Output event
      accessibility.handleAccessFuOutput(vcChangeHintsEnabledDetails);
      assert.isTrue(stubCancelHints.called);

      // Control event
      accessibility.handleAccessFuControl({});
      assert.isTrue(stubCancelHints.called);
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
        var stubSpeak = this.sinon.stub(accessibility, 'speak').returns(
          Promise.resolve());
        accessibility.setHintsTimeout(
          vcChangeHintsEnabledDetails.options.hints);
        clock.tick(accessibility.HINTS_TIMEOUT + 50);
        assert.isTrue(stubSpeak.called);
      });

    });
  });

  suite('screenreader shade', function() {
    test('turn shade on when screenreader is off', function() {
      var stubRequest = this.sinon.stub(Service, 'request');
      var stubSpeak = this.sinon.stub(accessibility, 'speak');
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader-shade', true);
      assert.isFalse(stubRequest.calledWith('turnShadeOn'));
      assert.isFalse(stubSpeak.called);
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader-shade', false);
      assert.isFalse(stubSpeak.called);
    });

    test('turn shade on when screenreader is on', function() {
      var stubRequest = this.sinon.stub(Service, 'request');
      var stubSpeak = this.sinon.stub(accessibility, 'speak').returns(
        Promise.resolve());
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader', true);
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader-shade', true);
      assert.isTrue(stubRequest.calledWith('turnShadeOn'));
      assert.isTrue(stubSpeak.called);
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader-shade', false);
      assert.isTrue(stubRequest.calledWith('turnShadeOff'));
      assert.isTrue(stubSpeak.calledThrice);
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader', false);
    });

    test('turn screenreader on and off when shade is on', function() {
      var stubRequest = this.sinon.stub(Service, 'request');
      var stubSpeak = this.sinon.stub(accessibility, 'speak').returns(
        Promise.resolve());
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader-shade', true);
      assert.isFalse(stubRequest.calledWith('turnShadeOn'));
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader', true);
      // If shade is on, it is announced after the screen reader turns on
      assert.isTrue(stubSpeak.calledTwice);
      assert.isTrue(stubRequest.calledWith('turnShadeOn'));
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader', false);
      assert.isTrue(stubRequest.calledWith('turnShadeOff'));
      SettingsListener.mTriggerCallback(
        'accessibility.screenreader-shade', false);
      // We should not get a speak for shade if the screen reader is toggled off
      // before the shade
      assert.isTrue(stubSpeak.calledThrice);
    });
  });

  suite('screenreader language support', function() {
    test('with unsupported language', function() {
      MockSettingsHelper.instances['language.current'] = { value: 'he-IL' };
      SettingsListener.mTriggerCallback('accessibility.screenreader', true);
      assert.equal(MockSettingsHelper.instances['language.current'].value,
        'en-US');
      SettingsListener.mTriggerCallback('accessibility.screenreader', false);
    });

    test('with supported language in different locale', function() {
      MockSettingsHelper.instances['language.current'] = { value: 'en-GB' };
      SettingsListener.mTriggerCallback('accessibility.screenreader', true);
      assert.equal(MockSettingsHelper.instances['language.current'].value,
        'en-GB');
      SettingsListener.mTriggerCallback('accessibility.screenreader', false);
    });
  });

  suite('app related events', function() {
    test('appwillopen/homescreenopening', function() {
      var stubPrepareForApp = this.sinon.stub(accessibility, 'prepareForApp');
      accessibility.handleEvent(fakeAppwillopen);
      assert.isTrue(stubPrepareForApp.called);

      stubPrepareForApp.reset();
      accessibility.handleEvent(fakeHomescreenopening);
      assert.isTrue(stubPrepareForApp.called);
    });

    test('prepareForApp', function() {
      accessibility.appOpening = false;
      accessibility.prepareForApp();
      assert.isTrue(accessibility.appOpening);
    });

    test('appopened/homescreenopened', function() {
      var stubAnnounceApp = this.sinon.stub(accessibility, 'announceApp');
      accessibility.handleEvent(fakeAppopened);
      assert.isTrue(stubAnnounceApp.called);
      assert.isTrue(stubAnnounceApp.calledWith(fakeAppopened.detail));

      stubAnnounceApp.reset();
      accessibility.handleEvent(fakeHomescreenopened);
      assert.isTrue(stubAnnounceApp.called);
      assert.isTrue(stubAnnounceApp.calledWith(fakeHomescreenopened.detail));
    });

    test('announceApp', function(done) {
      accessibility.appOpening = true;
      var stubSpeak = this.sinon.stub(accessibility, 'speak').returns(
        Promise.resolve());
      var stubHandleAccessFuOutput = this.sinon.stub(accessibility,
        'handleAccessFuOutput');
      var fakeLastVCChangeDetails = {test: 'test'};
      accessibility.lastVCChangeDetails = fakeLastVCChangeDetails;

      accessibility.announceApp(fakeAppopened.detail);
      assert.isTrue(stubSpeak.calledWith(fakeAppopened.detail.name));
      setTimeout(() => {
        assert.isFalse(accessibility.appOpening);
        assert.isTrue(stubHandleAccessFuOutput.calledWith(
          fakeLastVCChangeDetails));
        done();
      });
    });
  });
});
