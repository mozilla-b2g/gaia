'use strict';
/* global asyncStorage, MockL10n, MockMozIntl, MockIntlHelper */

suite('Timer.Panel', function() {
  var clock, activeAlarm;
  var isHidden;
  var View, Timer, Utils;

  suiteSetup(function(done) {
    navigator.mozL10n = MockL10n;
    window.mozIntl = MockMozIntl;
    window.IntlHelper = MockIntlHelper;
    window.IntlHelper.define('digit-nopadding', 'number', {
      style: 'decimal',
      useGrouping: false
    });
    isHidden = function(element) {
      return element.className.contains('hidden');
    };

    require(['panels/alarm/active_alarm', 'timer', 'panels/timer/main',
             'view', 'utils'],
            function(ActiveAlarm, timer, timerPanel, view, utils) {
      Timer = timer;
      Timer.Panel = timerPanel;
      View = view;
      Utils = utils;
      activeAlarm = new ActiveAlarm();
      done();
    });
  });

  setup(function() {
    clock = this.sinon.useFakeTimers();
  });

  test('shape:prototype ', function() {
    assert.ok(Timer.Panel);
    assert.ok(Timer.Panel.prototype.showDialog);
    assert.ok(Timer.Panel.prototype.hideDialog);
    assert.ok(Timer.Panel.prototype.update);
    assert.ok(Timer.Panel.prototype.onclick);
  });

  test('shape:instance ', function() {
    var panel = new Timer.Panel(document.createElement('div'));
    assert.ok(panel.nodes);
    assert.isNull(panel.timer);
  });

  test('dialog ', function() {
    var panel = new Timer.Panel(document.createElement('div'));
    var dialog = View.instance(panel.nodes.dialog);

    panel.showDialog();

    assert.isTrue(dialog.visible);

    panel.hideDialog();

    assert.isFalse(dialog.visible);
  });

  test('update ', function(done) {
    var panel = new Timer.Panel(document.createElement('div'));

    // The timer panel should display rounded seconds.
    var timer = { remaining: 10000 };
    panel.timer = timer;
    panel.update().then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 10000,
        options: {
          minUnit: 'second',
          maxUnit: 'hour'
        }
      }));
    }).then(done, done);
  });

  test('toggleButtons ', function() {
    var panel = new Timer.Panel(document.createElement('div'));
    var start = panel.nodes.start;
    var pause = panel.nodes.pause;

    panel.timer = {};

    panel.timer.state = Timer.PAUSED;
    panel.toggleButtons();

    assert.isFalse(isHidden(start));
    assert.isTrue(isHidden(pause));

    panel.timer.state = Timer.STARTED;
    panel.toggleButtons();

    assert.isTrue(isHidden(start));
    assert.isFalse(isHidden(pause));
  });

  test('Set timer state (paused)', function(done) {
    var now = Date.now();
    var oneHour = 60 * 60 * 1000;
    var timer = new Timer({
      startTime: now,
      configuredDuration: oneHour
    });
    timer.start();
    var panel = new Timer.Panel(document.createElement('div'));
    panel.timer = timer;
    panel.onvisibilitychange({ detail: { isVisible: true } });

    panel.update().then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: oneHour,
        options: {
          minUnit: 'second',
          maxUnit: 'hour'
        }
      }));
      clock.tick(5000);
      return panel.update();
    }).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: oneHour - 5000,
        options: {
          minUnit: 'second',
          maxUnit: 'hour'
        }
      }));

      panel.onclick({
        target: panel.nodes.pause
      });
      panel.onTimerEvent({ type: 'timer-pause' });

      return panel.update();
    }).then(() => {
      assert.isTrue(isHidden(panel.nodes.dialog));
      assert.isTrue(isHidden(panel.nodes.pause));

      assert.isFalse(isHidden(panel.nodes.start));
      assert.isFalse(isHidden(panel.nodes.time));
      assert.isFalse(isHidden(panel.nodes.cancel));

      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: oneHour - 5000,
        options: {
          minUnit: 'second',
          maxUnit: 'hour'
        }
      }));
      clock.tick(5000);
      return panel.update();
    }).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: oneHour - 5000,
        options: {
          minUnit: 'second',
          maxUnit: 'hour'
        }
      }));
    }).then(done, done);
  });

  test('Set timer state (started)', function(done) {
    var now = Date.now();
    var oneHour = 60 * 60 * 1000;
    var timer = new Timer({
      configuredDuration: now + oneHour
    });
    timer.start();

    var panel = new Timer.Panel(document.createElement('div'));
    panel.timer = timer;
    panel.onvisibilitychange({ detail: { isVisible: true } });

    assert.isTrue(isHidden(panel.nodes.dialog));
    assert.isTrue(isHidden(panel.nodes.start));

    assert.isFalse(isHidden(panel.nodes.time));
    assert.isFalse(isHidden(panel.nodes.pause));
    assert.isFalse(isHidden(panel.nodes.cancel));

    Promise.resolve().then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: oneHour,
        options: {
          minUnit: 'second',
          maxUnit: 'hour'
        }
      }));
      clock.tick(5000);
      return panel.update();
    }).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: oneHour - 5000,
        options: {
          minUnit: 'second',
          maxUnit: 'hour'
        }
      }));
    }).then(done, done);
  });

  test('Create button is disabled when picker is set to 0:00', function() {
    var panel = new Timer.Panel(document.createElement('div'));
    var create = panel.nodes.create;
    var nodes = panel.picker.nodes;

    create = {
      setAttribute: function() {},
      removeAttribute: function() {}
    };

    this.sinon.spy(create, 'removeAttribute');
    this.sinon.spy(create, 'setAttribute');

    assert.isTrue(panel.nodes.create.disabled);

    panel.picker.value = '3:00';
    nodes.hours.dispatchEvent(
      new CustomEvent('transitionend')
    );

    assert.isFalse(panel.nodes.create.disabled);

    panel.picker.value = '0:00';
    nodes.hours.dispatchEvent(
      new CustomEvent('transitionend')
    );

    assert.isTrue(panel.nodes.create.disabled);

    panel.picker.value = '0:15';
    nodes.minutes.dispatchEvent(
      new CustomEvent('transitionend')
    );

    assert.isFalse(panel.nodes.create.disabled);

    panel.picker.value = '0:00';
    nodes.minutes.dispatchEvent(
      new CustomEvent('transitionend')
    );

    assert.isTrue(panel.nodes.create.disabled);
  });

  suite('Timer.Panel, Events', function() {
    var panel;

    setup(function() {
      this.sinon.spy(Timer.Panel.prototype, 'onclick');

      asyncStorage.getItem = function(key, callback) {
        callback('{"duration":5000}');
      };

      panel = new Timer.Panel(document.createElement('div'));

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

    test('click: create', function() {
      panel.picker.value = '1:00';

      panel.picker.nodes.hours.dispatchEvent(
        new CustomEvent('transitionend')
      );

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

    test('blur: sound', function(done) {
      var menu = panel.soundButton.button;
      var sound = panel.nodes.sound;
      Utils.changeSelectByValue(sound, 'ac_digicloud.opus');
      sound.dispatchEvent(
        new CustomEvent('blur')
      );

      Promise.resolve().then(() => {
        assert.equal(menu.getAttribute('data-l10n-id'), 'ac_digicloud_opus');
      }).then(done, done);
    });

    test('change: sound', function() {
      var sound = panel.nodes.sound;
      Utils.changeSelectByValue(sound, 'ac_digicloud.opus');
      var mockAudio = {
        pause: this.sinon.spy(),
        play: this.sinon.spy(),
        addEventListener: function() { },
        load: function() { }
      };
      this.sinon.stub(window, 'Audio').returns(mockAudio);

      sound.dispatchEvent(
        new CustomEvent('change')
      );

      assert.isTrue(mockAudio.play.called);
      assert.isTrue(mockAudio.loop);
      assert.equal(mockAudio.mozAudioChannelType, 'alarm');
      var expected = 'shared/resources/media/alarms/ac_digicloud.opus';
      assert.equal(mockAudio.src, expected);
    });

    test('blur: pause playing alarm', function() {
      var sound = panel.nodes.sound;
      Utils.changeSelectByValue(sound, 'ac_digicloud.opus');

      var mockAudio = {
        pause: this.sinon.spy(),
        play: this.sinon.spy(),
        addEventListener: function() { },
        load: function() { }
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
