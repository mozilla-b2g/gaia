requireSupport('event_helper.js');
requireLib('provider/abstract.js');

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
      '<div id="event-view">',
        '<button class="edit">edit</button>',
        '<button class="cancel">cancel</button>',
          '<div class="title">',
            '<span class="content"></span>',
          '</div>',
          '<div class="location">',
            '<span class="content"></span>',
          '</div>',
          '<div class="current-calendar">',
            '<span class="content"></span>',
          '</div>',
          '<div class="start-date">',
            '<span class="content"></span>',
            '<span class="start-time">',
              '<span class="content"></span>',
            '</span>',
          '</div>',
          '<div class="end-date">',
            '<span class="content"></span>',
            '<span class="end-time">',
              '<span class="content"></span>',
            '</span>',
          '</div>',
          '<div class="description">',
            '<span class="content"></span>',
          '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(div);
    app = testSupport.calendar.app();
    app._providers.Test = new TestProvider({ app: app });

    eventStore = app.store('Event');
    accountStore = app.store('Account');
    calendarStore = app.store('Calendar');
    provider = app.provider('Test');

    eventHelper.setProviderCaps(provider);

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

    subject = new Calendar.Views.ViewEvent({
      app: app
    });
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

  test('#_getEl', function() {
    var expected = subject.fieldRoot.querySelector('.title');
    assert.ok(expected);
    assert.equal(expected.tagName.toLowerCase(), 'div');

    var result = subject.getEl('title');

    assert.equal(result, expected);
    assert.equal(result, subject.getEl('title'));
    assert.equal(subject._els.title, expected);
  });

  suite('#_displayModel', function() {
    var list;

    setup(function() {
      list = subject.element.classList;
    });

    function updatesValues(overrides, isAllDay) {
      var expected = {
        title: remote.title,
        location: remote.location,
        startDate: InputParser.exportDate(remote.startDate),
        startTime: InputParser.exportTime(remote.startDate),
        endDate: InputParser.exportDate(remote.endDate),
        endTime: InputParser.exportTime(remote.endDate),
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

      subject.onfirstseen();
      subject.useModel(busytime, event);

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

    test('event view fields', function() {
      updatesValues();
    });

    test('readonly', function() {
      eventHelper.setProviderCaps(provider, {
        canUpdateEvent: false,
        canCreateEvent: false
      });
      updatesValues();
    });

    test('event description with html', function() {
      event.remote.description = '<strong>hamburger</strong>';
      updatesValues({
        description: '<strong>hamburger</strong>'
      });
    });

    test('when start & end times are 00:00:00', function() {
      remote.startDate = new Date(2012, 0, 1);
      remote.endDate = new Date(2012, 0, 2);
      updatesValues({
        endDate: '2012-01-01'
      }, true);
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
