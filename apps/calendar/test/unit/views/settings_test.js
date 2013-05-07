requireLib('models/calendar.js');
requireLib('models/account.js');
requireCommon('test/synthetic_gestures.js');

suiteGroup('Views.Settings', function() {

  var subject;
  var app;
  var store;
  var controller;
  var template;
  var triggerEvent;
  var account;

  function stageModels(list) {
    var object = Object.create(null);

    setup(function(done) {
      account = Factory('account', { _id: 'testacc' });

      var trans = app.db.transaction(
        ['calendars', 'accounts'], 'readwrite'
      );

      trans.oncomplete = function() {
        done();
      };

      trans.onerror = function(e) {
        done(e.target.error);
      };

      app.store('Account').persist(account, trans);

      var model;
      for (var key in list) {
        list[key].accountId = account._id;
        model = Factory('calendar', list[key]);
        store.persist((object[key] = model), trans);
      }
    });

    return object;
  }

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function(done) {
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
      syncProgressTarget: div,
      // normally this is higher in production but
      // we don't need to wait that long in tests.
      waitBeforePersist: 10
    });

    app.db.open(done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      app.db,
      ['calendars'],
      function() {
        app.db.close();
        done();
      }
    );
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

  suite('#observeStore', function() {
    var models = stageModels({
      first: {
        localDisplayed: true,
        _id: 'first',
        remote: {
          name: 'first'
        }
      }
    });

    var children;
    setup(function(done) {
      // we must wait until rendering completes
      subject.render();
      subject.onrender = function() {
        children = subject.calendars.children;
        Calendar.nextTick(done);
      };
    });

    suite('update / error', function() {
      var model;
      var container;

      setup(function() {
        model = models.first;
        container = children[0];
      });

      test('update with error / without error', function() {
        model.error = {};
        store.emit('update', model._id, model);

        assert.ok(
          container.classList.contains('error'),
          'has error class'
        );

        delete model.error;
        store.emit('update', model._id, model);

        assert.ok(
          !container.classList.contains('error'),
          'removes error class'
        );
      });

      test('normal flow', function() {
        var check = children[0].querySelector(
          '*[type="checkbox"]'
        );

        model.localDisplayed = false;
        model.remote.name = 'foo';

        store.emit('update', model._id, model);

        assert.equal(children[0].textContent, 'foo');
        assert.isFalse(
          check.checked
        );
      });
    });

    suite('add', function() {
      function addModel() {
        store.emit('add', 'two', model);
        assert.equal(children.length, 2);
        assert.equal(children[1].textContent, 'second');

        return children[1];
      }

      var model;
      setup(function() {
        model = Factory('calendar', {
          localDisplayed: false,
          _id: 'two',
          remote: { name: 'second' }
        });

        assert.equal(children.length, 1);
      });

      test('success', function() {
        var container = addModel();
        assert.ok(
          !container.classList.contains('error'),
          'does not add error'
        );
      });

      test('add with error', function() {
        model.error = {};
        var container = addModel();
        assert.ok(
          container.classList.contains('error'),
          'has error'
        );
      });

    });

    test('remove', function() {
      store.emit('remove', models.first._id);
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
    var models = stageModels({
      displayed: {
        localDisplayed: true,
        _id: 1
      },

      hidden: {
        localDisplayed: false,
        _id: 'hidden'
      }
    });

    var checkboxes;
    var calledWith;

    setup(function(done) {
      subject.render();
      subject.onrender = function() {
        checkboxes = {};

        for (var id in models) {
          checkboxes[id] = subject.calendars.querySelector(
            'input[value="' + models[id]._id + '"]'
          );
        }

        done();
      };
    });

    function checkAsync(id, value) {
      Calendar.nextTick(function() {
        checkboxes[id].checked = !!value;
        triggerEvent(checkboxes[id], 'change');
      });
    }

    test('changing display state to false', function(done) {
      // the goal is to trigger the change event
      // multiple times but verify we only persist
      // once...
      assert.isTrue(
        checkboxes.displayed.checked, 'begins checked'
      );

      // fired when calendar is persisted
      subject.ondisplaypersist = function(calendar) {
        done(function() {
          assert.equal(calendar._id, models.displayed._id);
          // verify we set it to false and checkbox is hidden.
          assert.isFalse(calendar.localDisplayed);
          assert.isFalse(checkboxes.displayed.checked);
        });
      };

      checkAsync('displayed', false);
      checkAsync('displayed', true);
      checkAsync('displayed', false);
    });

    test('changing display to true', function(done) {
      assert.isFalse(
        checkboxes.hidden.checked,
        'begins unchecked'
      );

      checkAsync('hidden', true);

      subject.ondisplaypersist = function(calendar) {
        done(function() {
          assert.equal(calendar._id, models.hidden._id);
          assert.isTrue(calendar.localDisplayed);
          assert.isTrue(checkboxes.hidden.checked);
        });
      };
    });

  });

  suite('#render', function() {
    var models = {};

    setup(function(done) {
      models[1] = Factory('calendar', {
        name: 'First',
        localDisplayed: true,
        _id: 1
      });

      models[2] = Factory('calendar', {
        name: 'Second',
        localDisplayed: false,
        _id: 2,
        error: {}
      });

      var trans = app.db.transaction('calendars', 'readwrite');

      store.persist(models[1], trans);
      store.persist(models[2], trans);

      trans.oncomplete = function() {
        done();
      };

      trans.onerror = function(e) {
        done(e);
      };
    });

    setup(function(done) {
      subject.onrender = done;
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

      assert.ok(
        !one.classList.contains('error'),
        'error is not added without an .error field'
      );

      assert.isFalse(
        two.querySelector('*[type="checkbox"]').checked
      );

      assert.ok(
        two.classList.contains('error'),
        'if error is present in model render shows it'
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
