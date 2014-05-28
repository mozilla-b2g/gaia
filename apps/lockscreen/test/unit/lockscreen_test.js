'use strict';

mocha.globals(['LockScreen', 'LockScreenConnInfoManager',
               'MediaPlaybackWidget', 'SettingsURL', 'Clock',
               'navigator']);

requireApp('lockscreen/js/lockscreen.js');

suite('lockscreen/LockScreen >', function() {
  var stubById,
      subject;

  setup(function() {
    stubById = sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
  });

  suite('methods >', function() {
    setup(function() {
      window.Clock = function() {};
      subject = new window.LockScreen();
    });

    test('lockIfEnabled', function() {
      var stubLock = this.sinon.stub(subject, 'lock'),
          stubUnlock = this.sinon.stub(subject, 'unlock');

      subject.enabled = true;
      subject.lockIfEnabled();
      assert.isTrue(stubLock.called,
        'LockScreen#lock wasn\'t called even though the lock is enabled');

      subject.enabled = false;
      subject.lockIfEnabled();
      assert.isTrue(stubUnlock.called,
        'LockScreen#unlock wasn\'t called even though the lock is not enabled');
    });

    test('unlock', function() {
      var dispatchedEvents = [],
          stubDispatchEvent = this.sinon.stub(subject, 'dispatchEvent',
            function(type, detail) {
              dispatchedEvents.push(type);
            });

      subject.locked = true;
      subject.unlock();
      assert.isFalse(-1 === dispatchedEvents.indexOf('will-unlock'),
        'didn\'t dispatch the event: will-unlock');
      assert.isFalse(-1 === dispatchedEvents.indexOf('secure-modeoff'),
        'didn\'t dispatch the event: secure-modeoff');
      assert.isFalse(-1 === dispatchedEvents.indexOf('unlock'),
        'didn\'t dispatch the event: unlock');
      stubDispatchEvent.restore();
    });

    test('lock', function() {
      var dispatchedEvents = [],
          stubSwitchPanel = this.sinon.stub(subject, 'switchPanel'),
          stubDispatchEvent = this.sinon.stub(subject, 'dispatchEvent',
            function(type, detail) {
              dispatchedEvents.push(type);
            });

      subject.overlay = document.createElement('div');
      subject.locked = false;
      subject.lock();
      assert.isTrue(stubSwitchPanel.calledWith('main'),
        'did\'t switch to the main panel');
      assert.isFalse(-1 === dispatchedEvents.indexOf('lock'),
        'didn\'t dispatch the event: lock');
      assert.isFalse(-1 === dispatchedEvents.indexOf('secure-modeon'),
        'didn\'t dispatch the event: secure-modeon');
      stubSwitchPanel.restore();
      stubDispatchEvent.restore();
    });

    test('loadPanel', function(done) {
      var stubOverlay = document.createElement('div');
      subject.overlay = stubOverlay;
      subject.loadPanel('main', function() {
        assert.isTrue(subject.overlay.classList.contains('no-transition'),
          'loadPanel didn\'t add no-transition on the overlay');
        done();
      });
    });

    test('unloadPanel', function() {
      var stubUpdatePassCodeUI = this.sinon.stub(subject, 'updatePassCodeUI'),
          stubOverlay = document.createElement('div');

      subject.overlay = stubOverlay;
      subject.overlay.dataset.passcodeStatus = 'error';
      subject.unloadPanel('passcode');
      assert.isFalse(stubUpdatePassCodeUI.called,
        'updated the passcode UI although the passcode is incorrect');

      delete subject.overlay.dataset.passcodeStatus;
      subject.unloadPanel('passcode');
      assert.isTrue(stubUpdatePassCodeUI.called,
        'didn\'t updated the passcode UI although the passcode is correct');
    });

    test('switchPanel', function(done) {
      var originalUnloadPanel = subject.unloadPanel.bind(this),
          stubUnloadPanel = this.sinon.stub(subject, 'unloadPanel',
            function(from, to, cb) {
              assert.equal('main', from,
                'didn\'t get correct from-panel');
              assert.equal('passcode', to,
                'didn\'t get correct to-panel');
              originalUnloadPanel(from, to, cb);
            }),
          stubLoadPanel = this.sinon.stub(subject, 'loadPanel', function() {
            done();
          }),
          stubOverlay = document.createElement('div');
      subject.overlay = stubOverlay;
      subject.overlay.dataset.panel = 'main';
      subject.switchPanel('passcode');
      stubUnloadPanel.restore();
      stubLoadPanel.restore();
    });

    test('checkPassCode', function() {
      var stubUnlock = this.sinon.stub(subject, 'unlock');
      subject.passCodeEntered = '0000';
      subject.passCode = '0000';
      subject.overlay = document.createElement('div');
      subject.passcodeInput = document.createElement('div');
      subject.checkPassCode();
      assert.equal('success', subject.overlay.dataset.passcodeStatus,
        'passcode status of the panel did\'t update with the matched passcode');
      subject.passcodeInput.dispatchEvent(
        new window.CustomEvent('transitionend'));
      assert.isTrue(stubUnlock.called,
        'didn\'t call unlock after check the passcode');
      stubUnlock.restore();
    });

    test('checkPassCodeTimeout', function() {
      var timeoutExpired = 0,
          timeoutNotExpired = new Date().getTime();

      subject.passCodeRequestTimeout = 10;
      subject._screenOffTime = timeoutNotExpired;
      assert.isFalse(subject.checkPassCodeTimeout(),
        'with timeout NOT expired the function still reported it was expired');

      subject._screenOffTime = timeoutExpired;
      assert.isTrue(subject.checkPassCodeTimeout(),
        'with timeout expired the function still reported it was NOT expired');
    });

    test('Message: message should appear on screen when set', function() {
      var message = 'message';
      subject.message = document.createElement('div');
      subject.setLockMessage(message);
      assert.equal(subject.message.hidden, false);
      assert.equal(subject.message.textContent, message);
    });

    test('Message: message should disappear when unset', function() {
      subject.message = document.createElement('div');
      subject.setLockMessage('');
      assert.equal(subject.message.textContent, '');
      assert.equal(subject.message.hidden, true);
    });
  });

  teardown(function() {
    stubById.restore();
    subject = null;
  });
});
