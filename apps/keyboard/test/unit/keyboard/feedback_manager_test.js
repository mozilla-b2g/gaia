'use strict';

/* global VibrationFeedback, SoundFeedback, FeedbackManager,
          MockNavigatorMozSettings, MockNavigatorMozSettingsLock,
          SettingsPromiseManager, SoundFeedbackPlayer */

require('/js/keyboard/feedback_manager.js');
require('/js/keyboard/settings.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');

require('/js/keyboard/sound_feedback_player.js');

suite('VibrationFeedback', function() {
  var realMozSettings;
  var feedback;
  var mozSettings;
  var lock;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    lock = new MockNavigatorMozSettingsLock();
    this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var promiseManager = new SettingsPromiseManager();

    feedback = new VibrationFeedback({
      settingsPromiseManager: promiseManager
    });
    feedback.start();
  });

  suite('init with vibrate=true', function() {
    setup(function(done) {
      var req = lock.get.getCall(0).returnValue;
      req.fireSuccess({ 'keyboard.vibration': true });

      feedback.settings.initSettings().then(function() {
      }).then(done, done);
    });

    test('vibrate', function() {
      this.sinon.stub(navigator, 'vibrate');

      feedback.triggerFeedback();
      assert.isTrue(navigator.vibrate.calledOnce);
    });

    test('change to vibrate=false', function() {
      mozSettings.dispatchSettingChange('keyboard.vibration', false);

      this.sinon.stub(navigator, 'vibrate');

      feedback.triggerFeedback();
      assert.equal(navigator.vibrate.calledOnce, false);
    });
  });

  suite('init with vibrate=false', function() {
    setup(function(done) {
      var req = lock.get.getCall(0).returnValue;
      req.fireSuccess({ 'keyboard.vibration': false });

      feedback.settings.initSettings().then(function() {
      }).then(done, done);
    });

    test('vibrate', function() {
      this.sinon.stub(navigator, 'vibrate');

      feedback.triggerFeedback();
      assert.equal(navigator.vibrate.calledOnce, false);
    });

    test('change to vibrate=true', function() {
      mozSettings.dispatchSettingChange('keyboard.vibration', true);

      this.sinon.stub(navigator, 'vibrate');

      feedback.triggerFeedback();
      assert.isTrue(navigator.vibrate.calledOnce);
    });
  });

  test('not ready -- don\'t vibrate', function() {
    this.sinon.stub(navigator, 'vibrate');

    feedback.triggerFeedback();
    assert.equal(navigator.vibrate.calledOnce, false);
  });
});

suite('SoundFeedback', function() {
  var realMozSettings;
  var feedback;
  var mozSettings;
  var lock;

  var normalTarget;
  var specialTarget;

  var stubSoundFeedbackPlayer;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    lock = new MockNavigatorMozSettingsLock();
    this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var promiseManager = new SettingsPromiseManager();

    stubSoundFeedbackPlayer =
      this.sinon.stub(Object.create(SoundFeedbackPlayer.prototype));
    this.sinon.stub(window, 'SoundFeedbackPlayer')
      .returns(stubSoundFeedbackPlayer);

    normalTarget = {
      keyCode: 60,
      isSpecialKey: false
    };

    specialTarget = {
      keyCode: 60,
      isSpecialKey: true
    };

    feedback = new SoundFeedback({
      settingsPromiseManager: promiseManager
    });
    feedback.start();
  });

  suite('init with sound=true', function() {
    setup(function(done) {
      var req = lock.get.getCall(0).returnValue;
      req.fireSuccess({ 'keyboard.clicksound': true });
      var req1 = lock.get.getCall(1).returnValue;
      req1.fireSuccess({ 'audio.volume.notification': 10 });

      feedback.settings.initSettings().then(function() {
      }).then(function() {
        assert.isTrue(stubSoundFeedbackPlayer.prepare.calledOnce);
      }).then(done, done);
    });

    test('sound (normal key)', function() {
      feedback.triggerFeedback(normalTarget);
      assert.isTrue(stubSoundFeedbackPlayer.play.calledWith(false));
    });

    test('sound (special key)', function() {
      feedback.triggerFeedback(specialTarget);
      assert.isTrue(stubSoundFeedbackPlayer.play.calledWith(true));
    });

    test('change to sound=false', function() {
      mozSettings.dispatchSettingChange('keyboard.clicksound', false);

      assert.equal(feedback.player, null, 'player should be dropped');

      feedback.triggerFeedback(normalTarget);
      feedback.triggerFeedback(specialTarget);
      assert.isFalse(stubSoundFeedbackPlayer.play.called);
    });

    suite('activate', function() {
      setup(function() {
        feedback.activate();

        assert.isTrue(stubSoundFeedbackPlayer.activate.called);
      });

      test('deactivate', function() {
        feedback.deactivate();

        assert.isTrue(stubSoundFeedbackPlayer.deactivate.called);
      });
    });
  });

  suite('init with sound=false', function() {
    setup(function(done) {
      var req = lock.get.getCall(0).returnValue;
      req.fireSuccess({ 'keyboard.clicksound': false });
      var req1 = lock.get.getCall(1).returnValue;
      req1.fireSuccess({ 'audio.volume.notification': 10 });

      feedback.settings.initSettings().then(function() {
      }).then(function() {
        assert.isFalse(stubSoundFeedbackPlayer.prepare.calledOnce);
      }).then(done, done);
    });

    test('sound (normal key)', function() {
      assert.equal(feedback.player, null, 'player should be dropped');

      feedback.triggerFeedback(normalTarget);
      assert.isFalse(stubSoundFeedbackPlayer.play.called);
    });

    test('sound (special key)', function() {
      assert.equal(feedback.player, null, 'player should be dropped');

      feedback.triggerFeedback(specialTarget);
      assert.isFalse(stubSoundFeedbackPlayer.play.called);
    });

    test('change to sound=true and sound (normal key)', function() {
      mozSettings.dispatchSettingChange('keyboard.clicksound', true);

      assert.isTrue(stubSoundFeedbackPlayer.prepare.calledOnce);

      feedback.triggerFeedback(normalTarget);
      assert.isTrue(stubSoundFeedbackPlayer.play.calledWith(false));
    });

    test('change to sound=true and sound (special key)', function() {
      mozSettings.dispatchSettingChange('keyboard.clicksound', true);

      assert.isTrue(stubSoundFeedbackPlayer.prepare.calledOnce);

      feedback.triggerFeedback(specialTarget);
      assert.isTrue(stubSoundFeedbackPlayer.play.calledWith(true));
    });


    suite('activate', function() {
      setup(function() {
        feedback.activate();
      });

      test('deactivate', function() {
        feedback.deactivate();
      });
    });
  });
});

suite('FeedbackManager', function() {
  test('start, feedback, stop', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    var stubSoundFeedbackPlayer =
      this.sinon.stub(Object.create(SoundFeedbackPlayer.prototype));
    this.sinon.stub(window, 'SoundFeedbackPlayer')
      .returns(stubSoundFeedbackPlayer);

    this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var normalTarget = {
      keyCode: 60,
      isSpecialKey: false
    };

    var specialTarget = {
      keyCode: 60,
      isSpecialKey: true
    };

    var app = {
      settingsPromiseManager: new SettingsPromiseManager()
    };

    var feedbackManager = new FeedbackManager(app);
    feedbackManager.start();
    feedbackManager.activate();

    var req = lock.get.getCall(0).returnValue;
    req.fireSuccess({ 'keyboard.vibration': true });
    var req1 = lock.get.getCall(1).returnValue;
    req1.fireSuccess({ 'keyboard.clicksound': true });
    var req2 = lock.get.getCall(2).returnValue;
    req2.fireSuccess({ 'audio.volume.notification': 10 });

    feedbackManager.soundFeedback.settings.initSettings().then(function() {
      assert.isTrue(stubSoundFeedbackPlayer.activate.called);

      this.sinon.stub(navigator, 'vibrate');

      feedbackManager.triggerFeedback(normalTarget);

      assert.isTrue(stubSoundFeedbackPlayer.play.calledWith(false));
      assert.isTrue(navigator.vibrate.calledOnce);

      feedbackManager.triggerFeedback(specialTarget);

      assert.isTrue(stubSoundFeedbackPlayer.play.calledWith(true));
      assert.isTrue(navigator.vibrate.calledTwice);

      feedbackManager.stop();
    }.bind(this)).then(done, done);
  });
});
