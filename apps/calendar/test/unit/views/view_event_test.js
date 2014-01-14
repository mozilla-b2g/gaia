requireLib('provider/abstract.js');
requireLib('template.js');
requireLib('templates/alarm.js');
requireElements('calendar/elements/show_event.html');

mocha.globals(['InputParser']);

suiteGroup('Views.ViewEvent', function() {

  var subject;
  var controller;
  var app;

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

  function getEl(name) {
    return subject.getEl(name);
  }

  function contentValue(name) {
    var field = getEl(name).querySelector('.content');
    return field.textContent;
  }

  var triggerEvent;
  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });


  var realGo;

  teardown(function() {
    Calendar.App.go = realGo;
    delete app._providers.Test;
  });

  suiteTemplate('show-event', {
    id: 'event-view'
  });

  setup(function(done) {
    realGo = Calendar.App.go;
    app = testSupport.calendar.app();

    eventStore = app.store('Event');
    accountStore = app.store('Account');
    calendarStore = app.store('Calendar');
    provider = app.provider('Mock');

    controller = app.timeController;

    subject = new Calendar.Views.ViewEvent({
      app: app
    });

    app.db.open(done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      app.db,
      ['accounts', 'calendars', 'events', 'busytimes', 'alarms'],
      function() {
        app.db.close();
        done();
      }
    );
  });

  testSupport.calendar.accountEnvironment();
  testSupport.calendar.eventEnvironment(
    // busytime
    {
      startDate: new Date(2012, 1, 1, 1),
      endDate: new Date(2012, 1, 5, 1)
    },
    // event
    {
      startDate: new Date(2012, 1, 1, 1),
      endDate: new Date(2012, 1, 5, 1)
    }
  );

  var remote;
  var event;
  var calendar;
  var account;
  var busytime;

  setup(function() {
    remote = this.event.remote;
    event = this.event;
    calendar = this.calendar;
    account = this.account;
    busytime = this.busytime;
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.instanceOf(subject, Calendar.Views.EventBase);
    assert.equal(subject._changeToken, 0);

    assert.ok(subject._els, 'has elements');
  });

  test('.primaryButton', function() {
    assert.ok(subject.primaryButton);
  });

  test('.cancelButton', function() {
    assert.ok(subject.cancelButton);
  });

  test('.fieldRoot', function() {
    assert.ok(subject.fieldRoot);
    assert.equal(subject.fieldRoot, subject.element);
  });

  test('#setContent', function() {
    subject.setContent('title', '<b>text</b>');
    assert.equal(
      subject.getEl('title').querySelector('.content').innerHTML,
      '&lt;b&gt;text&lt;/b&gt;'
    );

    subject.setContent('title', '<b>text</b>', 'innerHTML');
    assert.equal(
      subject.getEl('title').querySelector('.content').innerHTML,
      '<b>text</b>'
    );
  });

  test('#_getEl', function() {
    var expected = subject.fieldRoot.querySelector('.title');
    assert.ok(expected);
    assert.equal(expected.tagName.toLowerCase(), 'li');

    var result = subject.getEl('title');

    assert.equal(result, expected);
    assert.equal(result, subject.getEl('title'));
    assert.equal(subject._els.title, expected);
  });

  suite('#_updateUI', function() {
    var list;

    setup(function() {
      list = subject.element.classList;
    });

    function updatesValues(overrides, isAllDay, done) {

      var expected = {
        title: remote.title,
        location: remote.location,
        startDate: subject.formatDate(remote.startDate),
        startTime: subject.formatTime(remote.startDate),
        endDate: subject.formatDate(remote.endDate),
        endTime: subject.formatTime(remote.endDate),
        currentCalendar: calendar.remote.name,
        description: remote.description
      };

      var allDayHidden = [
        'startTime',
        'endTime'
      ];

      var key;

      if (overrides) {
        for (key in overrides) {
          expected[key] = overrides[key];
        }
      }

      function verify() {
        if (subject.provider.canCreateEvent) {
          expected.calendarId = event.calendarId;
        }

        for (key in expected) {

          // To dash-delimited
          function replaceCaps($1) { return '-' + $1.toLowerCase(); }
          var fieldKey = key.replace(/([A-Z])/g, replaceCaps);

          if (isAllDay && allDayHidden.indexOf(key) !== -1) {
            assert.equal(
                contentValue(fieldKey),
                '',
                'time element should be empty for all-day: "' + key + '"'
              );
            continue;
          }

          if (expected.hasOwnProperty(key)) {

            assert.equal(
              contentValue(fieldKey),
              expected[key],
              'should set "' + key + '"'
            );
          }
        }
      }

      subject.onfirstseen();
      subject.useModel(busytime, event, function() {
        done(verify);
      });
    }

    test('event view fields', function(done) {
      updatesValues(null, null, done);
    });

    test('readonly', function(done) {
      provider.stageCalendarCapabilities(calendar._id, {
        canUpdateEvent: false,
        canCreateEvent: false
      });

      updatesValues(null, null, done);
    });

    test('event description with html', function(done) {
      event.remote.description = '<strong>hamburger</strong>';

      updatesValues(
        { description: '<strong>hamburger</strong>' },
        null,
        done
      );
    });

    test('when start & end times are 00:00:00', function(done) {
      remote.startDate = new Date(2012, 0, 1);
      remote.endDate = new Date(2012, 0, 2);

      updatesValues(
        { endDate: '01/01/2012' },
        true,
        done
      );
    });

    test('alarms are displayed', function(done) {

      event.remote.alarms = [
        {trigger: 0},
        {trigger: -60}
      ];

      subject.onfirstseen();
      subject.useModel(busytime, event, function() {

        var alarmChildren = getEl('alarms').querySelector('.content').children;

        assert.equal(
          alarmChildren.length,
          2
        );

        assert.equal(
          alarmChildren[0].textContent,
          navigator.mozL10n.get('alarm-at-event-standard')
        );
        assert.equal(
          alarmChildren[1].textContent,
          navigator.mozL10n.get('minutes-before', {value: 1})
        );

        done();
      });
    });
  });

  suite('#formatTime', function() {
    test('returns empty if invalid', function() {
      var result = subject.formatTime();
      assert.equal('', result);
    });
  });

  suite('navigation', function() {
    test('cancel button step back', function(done) {

      app.go = function(place) {
        assert.equal(place, '/foo', 'redirects to proper location');
        done();
      };

      subject._returnTop = '/foo';

      triggerEvent(subject.cancelButton, 'click');
    });

    test('cancel button return top', function(done) {

      app.go = function(place) {
        assert.equal(place, '/bar', 'redirects to proper location');
        done();
      };

      subject._returnTo = '/bar';

      triggerEvent(subject.cancelButton, 'click');
    });

    test('edit button click', function(done) {

      app.go = function(place) {
        assert.equal(place, '/event/edit/funtime/', 'redirects to event page');
        done();
      };

      subject.busytime = {
        _id: 'funtime'
      };

      triggerEvent(subject.primaryButton, 'click');
    });
  });
});
