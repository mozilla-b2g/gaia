define(function(require) {
'use strict';

var MonthsDay = require('views/months_day');
var dateFormat = require('date_format');
var dayObserver = require('day_observer');
var template = require('templates/months_day');

suite('Views.MonthsDay', function() {
  var subject,
      app;

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
    dayObserver.removeAllListeners();
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="months-day-view">',
        '<div class="day-events"></div>',
      '</div>'
    ].join(' ');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    subject = new MonthsDay({ app: app });
  });

  suite('#changeDate', function() {
    var currentDate;

    setup(function() {
      currentDate = {
        textContent: '',
        dataset: {}
      };
      sinon.stub(subject, '_findElement')
        .withArgs('currentDate')
        .returns(currentDate);

      sinon.spy(dayObserver, 'on');
      sinon.spy(dayObserver, 'off');
    });

    teardown(function() {
      dayObserver.on.restore();
      dayObserver.off.restore();
      subject._findElement.restore();
    });

    test('> date', function() {
      var now = new Date();
      var format = 'months-day-view-header-format';
      subject.changeDate(now);

      assert.deepEqual(currentDate.textContent, dateFormat.localeFormat(
        now,
        navigator.mozL10n.get(format)
      ), 'should set the currentDate textContent');

      assert.deepEqual(currentDate.dataset, {
        date: now,
        l10nDateFormat: format
      }, 'should set l10n dataset');

      assert.ok(
        !dayObserver.off.called,
        'should only remove listener if we have a reference to previous date'
      );

      assert.ok(
        dayObserver.on.calledWith(now, subject._render),
        'should listen current day'
      );
    });

    test('> null', function() {
      var format = 'months-day-view-header-format';
      var oldDate = new Date(2012, 8, 1);
      subject.date = oldDate;
      subject.changeDate(null);

      assert.notDeepEqual(subject.date, oldDate, 'date changed');

      assert.deepEqual(currentDate.textContent, dateFormat.localeFormat(
        subject.date,
        navigator.mozL10n.get(format)
      ), 'should set the currentDate textContent');

      assert.deepEqual(currentDate.dataset, {
        date: subject.date,
        l10nDateFormat: format
      }, 'should set l10n dataset');

      assert.ok(
        dayObserver.off.calledWith(oldDate, subject._render),
        'should remove previous listener'
      );

      assert.ok(
        dayObserver.on.calledWith(subject.date, subject._render),
        'should listen current day'
      );
    });
  });

  suite('#_render', function() {
    var events = document.createElement('div');
    var emptyMessage = {};

    setup(function() {
      sinon.stub(subject, '_findElement')
        .withArgs('events').returns(events)
        .withArgs('emptyMessage').returns(emptyMessage);

      subject.date = new Date(2014, 9, 22);
      emptyMessage.classList = {
        toggle: sinon.spy()
      };

      sinon.spy(template.event, 'render');
    });

    teardown(function() {
      subject._findElement.restore();
      template.event.render.restore();
    });

    test('> no record', function() {
      subject._render({ events: [], allday: [], amount: 0 });

      assert.deepEqual(subject.events.innerHTML, '', 'should clear events');

      assert.ok(
        emptyMessage.classList.toggle.calledWith('active', true),
        'should display empty message'
      );
    });

    test('> with records', function() {
      subject._render({
        amount: 2,
        events: [
          {
            event: {
              calendarId: '3',
              remote: {
                title: 'Lorem',
                location: 'Ipsum',
                alarms: []
              }
            },
            busytime: {
              _id: '3-lorem',
              startDate: new Date(2014, 9, 22, 1),
              endDate: new Date(2014, 9, 22, 3)
            }
          },
          {
            event: {
              calendarId: '7',
              remote: {
                title: 'Foo',
                location: 'Bar',
                alarms: [1, 2]
              }
            },
            busytime: {
              _id: '7-busy-foo',
              startDate: new Date(2014, 9, 22, 13),
              endDate: new Date(2014, 9, 22, 14)
            }
          }
        ],
        allday: []
      });

      // should pass proper arguments to template
      // output is already tested by template unit test
      sinon.assert.calledWithMatch(template.event.render, {
        hasAlarms: true,
        busytimeId: '7-busy-foo',
        calendarId: '7',
        title: 'Foo',
        location: 'Bar',
        startTime: new Date(2014, 9, 22, 13),
        endTime: new Date(2014, 9, 22, 14),
        isAllDay: false
      });

    });
  });

  suite('#handleEvent', function() {

/*
// This test is currently failing and has been temporarily disabled as per
// Bug 838993. It should be fixed and re-enabled as soon as possible as per
// Bug 840489.
// This test appears to make incorrect assumptions about localization details
// (it does not fail on systems configured for US English).
    test('selectedDayChange', function() {
      var date = new Date(2012, 1, 1);
      var calledWith;

      // start with different date...
      subject.date = new Date(2012, 1, 27);

      // initialize events
      subject.render();

      subject.changeDate = function() {
        Calendar.Views.MonthsDay.prototype.changeDate.apply(
          this, arguments
        );

        calledWith = arguments;
      };

      subject.controller.selectedDay = date;
      assert.equal(
        calledWith[0],
        date,
        'should change date in view when controller changes'
      );

      assert.deepEqual(
        subject.date,
        date
      );

      var html = subject.header.outerHTML;
      assert.ok(html);
      assert.include(html, date.toLocaleFormat('%A'));
    });
*/
  });

/*
// This test is currently failing and has been temporarily disabled as per
// Bug 838993. It should be fixed and re-enabled as soon as possible as per
// Bug 840489.
// This test appears to make incorrect assumptions about localization details
// (it does not fail on systems configured for US English).
  test('#render', function() {
    var date = new Date();
    var span = Calendar.Calc.spanOfDay(date);


    subject.render();
    assert.deepEqual(subject.timespan, span);

    assert.ok(subject.allDayElement, 'has all day');
    assert.ok(subject.events, 'has events');

    var html = subject.header.outerHTML;
    assert.ok(html);
    assert.include(html, date.toLocaleFormat('%A'));
  });
*/
});

});
