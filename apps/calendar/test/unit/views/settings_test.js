requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  requireLib('models/calendar.js');
  requireLib('templates/calendar.js');
  requireLib('views/settings.js');
});

suite('views/settings', function() {

  var subject;
  var app;
  var store;
  var controller;
  var template;
  var triggerEvent;

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="time-views"></div>',
      '<div id="settings">',
        '<button class="sync">sync</button>',
        '<ul class="calendars"></ul>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;
    store = app.store('Calendar');
    template = Calendar.Templates.Calendar;

    subject = new Calendar.Views.Settings({
      app: app,
      syncProgressTarget: div
    });
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject.app, app);
    assert.equal(
      subject.element, document.querySelector('#settings')
    );
  });

  test('#time-views', function() {
    assert.ok(subject.timeViews);
  });

  test('#calendars', function() {
    assert.ok(subject.calendars);
  });

  test('#syncButton', function() {
    assert.ok(subject.syncButton);
  });

  test('#syncProgressTarget', function() {
    assert.ok(subject.syncProgressTarget);
  });

  suite('#_initEvents', function() {

    var models;
    var children;

    setup(function() {
      models = {};
      // render out one model
      models[1] = {
        name: 'first',
        localDisplayed: true,
        _id: 'one'
      };

      store._cached = models;
      subject.render();
      children = subject.calendars.children;
    });

    suite('update', function() {

      test('when flagged as _inUpdate', function() {
        subject._localUpdate = true;

        models[1].name = 'foobar';

        store.emit('update', 'one', models[1]);

        assert.notEqual(
          children[0].textContent,
          models[1].name,
          'should not update when marked as _localUpdate'
        );
      });

      test('when not flagged', function() {
        var check = children[0].querySelector(
          '*[type="checkbox"]'
        );

        models[1].name = 'foo';
        models[1].localDisplayed = false;

        store.emit('update', 'one', models[1]);

        assert.equal(children[0].textContent, 'foo');
        assert.isFalse(
          check.checked
        );
      });

    });

    test('add', function() {
      models[2] = {
        name: 'second',
        localDisplayed: false,
        _id: 'two'
      };

      assert.equal(children.length, 1);
      store.emit('add', 'two', models[2]);
      assert.equal(children.length, 2);

      assert.equal(children[1].textContent, 'second');
    });

    test('remove', function() {
      store.emit('remove', 'one');
      assert.equal(children.length, 0);
    });

  });

  test('sync', function() {
    var controller = app.syncController;
    var calledWith;
    var el = subject.syncButton;

    controller.all = function() {
      calledWith = arguments;
    };

    triggerEvent(subject.syncButton, 'click');
    assert.ok(calledWith);
  });

  suite('#_onCalendarDisplayToggle', function() {
    var model;
    var checkbox;
    var calledWith;

    setup(function() {
      model = Factory('calendar', {
        localDisplayed: true,
        _id: 'my-calendar'
      });

      store._cached = {
        'my-calendar': model
      };

      subject.render();
      checkbox = subject.calendars.querySelector(
        'input[type="checkbox"]'
      );
    });

    setup(function() {
      store.persist = function() {
        calledWith = arguments;
      };
    });

    test('initial toggle', function() {
      assert.isTrue(checkbox.checked, 'should be checked initially');

      checkbox.checked = false;
      triggerEvent(checkbox, 'change');

      assert.equal(calledWith[0], model);
      assert.equal(model.localDisplayed, !!checkbox.checked);

      var cb = calledWith[1];
      cb();
      assert.isTrue(subject._localUpdate);
      store.emit('persist');
      assert.isFalse(subject._localUpdate);
      // verify the handler was removed;
      subject._localUpdate = true;
      store.emit('persist');
      assert.isTrue(subject._localUpdate);
    });

  });

  suite('#render', function() {
    var models = {};

    setup(function() {
      models[1] = {
        name: 'First',
        localDisplayed: true,
        _id: 1
      };

      models[2] = {
        name: 'Second',
        localDisplayed: false,
        _id: 2
      };
      store._cached = models;
      subject.render();
    });

    test('output', function() {
      var children = subject.calendars.children;
      assert.equal(children.length, 2);

      var one = children[0];
      var two = children[1];

      assert.equal(one.textContent, models[1].name);
      assert.equal(two.textContent, models[2].name);

      assert.isTrue(
        one.querySelector('*[type="checkbox"]').checked
      );

      assert.isFalse(
        two.querySelector('*[type="checkbox"]').checked
      );
    });

  });

  suite('tap to navigate away from settings', function() {

    var calledWith;

    setup(function() {
      calledWith = null;
      app.resetState = function() {
        calledWith = arguments;
      };
    });

    test('#onactive', function() {
      subject.onactive();
      triggerEvent(subject.timeViews, 'click');
      assert.ok(calledWith, 'navigates away');
    });

    test('#oninactive', function() {
      subject.onactive();
      subject.oninactive();
      triggerEvent(subject.timeViews, 'click');
      assert.ok(!calledWith, 'navigates away');
    });

  });

});
