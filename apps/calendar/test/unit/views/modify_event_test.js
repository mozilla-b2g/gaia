requireApp('calendar/test/unit/helper.js', function() {
  requireLib('utils/input_parser.js');
  requireLib('views/modify_event.js');
  requireLib('models/account.js');
  requireLib('models/calendar.js');
  requireLib('models/event.js');
});

suite('views/modify_event', function() {

  var subject;
  var controller;
  var app;
  var fmt;

  var event;
  var account;
  var calendar;
  var busytime;
  var provider;

  var remote;
  var eventStore;
  var calendarStore;
  var accountStore;

  function hasClass(value) {
    return subject.element.classList.contains(value);
  }

  function getField(name) {
    return subject.getField(name);
  }

  function setFieldValue(name, value) {
    var field = getField(name);
    return field.value = value;
  }

  function fieldValue(name) {
    var field = getField(name);
    return field.value;
  }

  function escapeHTML(html) {
    var template = new Calendar.Template(function() {
      return this.h('value');
    });

    return template.render({ value: html });
  }

  function setProviderCaps(override) {
    var values = {};
    var primaryValues =
      Calendar.Provider.Abstract.prototype.calendarCapabilities.call(provider);

    [primaryValues, override].forEach(function(caps) {
      for (var key in caps) {
        values[key] = caps[key];
      }
    });

    provider.caps = values;
  }

  var triggerEvent;
  var TestProvider;

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;

    TestProvider = function() {
      Calendar.Provider.Abstract.apply(this, arguments);
    };

    TestProvider.prototype = {
      __proto__: Calendar.Provider.Abstract.prototype,

      calendarCapabilities: function() {
        return this.caps;
      }
    };
  });

  var InputParser;

  suiteSetup(function() {
    InputParser = Calendar.Utils.InputParser;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
    delete app._providers.Test;
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="modify-event-view">',
        '<button class="save">save</button>',
        '<button class="cancel">cancel</button>',
        '<button class="delete-record">delete</button>',
        '<section role="status">',
          '<div class="errors"></div>',
        '</section>',
        '<form>',
          '<input type="checkbox" name="allday" />',
          '<input name="title" />',
          '<input type="date" name="startDate" />',
          '<input type="date" name="endDate" />',
          '<input type="time" name="startTime" />',
          '<input type="time" name="endTime" />',
          '<input name="location" />',
          '<textarea name="description"></textarea>',
          '<input name="currentCalendar" />',
          '<select name="calendarId"></select>',
        '</form>',
      '</div>'
    ].join('');

    document.body.appendChild(div);
    app = testSupport.calendar.app();
    app._providers.Test = new TestProvider({ app: app });

    eventStore = app.store('Event');
    accountStore = app.store('Account');
    calendarStore = app.store('Calendar');
    provider = app.provider('Test');

    setProviderCaps();

    fmt = navigator.mozL10n.DateTimeFormat();

    // setup model fixtures
    account = Factory('account', { _id: 'foo', providerType: 'Test' });
    calendar = Factory('calendar', { _id: 'foo', accountId: 'foo' });

    event = Factory('event', {
      calendarId: 'foo',
      remote: {
        startDate: new Date(2012, 1, 1, 1),
        endDate: new Date(2012, 1, 5, 1)
      }
    });

    busytime = Factory('busytime', {
      eventId: event._id,
      startDate: new Date(2012, 1, 1, 1),
      endDate: new Date(2012, 1, 5, 1)
    });

    // add account & calendar to cache
    accountStore.cached.foo = account;
    calendarStore.cached.foo = calendar;

    remote = event.remote;

    controller = app.timeController;

    subject = new Calendar.Views.ModifyEvent({
      app: app
    });
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject._changeToken, 0);

    assert.ok(subject._fields, 'has fields');
  });

  test('.status', function() {
    assert.ok(subject.status);
  });

  test('.errors', function() {
    assert.ok(subject.errors);
  });

  test('.form', function() {
    assert.ok(subject.form);
    assert.equal(subject.form.tagName.toLowerCase(), 'form');
  });

  test('.saveButton', function() {
    assert.ok(subject.saveButton);
  });

  test('.deleteButton', function() {
    assert.ok(subject.deleteButton);
  });

  suite('#_loadModel', function() {
    var calledUpdate;
    var calledLoad;

    setup(function() {
      calledLoad = null;
      calledUpdate = null;

      controller.findAssociated = function() {
        calledLoad = arguments;
      };

      subject._displayModel = function() {
        calledUpdate = arguments;
      };
    });

    test('when change token is same', function() {
      var token = subject._changeToken;

      subject._loadModel(1);
      assert.deepEqual(calledLoad[0], 1);
      // changes sync token
      assert.equal(
        subject._changeToken, token + 1, 'should increment token'
      );

      var cb = calledLoad[1];
      cb(null, [{ event: event }]);

      assert.instanceOf(subject.event, Calendar.Models.Event);
      assert.equal(subject.event.data, event);
      assert.ok(calledUpdate);
    });

    test('when change token is different', function() {
      var token = subject._changeToken;
      subject._loadModel(1);
      assert.deepEqual(calledLoad[0], 1);
      // changes sync token
      assert.equal(
        subject._changeToken, token + 1, 'should increment token'
      );

      subject._changeToken = 100;

      var cb = calledLoad[1];
      cb(null, [{event: ''}]);

      assert.ok(!subject.event);
      assert.ok(!calledUpdate, 'should not update form if token has changed');
    });
  });

  test('#_getField', function() {
    var expected = subject.form.querySelector('[name="title"]');
    assert.ok(expected);
    assert.equal(expected.tagName.toLowerCase(), 'input');

    var result = subject.getField('title');

    assert.equal(result, expected);
    assert.equal(result, subject.getField('title'));
    assert.equal(subject._fields.title, expected);
  });

  suite('#_displayModel', function() {
    var list;

    setup(function() {
      list = subject.element.classList;
    });

    function updatesValues(overrides) {
      // just to verify we actually clear fields...
      getField('title').value = 'foo';
      event.remote.description = '<span>foo</span>';

      var expected = {
        title: remote.title,
        location: remote.location,
        startDate: InputParser.exportDate(remote.startDate),
        startTime: InputParser.exportTime(remote.startDate),
        endDate: InputParser.exportDate(remote.endDate),
        endTime: InputParser.exportTime(remote.endDate),
        currentCalendar: calendar.name
      };

      var key;

      if (overrides) {
        for (key in overrides) {
          expected[key] = overrides[key];
        }
      }

      subject.onfirstseen();
      subject.useModel(busytime, event);

      if (subject.provider.canCreateEvent) {
        expected.calendarId = event.calendarId;
      }

      for (key in expected) {
        if (expected.hasOwnProperty(key)) {
          assert.equal(
            fieldValue(key),
            expected[key],
            'should set "' + key + '"'
          );
        }
      }

      var curCal = getField('currentCalendar');
      assert.isTrue(curCal.readOnly, 'current calendar readonly');

      var expected = escapeHTML(event.remote.description);

      assert.equal(
        getField('description').innerHTML,
        expected
      );
    }

    test('provider can edit', function() {
      updatesValues();

      assert.isFalse(list.contains(subject.READONLY));
      assert.ok(!getField('title').readOnly, 'does not mark as readOnly');
    });

    test('provider cannot edit', function() {
      remote.startDate = new Date(2012, 0, 1, 10);

      setProviderCaps({
        canUpdateEvent: false,
        canCreateEvent: false
      });

      updatesValues();

      assert.isTrue(list.contains(subject.READONLY), 'is readonly');
      assert.isFalse(list.contains(subject.ALLDAY), 'is allday');

      var allday = subject.getField('allday');
      assert.isFalse(allday.checked, 'is allday');

      assert.ok(getField('title').readOnly, 'marks readonly');
    });

    test('use busytime instance when isRecurring', function() {
      var eventRecurring = Factory('event', {
        calendarId: 'foo',
        remote: {
          isRecurring: true,
          startDate: new Date(2012, 1, 1, 1),
          endDate: new Date(2012, 1, 5, 1)
        }
      });
      var busytimeRecurring = Factory('busytime', {
        eventId: eventRecurring._id,
        startDate: new Date(2012, 10, 30, 1),
        endDate: new Date(2012, 10, 31, 1)
      });

      subject.useModel(busytimeRecurring, eventRecurring);

      var expected = {
        startDate: busytimeRecurring.startDate,
        endDate: busytimeRecurring.endDate
      };

      assert.hasProperties(
        subject.formData(),
        expected
      );
    });

    test('when start & end times are 00:00:00', function() {
      remote.startDate = new Date(2012, 0, 1);
      remote.endDate = new Date(2012, 0, 2);
      updatesValues({
        endDate: '2012-01-01'
      });

      var allday = subject.getField('allday');
      assert.isTrue(allday.checked, 'checks all day');

      assert.ok(list.contains(subject.ALLDAY));
    });
  });

  test('#_markReadonly', function() {
    subject._markReadonly(true);
    var fields = subject.form.querySelectorAll('[name]');
    assert.isTrue(fields.length > 1, 'has fields');

    var i = 0;
    var field;

    for (; i < fields.length; i++) {
      field = fields[i];
      assert.isTrue(field.readOnly, field.name);
    }
  });

  test('#reset', function() {
    var list = subject.element.classList;
    subject._markReadonly(true);

    var title = getField('title');
    title.value = 'foo';

    list.add(subject.ALLDAY);
    list.add(subject.UPDATE);
    list.add(subject.CREATE);
    list.add(subject.READONLY);

    subject._returnTo = 'foo';
    subject.provider = 'foobar';
    subject.event = 'foo';
    subject.busytime = 'foo';


    var allday = subject.getField('allday');
    allday.checked = true;

    subject.reset();

    assert.isFalse(allday.checked, 'removes allday check');

    assert.isNull(subject._returnTo);
    assert.isNull(subject.provider, 'clear provider');
    assert.isNull(subject.event, 'clear event');
    assert.isNull(subject.busytime, 'clears busytime');

    assert.isFalse(list.contains(subject.ALLDAY), 'allday');
    assert.isFalse(list.contains(subject.READONLY), 'readonly');
    assert.isFalse(list.contains(subject.CREATE), 'remove create class');
    assert.isFalse(list.contains(subject.UPDATE), 'remove update class');
    assert.isFalse(title.readOnly, 'clears readOnly');
    assert.equal(title.value, '', 'clear inputs');
  });

  suite('#dispatch', function() {
    var classList;

    setup(function() {
      classList = subject.element.classList;
    });

    suite('update', function() {
      var calledWith;

      setup(function() {
        subject._loadModel = function() {
          calledWith = arguments;
        };
      });

      test('existing model', function() {
        subject.dispatch({
          params: {
            id: 1
          }
        });

        assert.deepEqual(calledWith, [1]);
        assert.isFalse(classList.contains(subject.CREATE), 'has create class');
        assert.isTrue(classList.contains(subject.UPDATE), 'has update class');
      });
    });

    test('create', function() {
      subject.dispatch({ params: {} });
      assert.isTrue(classList.contains(subject.CREATE), 'has create class');
      assert.isFalse(classList.contains(subject.UPDATE), 'has update class');
      assert.instanceOf(subject.event, Calendar.Models.Event);

      var formData = subject.formData();

      assert.hasProperties(formData, {
        startDate: subject.event.startDate,
        endDate: subject.event.endDate
      });
    });
  });

  suite('#formData', function() {

    setup(function() {
      subject.useModel(busytime, event);
      subject.onfirstseen();
    });

    test('when allday', function() {
      var allday = getField('allday');
      allday.checked = true;

      setFieldValue('startDate', '2012-01-01');
      setFieldValue('endDate', '2012-01-02');

      // we are verifying that these values are ignored.
      // when allday is hidden we want to show the users
      // originally selected values.
      setFieldValue('endTime', '01:07:00');
      setFieldValue('startTime', '01:08:00');

      var props = subject.formData();

      assert.hasProperties(subject.formData(), {
        startDate: new Date(2012, 0, 1),
        endDate: new Date(2012, 0, 3)
      });
    });

    test('without modifications', function() {
      var expected = {
        startDate: event.remote.startDate,
        endDate: event.remote.endDate,
        title: event.remote.title,
        description: event.remote.description,
        location: event.remote.location,
        calendarId: event.calendarId
      };

      assert.hasProperties(
        subject.formData(),
        expected
      );
    });

    test('with modifications', function() {

      var newStart = new Date(2011, 7, 1);
      var startDate = InputParser.exportDate(newStart);
      var startTime = InputParser.exportTime(newStart);

      var newEnd = new Date(2012, 7, 1);
      var endDate = InputParser.exportDate(newEnd);
      var endTime = InputParser.exportTime(newEnd);

      var expected = {
        startDate: newStart,
        endDate: newEnd,
        title: 'foo',
        description: 'bar',
        location: 'zomg',
        calendarId: calendar._id
      };

      setFieldValue('startDate', startDate);
      setFieldValue('startTime', startTime);
      setFieldValue('endDate', endDate);
      setFieldValue('endTime', endTime);

      setFieldValue('title', expected.title);
      setFieldValue('description', expected.description);
      setFieldValue('location', expected.location);

      assert.hasProperties(subject.formData(), expected);
    });

  });

  suite('#deleteRecord', function() {
    var calledWith;
    var redirectTo;
    var provider;

    setup(function() {
      redirectTo = null;
      calledWith = null;
      provider = app.provider(account.providerType);

      app.go = function(place) {
        redirectTo = place;
      };

      provider.deleteEvent = function() {
        calledWith = arguments;
      };

      // setup the delete
      subject.useModel(busytime, event);

      // must come after dispatch
      subject._returnTo = '/foo';
    });

    test('in create mode', function() {
      subject.provider = null;
      subject.deleteRecord();
      assert.ok(!calledWith);
    });

    test('with valid provider', function() {
      subject.deleteRecord();
      assert.equal(calledWith[0], subject.event.data, 'delete event');
      var cb = calledWith[calledWith.length - 1];
      cb();
      assert.equal(redirectTo, '/foo', 'redirect');
    });
  });

  suite('#save', function() {
    var redirectTo;
    var provider;
    var list;
    var calledWith;

    setup(function() {
      calledWith = null;
      provider = eventStore.providerFor(event);
      list = subject.element.classList;

      app.go = function(place) {
        redirectTo = place;
      };
    });

    function haltsOnError() {
      test('does not save when validator errors occurs', function() {
        var event = subject.event;
        var errors = [];
        var displayedErrors;

        subject.showErrors = function() {
          displayedErrors = arguments;
        };

        event.validationErrors = function() {
          return errors;
        };

        subject.save();

        assert.ok(!calledWith, 'does not save');
        assert.deepEqual(displayedErrors[0], errors, 'shows errors');
      });
    }

    suite('update', function() {
      setup(function() {
        provider.updateEvent = function() {
          calledWith = arguments;
        };

        subject.onfirstseen();
        subject.useModel(busytime, event);

        subject._returnTo = '/foo';
      });

      haltsOnError();

      test('with provider that can edit', function() {
        setFieldValue('calendarId', calendar._id);
        setFieldValue('startDate', '2012-1-2');
        setFieldValue('title', 'myfoo');

        subject.save();

        var data = subject.formData();
        assert.hasProperties(subject.event, data, 'updated model');
        assert.isTrue(list.contains(subject.PROGRESS));
        assert.ok(calledWith);

        var cb = calledWith[calledWith.length - 1];
        cb();

        assert.isFalse(list.contains(subject.PROGRESS));
        assert.equal(redirectTo, '/foo');

        assert.deepEqual(
          app.timeController.position,
          subject.event.startDate,
          'moves time controller'
        );
      });
    });

    suite('create', function() {
      setup(function() {
        provider.createEvent = function() {
          calledWith = arguments;
        };

        // setup the save
        subject.onfirstseen();
        subject.dispatch({ params: {} });

        // must come after dispatch
        subject._returnTo = '/foo';
      });

      haltsOnError();

      test('with provider that can create', function() {
        assert.ok(!subject.provider, 'has no provider yet');

        setFieldValue('calendarId', calendar._id);
        setFieldValue('startDate', '2012-1-2');
        setFieldValue('endDate', '2012-1-3');
        setFieldValue('title', 'myfoo');

        subject.save();

        var data = subject.formData();
        assert.hasProperties(subject.event, data, 'updated model');
        assert.isTrue(list.contains(subject.PROGRESS));
        assert.ok(calledWith);

        var cb = calledWith[calledWith.length - 1];
        cb();

        assert.isFalse(list.contains(subject.PROGRESS));
        assert.equal(redirectTo, '/foo');

        assert.deepEqual(
          app.timeController.position,
          subject.event.startDate,
          'moves timeController'
        );
      });

    });

  });

  suite('calendar id handling', function() {
    var calendars;
    var accounts;
    var list;
    var element;

    setup(function() {
      accounts = app.store('Account');
      calendars = app.store('Calendar');

      accounts.cached.one = {
        providerType: 'Test'
      };

      list = calendars._cached = {};

      list.one = Factory('calendar', { _id: 'one', accountId: 'one' });
      list.two = Factory('calendar', { _id: 'two', accountId: 'one' });

      subject.onfirstseen();
      element = getField('calendarId');
    });

    test('calendarId select element (#_buildCalendarIds)', function() {
      assert.length(element.children, 2, 'has two calendars');

      var id;
      var option;

      for (id in list) {
        option = element.querySelector('[value="' + id + '"]');
        assert.ok(option, 'option for id: ' + id);
        assert.equal(option.textContent, list[id].name);
      }
    });

    test('rename calendar (#_updateCalendarId)', function() {
      list.one.remote.name = 'fooobar';
      calendars.emit('update', list.one._id, list.one);

      var option = element.querySelector('[value="' + list.one._id + '"]');
      assert.equal(option.textContent, 'fooobar');
    });

    test('change calendar permissions', function() {
      calendars.emit('add', calendar._id, calendar);
      assert.length(element.children, 3, 'added one');

      setProviderCaps({
        canCreateEvent: false
      });

      calendars.emit('update', calendar._id, calendar);
      assert.length(element.children, 2, 'added one');
    });

    test('add calendar (#_addCalendarId)', function() {
      var newCal = Factory('calendar', { _id: 'three', accountId: 'one' });
      calendars.emit('add', newCal._id, newCal);

      assert.length(element.children, 3, 'added one');

      var option = element.querySelector('[value="' + newCal._id + '"]');
      assert.equal(option.textContent, newCal.name);
      assert.ok(option, 'added calendar');
    });

    test('remove calendar (#_removeCalendarId)', function() {
      calendars.emit('remove', list.one._id);
      assert.length(element.children, 1, 'removed one');

      var option = element.querySelector('[value="' + list.two._id + '"]');
      assert.ok(option, 'removed correct item');
    });
  });

  suite('#returnTo', function() {
    test('without returnTo', function() {
      assert.equal(subject.returnTo(), subject.DEFAULT_VIEW);
    });

    test('/add set', function() {
      subject._returnTo = '/add/';
      assert.equal(subject.returnTo(), subject.DEFAULT_VIEW);
    });

    test('with returnTo', function() {
      var path = subject._returnTo = '/foo';
      assert.equal(subject.returnTo(), path);
    });
  });

  suite('#_createModel', function() {
    var controller;
    var date = new Date(2012, 0, 1);

    test('time is less then now', function() {
      var now = new Date();
      var start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours() + 1
      );

      var end = new Date(start.valueOf());
      end.setHours(end.getHours() + 1);

      var model = subject._createModel(date);

      assert.hasProperties(
        model,
        { startDate: start, endDate: end }
      );
    });

    test('time is greater then now', function() {
      var now = new Date();
      var start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours() + 10
      );

      var end = new Date(start.valueOf());
      end.setHours(end.getHours() + 1);

      var model = subject._createModel(start);

      assert.hasProperties(
        model,
        { startDate: start, endDate: end }
      );
    });
  });

  suite('dom events', function() {

    suite('allday', function() {
      var allday;
      var list;

      function check(value) {
        allday.checked = value;
        triggerEvent(allday, 'change');
      }

      setup(function() {
        subject.onfirstseen();
        subject.useModel(busytime, event);
        list = subject.element.classList;
        allday = subject.getField('allday');
      });

      test('initial', function() {
        check(true);
        assert.ok(list.contains(subject.ALLDAY), 'has allday');
      });

      test('uncheck', function() {
        check(true);
        check(false);
        assert.ok(!list.contains(subject.ALLDAY), 'has allday');
      });

      test('when start & end are same dates (all day)', function() {
        var model = subject.event;
        var date = new Date(2012, 0, 1);
        var value = InputParser.exportDate(date);

        setFieldValue('startDate', value);
        setFieldValue('endDate', value);

        check(true);

        var result = subject.formData();
        var expected = {
          startDate: new Date(2012, 0, 1),
          endDate: new Date(2012, 0, 2)
        };

        // should increment end date by one.
        assert.hasProperties(result, expected);
      });
    });

    test('submit form', function() {
      var calledWith;

      subject.onfirstseen();
      subject.dispatch({ params: {} });

      provider.createEvent = function() {
        calledWith = arguments;
      };

      triggerEvent(subject.form, 'submit');
      assert.ok(calledWith);
    });

    test('delete button click', function(done) {
      var calledWith;
      var provider = eventStore.providerFor(event);
      subject.useModel(busytime, event);

      provider.deleteEvent = function() {
        done();
      };

      triggerEvent(subject.deleteButton, 'click');
    });

    test('save button click', function() {
      var calledWith;

      subject.onfirstseen();
      subject.dispatch({ params: {} });

      provider.createEvent = function() {
        calledWith = arguments;
      };

      triggerEvent(subject.saveButton, 'click');
      assert.ok(calledWith);
    });
  });

});
