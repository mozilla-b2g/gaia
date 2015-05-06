/* global suiteTemplate */
define(function(require) {
'use strict';

var EventBase = require('views/event_base');
var View = require('view');
var ViewEvent = require('views/view_event');
var core = require('core');
var router = require('router');

require('dom!show_event');

suite('Views.ViewEvent', function() {
  var subject;
  var controller;

  var event;
  var account;
  var calendar;
  var busytime;
  var provider;

  var remote;
  var eventStore;
  var calendarStore;
  var accountStore;

  function getEl(name) {
    return subject.getEl(name);
  }

  function contentValue(name) {
    var field = getEl(name).querySelector('.content');
    return field.textContent;
  }

  var triggerEvent;
  suiteSetup(function() {
    testSupport.calendar.core();
    triggerEvent = testSupport.calendar.triggerEvent;
  });


  var realGo;

  teardown(function() {
    router.go = realGo;
  });

  suiteTemplate('show-event', {
    id: 'event-view'
  });

  setup(function(done) {
    realGo = router.go;

    var storeFactory = core.storeFactory;
    eventStore = storeFactory.get('Event');
    accountStore = storeFactory.get('Account');
    calendarStore = storeFactory.get('Calendar');
    provider = core.providerFactory.get('Mock');

    controller = core.timeController;

    subject = new ViewEvent();

    core.db.open(done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      core.db,
      ['accounts', 'calendars', 'events', 'busytimes', 'alarms'],
      function() {
        core.db.close();
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

  setup(function() {
    remote = this.event.remote;
    event = this.event;
    calendar = this.calendar;
    account = this.account;
    busytime = this.busytime;
  });

  test('initialization', function() {
    assert.instanceOf(subject, View);
    assert.instanceOf(subject, EventBase);
    assert.equal(subject._changeToken, 0);

    assert.ok(subject._els, 'has elements');
  });

  test('.primaryButton', function() {
    assert.ok(subject.primaryButton);
  });

  test('.header', function() {
    assert.ok(subject.header);
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
        currentCalendar: calendar.remote.name,
        description: remote.description
      };

      var allDayHidden = [
        'startTime',
        'endTime'
      ];

      if (overrides) {
        for (var key in overrides) {
          expected[key] = overrides[key];
        }
      }

      function verify() {
        if (subject.provider.canCreateEvent) {
          expected.calendarId = event.calendarId;
        }

        function replaceCaps($1) { return '-' + $1.toLowerCase(); }
        for (var key in expected) {

          // To dash-delimited
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
          alarmChildren[0].textContent.trim(),
          navigator.mozL10n.get('alarm-at-event-standard')
        );
        assert.equal(
          alarmChildren[1].textContent.trim(),
          navigator.mozL10n.get('minutes-before', {value: 1})
        );

        done();
      });
    });
  });

  suite('navigation', function() {
    test('cancel button step back', function(done) {

      router.go = function(place) {
        assert.equal(place, '/foo', 'redirects to proper location');
        done();
      };

      subject._returnTop = '/foo';

      triggerEvent(subject.header, 'action');
    });

    test('cancel button return top', function(done) {

      router.go = function(place) {
        assert.equal(place, '/bar', 'redirects to proper location');
        done();
      };

      subject._returnTo = '/bar';

      triggerEvent(subject.header, 'action');
    });

    test('edit button click', function(done) {

      router.go = function(place) {
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

});
