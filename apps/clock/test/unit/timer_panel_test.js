suite('Timer.Panel', function() {
  var clock;
  var isHidden, isVisible;
  var ActiveAlarm, View, Timer, Utils;
  var nativeMozAlarms = navigator.mozAlarms;

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');

    isHidden = function(element) {
      return element.className.contains('hidden');
    };

    testRequire(['active_alarm', 'timer', 'timer_panel', 'view', 'utils',
      'mocks/mock_moz_alarm'], {
      mocks: ['picker/picker']
    }, function(activealarm, timer, timerPanel, view, utils, mockMozAlarms) {
      ActiveAlarm = activealarm;
      Timer = timer;
      Timer.Panel = timerPanel;
      View = view;
      Utils = utils;
      navigator.mozAlarms = new mockMozAlarms.MockMozAlarms(
        ActiveAlarm.singleton().handler
      );
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozAlarms = nativeMozAlarms;
  });

  setup(function() {
    clock = this.sinon.useFakeTimers();
  });

  test('shape:prototype ', function() {
    assert.ok(Timer.Panel);
    assert.ok(Timer.Panel.prototype.dialog);
    assert.ok(Timer.Panel.prototype.update);
    assert.ok(Timer.Panel.prototype.toggle);
    assert.ok(Timer.Panel.prototype.onclick);
  });

  test('shape:instance ', function() {
    var panel = new Timer.Panel(document.getElementById('timer-panel'));
    assert.ok(panel.nodes);
    assert.isNull(panel.timer);
  });

  test('dialog ', function() {
    var panel = new Timer.Panel(document.getElementById('timer-panel'));
    var dialog = View.instance(panel.nodes.dialog);

    // Defaults to isVisible = true;
    panel.dialog();

    assert.isTrue(dialog.visible);

    panel.dialog({ isVisible: false });

    assert.isFalse(dialog.visible);
  });

  test('update ', function() {
    var panel = new Timer.Panel(document.getElementById('timer-panel'));

    panel.update(10000);

    // TODO: update for l10n
    assert.equal(panel.nodes.time.textContent, '00:00:10');

    panel.update(0);

    // TODO: update for l10n
    assert.equal(panel.nodes.time.textContent, '00:00:00');
  });

  test('toggle(show, hide) ', function() {
    var panel = new Timer.Panel(document.getElementById('timer-panel'));
    var start = panel.nodes.start;
    var pause = panel.nodes.pause;

    panel.toggle(start, pause);

    assert.isFalse(isHidden(start));
    assert.isTrue(isHidden(pause));

    panel.toggle(pause, start);

    assert.isTrue(isHidden(start));
    assert.isFalse(isHidden(pause));
  });

  function fakeTick(timerpanel) {
    timerpanel.update(timerpanel.timer.remaining);
  }

  test('Set timer state (paused)', function() {
    var now = Date.now();
    var oneHour = 60 * 60 * 1000;
    var timer = new Timer({
      startTime: now,
      configuredDuration: oneHour
    });
    timer.start();
    var panel = new Timer.Panel(document.getElementById('timer-panel'));
    panel.timer = timer;
    panel.onvisibilitychange(true);

    fakeTick(panel);
    assert.equal(panel.nodes.time.textContent, '01:00:00');

    clock.tick(5000);
    fakeTick(panel);

    assert.equal(panel.nodes.time.textContent, '00:59:55');

    panel.onclick({
      target: panel.nodes.pause
    });

    fakeTick(panel);

    assert.isTrue(isHidden(panel.nodes.dialog));
    assert.isTrue(isHidden(panel.nodes.pause));

    assert.isFalse(isHidden(panel.nodes.start));
    assert.isFalse(isHidden(panel.nodes.time));
    assert.isFalse(isHidden(panel.nodes.cancel));

    assert.equal(panel.nodes.time.textContent, '00:59:55');
    clock.tick(5000);
    fakeTick(panel);
    assert.equal(panel.nodes.time.textContent, '00:59:55');

  });

  test('Set timer state (started)', function() {
    var now = Date.now();
    var oneHour = 60 * 60 * 1000;
    var timer = new Timer({
      configuredDuration: now + oneHour
    });
    timer.start();

    var panel = new Timer.Panel(document.getElementById('timer-panel'));
    panel.timer = timer;
    panel.onvisibilitychange(true);

    assert.isTrue(isHidden(panel.nodes.dialog));
    assert.isTrue(isHidden(panel.nodes.start));

    assert.isFalse(isHidden(panel.nodes.time));
    assert.isFalse(isHidden(panel.nodes.pause));
    assert.isFalse(isHidden(panel.nodes.cancel));

    assert.equal(panel.nodes.time.textContent, '01:00:00');
    clock.tick(5000);
    fakeTick(panel);
    assert.equal(panel.nodes.time.textContent, '00:59:55');
  });

  suite('Timer.Panel, Events', function() {
    var panel;

    setup(function() {
      this.sinon.spy(Timer.Panel.prototype, 'onclick');

      asyncStorage.getItem = function(key, callback) {
        callback('{"duration":5000}');
      };

      panel = new Timer.Panel(document.getElementById('timer-panel'));

      this.sinon.spy(panel.timer, 'start');
      this.sinon.spy(panel.timer, 'pause');
      this.sinon.spy(panel.timer, 'cancel');
      this.sinon.spy(panel.nodes.sound, 'focus');
      this.sinon.spy(panel.timer, 'plus');
    });

    test('click: start ', function() {
      var start = panel.nodes.start;

      start.dispatchEvent(
        new CustomEvent('click')
      );

      assert.ok(panel.onclick.called);
      assert.ok(panel.timer.start.called);
    });

    test('click: pause ', function() {
      var pause = panel.nodes.pause;

      pause.dispatchEvent(
        new CustomEvent('click')
      );

      assert.ok(panel.onclick.called);
      assert.ok(panel.timer.pause.called);
    });

    test('click: cancel ', function() {
      var cancel = panel.nodes.cancel;
      var timer = panel.timer;

      cancel.dispatchEvent(
        new CustomEvent('click')
      );
      assert.ok(panel.onclick.called);
      assert.ok(timer.cancel.called);
    });

    test('click: create ', function() {
      panel.nodes.create.dispatchEvent(
        new CustomEvent('click')
      );
      assert.ok(panel.onclick.called);
      // Duration from picker value
      assert.equal(panel.timer.duration, 3600000);
    });

    test('click: plus ', function() {
      var plus = panel.nodes.plus;
      var timer = panel.timer;


      plus.dispatchEvent(
        new CustomEvent('click')
      );
      assert.ok(panel.onclick.called);
      assert.ok(timer.plus.called);
    });

    test('blur: sound', function() {
      var menu = panel.soundButton.button;
      var sound = panel.nodes.sound;
      Utils.changeSelectByValue(sound, 'ac_normal_gem_echoes.opus');
      sound.dispatchEvent(
        new CustomEvent('blur')
      );

      assert.equal(menu.textContent, 'ac_normal_gem_echoes_opus');
    });

    test('change: sound', function() {
      var sound = panel.nodes.sound;
      Utils.changeSelectByValue(sound, 'ac_normal_gem_echoes.opus');
      var mockAudio = {
        pause: this.sinon.spy(),
        play: this.sinon.spy()
      };
      this.sinon.stub(window, 'Audio').returns(mockAudio);

      sound.dispatchEvent(
        new CustomEvent('change')
      );

      assert.isTrue(mockAudio.play.called);
      assert.isTrue(mockAudio.loop);
      assert.equal(mockAudio.mozAudioChannelType, 'alarm');
      var expected = 'shared/resources/media/alarms/ac_normal_gem_echoes.opus';
      assert.equal(mockAudio.src, expected);
    });

    test('blur: pause playing alarm', function() {
      var sound = panel.nodes.sound;
      Utils.changeSelectByValue(sound, 'ac_normal_gem_echoes.opus');
      var mockAudio = {
        pause: this.sinon.spy(),
        play: this.sinon.spy()
      };
      this.sinon.stub(window, 'Audio').returns(mockAudio);

      sound.dispatchEvent(
        new CustomEvent('change')
      );

      assert.isTrue(mockAudio.play.called);
      assert.isTrue(mockAudio.pause.calledOnce);

      sound.dispatchEvent(
        new CustomEvent('blur')
      );

      assert.isTrue(mockAudio.pause.calledTwice);
    });
  });
});
