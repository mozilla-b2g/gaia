mocha.setup({ globals: ['Emitter'] });

suite('Timer.Panel', function() {
  var View;
  var Timer = {};

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');

    testRequire(['timer_panel', 'view'], {
      mocks: {
        'picker/picker': 'mocks/mock_picker'
      }
    }, function(TimerPanel, view) {
      Timer.Panel = TimerPanel;
      View = view;
      done();
    });
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

    assert.isFalse(start.classList.contains('hide'));
    assert.isTrue(pause.classList.contains('hide'));

    panel.toggle(pause, start);

    assert.isTrue(start.classList.contains('hide'));
    assert.isFalse(pause.classList.contains('hide'));
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

  });

});
