mocha.setup({globals: ['Picker']});

requireApp('clock/js/emitter.js');
requireApp('clock/js/view.js');
requireApp('clock/js/panel.js');
requireApp('clock/js/utils.js');

requireApp('clock/test/unit/mocks/mock_picker.js');
requireApp('clock/js/timer.js');
requireApp('clock/js/timer_panel.js');

suite('Timer.Panel', function() {
  var p;
  var clock;
  var isHidden, isVisible;

  suiteSetup(function() {
    loadBodyHTML('/index.html');

    p = typeof Picker !== 'undefined' ? Picker : undefined;

    Picker = MockPicker;

    isHidden = function(element) {
      return element.className.contains('hidden');
    };

  });

  suiteTeardown(function() {
    Picker = p;
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

    panel.update(10);

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

  test('Set timer state (paused)', function() {
    var now = Date.now();
    var oneHour = 60 * 60 * 1000;
    var timer = new Timer({
      startAt: now,
      endAt: now + oneHour,
      pauseAt: now,
      duration: oneHour,
      lapsed: 0,
      state: Timer.PAUSED,
      sound: '0'
    });

    var panel = new Timer.Panel(document.getElementById('timer-panel'));
    panel.timer = timer;
    panel.onvisibilitychange(true);

    assert.isTrue(isHidden(panel.nodes.dialog));
    assert.isTrue(isHidden(panel.nodes.pause));

    assert.isFalse(isHidden(panel.nodes.time));
    assert.isFalse(isHidden(panel.nodes.start));
    assert.isFalse(isHidden(panel.nodes.cancel));

    assert.equal(panel.nodes.time.textContent, '01:00:00');
    clock.tick(5000);
    assert.equal(panel.nodes.time.textContent, '01:00:00');

  });

  test('Set timer state (started)', function() {
    var now = Date.now();
    var oneHour = 60 * 60 * 1000;
    var timer = new Timer({
      startAt: now,
      endAt: now + oneHour,
      pauseAt: 0,
      duration: oneHour,
      lapsed: 0,
      state: Timer.STARTED,
      sound: '0'
    });

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
    assert.equal(panel.nodes.time.textContent, '00:59:55');
  });

  test('Set timer state (blank timer)', function() {
    var timer = new Timer();
    var panel = new Timer.Panel(document.getElementById('timer-panel'));
    panel.timer = timer;
    panel.onvisibilitychange(true);

    assert.isFalse(isHidden(panel.nodes.dialog));

    assert.equal(panel.nodes.time.textContent, '00:00:00');
    clock.tick(5000);
    assert.equal(panel.nodes.time.textContent, '00:00:00');
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
      assert.isNull(panel.timer);
    });

    test('click: menu ', function() {
      var menu = panel.nodes.menu;
      var sound = panel.nodes.sound;

      menu.dispatchEvent(
        new CustomEvent('click')
      );
      assert.ok(panel.onclick.called);
      assert.ok(sound.focus.called);
    });

    test('blur: sound', function() {
      var menu = panel.nodes.menu;
      var sound = panel.nodes.sound;
      Utils.changeSelectByValue(sound, 'ac_normal_gem_echoes.opus');
      sound.dispatchEvent(
        new CustomEvent('blur')
      );

      assert.equal(menu.textContent, 'ac_normal_gem_echoes_opus');
    });
  });

});
