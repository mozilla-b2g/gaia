requireLib('provider/abstract.js');
requireLib('template.js');
requireLib('querystring.js');
requireElements('calendar/elements/modify_event.html');
requireElements('calendar/elements/show_event.html');

suiteGroup('Views.ModifyEvent', function() {
  /** disabled because of intermittent failures see bug 917537 */
  return;

  var subject;
  var controller;
  var app;
  var fmt;

  var provider;

  var eventStore;
  var calendarStore;
  var accountStore;
  var settingStore;

  function clearMS(date) {
    var newDate = new Date(date.valueOf());
    newDate.setMilliseconds(0);
    return newDate;
  }

  function hasClass(value) {
    return subject.element.classList.contains(value);
  }

  function getEl(name) {
    return subject.getEl(name);
  }

  function setFieldValue(name, value) {
    var field = getEl(name);
    return field.value = value;
  }

  function fieldValue(name) {
    var field = getEl(name);
    return field.value;
  }

  function escapeHTML(html) {
    var template = new Calendar.Template(function() {
      return this.h('value');
    });

    return template.render({ value: html });
  }

  function primaryIsEnabled() {
    assert.ok(
      !subject.primaryButton.hasAttribute('aria-disabled'),
      'button is enabled'
    );
  }

  function primaryIsDisabled() {
    assert.ok(
      subject.primaryButton.hasAttribute('aria-disabled'),
      'button is disabled'
    );
  }

  var triggerEvent;
  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  var realGo;

  teardown(function() {
    Calendar.App.go = realGo;
  });

  suiteTemplate('show-event', {
    id: 'event-view'
  });

  suiteTemplate('modify-event', {
    id: 'modify-event-view'
  });

  setup(function(done) {
    app = testSupport.calendar.app();
    realGo = app.go;

    eventStore = app.store('Event');
    accountStore = app.store('Account');
    calendarStore = app.store('Calendar');
    settingStore = app.store('Setting');
    provider = app.provider('Mock');

    fmt = navigator.mozL10n.DateTimeFormat();

    controller = app.timeController;

    app.db.open(done);
    subject = new Calendar.Views.ModifyEvent({
      app: app
    });
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

    assert.ok(subject._els, 'has fields');
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

  test('.primaryButton', function() {
    assert.ok(subject.primaryButton);
  });

  test('.deleteButton', function() {
    assert.ok(subject.deleteButton);
  });

  test('.fieldRoot', function() {
    assert.ok(subject.fieldRoot);
    assert.equal(subject.fieldRoot, subject.form);
  });

  test('#getEl', function() {
    var expected = subject.form.querySelector('[name="title"]');
    assert.ok(expected);
    assert.equal(expected.tagName.toLowerCase(), 'input');

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

    function updatesValues(overrides, callback) {
      // just to verify we actually clear fields...
      getEl('title').value = 'foo';
      event.remote.description = '<span>foo</span>';

      var expected = {
        title: remote.title,
        location: remote.location,
        startDate: InputParser.exportDate(remote.startDate),
        startTime: InputParser.exportTime(remote.startDate),
        endDate: InputParser.exportDate(remote.endDate),
        endTime: InputParser.exportTime(remote.endDate),
        currentCalendar: calendar.remote.name
      };

      var key;

      if (overrides) {
        for (key in overrides) {
          expected[key] = overrides[key];
        }
      }

      function verify() {
        if (subject.provider.canCreateEvent) {
          expected.calendarId = this.event.calendarId;
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

        var curCal = getEl('currentCalendar');
        assert.isTrue(curCal.readOnly, 'current calendar readonly');

        var expected = escapeHTML(event.remote.description);

        assert.equal(
          getEl('description').innerHTML,
          expected
        );

        callback();
      }

      subject.onfirstseen();
      subject.onafteronfirstseen = function() {
        subject.useModel(busytime, event, verify);
      };
    }

    test('provider can edit', function(done) {
      updatesValues(null, function() {
        done(function() {
          assert.ok(!getEl('title').readOnly, 'does not mark as readOnly');
        });
      });
    });


    test('provider cannot edit', function(done) {

      provider.stageEventCapabilities(event._id, null, {
        canUpdate: false,
        canCreate: false
      });

      remote.startDate = new Date(2012, 0, 1, 10);

      updatesValues(null, function() {
        done(function() {
          assert.isTrue(list.contains(subject.READONLY), 'is readonly');
          assert.isFalse(list.contains(subject.ALLDAY), 'is allday');

          var allday = subject.getEl('allday');
          assert.isFalse(allday.checked, 'is allday');

          assert.ok(getEl('title').readOnly, 'marks readonly');
        });
      });

    });


    test('use busytime instance when isRecurring', function(done) {
      var eventRecurring = Factory('event', {
        calendarId: calendar._id,
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

      subject.useModel(busytimeRecurring, eventRecurring, function() {
        done(function() {
          var expected = {
            startDate: busytimeRecurring.startDate,
            endDate: busytimeRecurring.endDate
          };

          var actual = subject.formData();
          actual.calendarId = parseInt(actual.calendarId, 10);
          assert.hasProperties(actual, expected);
        });
      });
    });

    test('when start & end times are 00:00:00', function(done) {
      remote.startDate = new Date(2012, 0, 1);
      remote.endDate = new Date(2012, 0, 2);
      updatesValues({ endDate: '2012-01-01' }, function() {
        done(function() {
          var allday = subject.getEl('allday');
          assert.isTrue(allday.checked, 'checks all day');

          assert.ok(list.contains(subject.ALLDAY));
        });
      });
    });


    test('saved alarms are shown for all-day events', function(done) {
      remote.startDate = new Date(2012, 0, 1);
      remote.endDate = new Date(2012, 0, 2);
      remote.alarms = [
        {trigger: -300},
        {trigger: 0}
      ];

      var updateTo = { alarms: remote.alarms, endDate: '2012-01-01' };
      updatesValues(updateTo, function() {
        done(function() {
          var allday = subject.getEl('allday');
          assert.isTrue(allday.checked, 'checks all day');

          assert.ok(list.contains(subject.ALLDAY));
          assert.equal(subject.event.alarms.length, 2);
        });
      });
    });


    // this allows to test _updateDateTimeLocale()
    test('date/time are displayed according to the locale', function(done) {
      remote.startDate = new Date(2012, 11, 30, 1, 2);
      remote.endDate = new Date(2012, 11, 31, 13, 4);

      updatesValues({}, function() {
        done(function() {
          var startDateLocale = document.getElementById('start-date-locale');
          assert.equal(startDateLocale.textContent, '12/30/2012');

          var endDateLocale = document.getElementById('end-date-locale');
          assert.equal(endDateLocale.textContent, '12/31/2012');

          var startTimeLocale = document.getElementById('start-time-locale');
          assert.equal(startTimeLocale.textContent, '1:02 AM');

          var endTimeLocale = document.getElementById('end-time-locale');
          assert.equal(endTimeLocale.textContent, '1:04 PM');
        });
      });
    });
  });

  suite('#_overrideEvent', function(done) {
    var startDate;
    var endDate;
    var search;

    setup(function() {
      startDate = new Date(1989, 4, 17, 2, 0, 0, 0);
      endDate = new Date(1989, 4, 17, 3, 0, 0, 0);
      var queryString = {
        startDate: startDate.toString(),
        endDate: endDate.toString()
      };

      search = '?' + Calendar.QueryString.stringify(queryString);
      subject.useModel(this.busytime, this.event, done);
    });

    test('should set startDate and endDate on the event', function() {
      assert.notEqual(subject.event.startDate.getTime(), startDate.getTime());
      assert.notEqual(subject.event.endDate.getTime(), endDate.getTime());
      subject._overrideEvent(search);
      assert.equal(subject.event.startDate.getTime(), startDate.getTime());
      assert.equal(subject.event.endDate.getTime(), endDate.getTime());
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

    var title = getEl('title');
    title.value = 'foo';

    list.add(subject.ALLDAY);
    list.add(subject.UPDATE);
    list.add(subject.CREATE);
    list.add(subject.READONLY);

    subject._returnTo = 'foo';
    subject.provider = 'foobar';
    subject.event = 'foo';
    subject.busytime = 'foo';


    var allday = subject.getEl('allday');
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

  suite('#formData', function() {

    setup(function(done) {
      subject.onfirstseen();
      subject.onafteronfirstseen = function() {
        subject.useModel(busytime, event, done);
      };
    });

    test('when allday', function() {
      var allday = getEl('allday');
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
        startDate: clearMS(event.remote.startDate),
        endDate: clearMS(event.remote.endDate),
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
        calendarId: this.calendar._id
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
    var realGo;

    setup(function(done) {
      calledWith = null;
      provider.deleteEvent = function() {
        calledWith = arguments;
      };

      // setup the delete
      subject.useModel(this.busytime, this.event, function() {
        // must come after dispatch
        subject._returnTo = '/foo';
        done();
      });
    });

    test('in create mode', function() {
      provider.deleteEvent = function() {
        throw new Error('should not trigger delete');
      };

      subject.provider = null;
      subject.deleteRecord();
    });

    test('with an error', function(done) {
      var err = new Calendar.Error.Authentication();
      subject.showErrors = function(givenErr) {
        done(function() {
          assert.equal(err, givenErr);
        });
      };

      provider.deleteEvent = function(model, callback) {
        Calendar.nextTick(callback.bind(null, err));
      };

      subject.deleteRecord();
    });

    test('with valid provider', function(done) {
      provider.deleteEvent = function(toDelete, callback) {
        assert.equal(toDelete._id, event._id, 'deletes event');
        callback();
      };

      app.go = function(place) {
        assert.notEqual(place, '/foo', 'redirect is changed to event url');
        done();
      };

      subject.deleteRecord();
    });
  });

  suite('#save', function() {
    var redirectTo;
    var list;
    var calledWith;

    setup(function() {
      calledWith = null;
      list = subject.element.classList;

      app.go = function(place) {
        redirectTo = place;
      };
    });

    function haltsOnError(providerMethod) {
      test('does not persist record when provider fails', function(done) {
        var dispatchesError;
        var err = new Calendar.Error.Authentication();
        subject.showErrors = function(gotErr) {
          done(function() {
            assert.equal(err, gotErr, 'dispatches error');
          });
        };

        provider[providerMethod] = function() {
          var args = Array.slice(arguments);
          var cb = args.pop();
          Calendar.nextTick(cb.bind(null, err));
        };

        subject.primary();
      });

      test('does not invoke provider when validations fails', function(done) {
        provider[providerMethod] = function() {
          done(new Error('should not persist record.'));
        };

        var event = subject.event;
        var errors = [new Error('epic fail')];
        var displayedErrors;

        subject.showErrors = function(givenErrs) {
          done(function() {
            assert.deepEqual(givenErrs, errors, 'shows errors');
          });
        };

        subject.event.validationErrors = function() {
          return errors;
        };

        subject.primary();

      });
    }

    suite('update', function() {
      setup(function(done) {
        subject.onfirstseen();
        subject.onafteronfirstseen = function() {
          subject.useModel(busytime, event, function() {
            subject._returnTo = '/foo';
            done();
          });
        };
      });

      haltsOnError('updateEvent');

      test('with provider that can edit', function(done) {

        provider.updateEvent = function(updated, callback) {
          done(function() {
            assert.equal(updated._id, event._id, 'updates correcet event');

            var data = subject.formData();
            data.alarms = [];
            assert.hasProperties(subject.event, data, 'updated model');
            assert.isTrue(list.contains(subject.PROGRESS));

            callback();

            assert.isFalse(list.contains(subject.PROGRESS));
            assert.notEqual(redirectTo, '/foo');

            assert.deepEqual(
              app.timeController.position,
              subject.event.startDate,
              'moves time controller'
            );
          });
        };

        setFieldValue('calendarId', this.calendar._id);
        setFieldValue('startDate', '2012-1-2');
        setFieldValue('title', 'myfoo');

        subject.primary();
      });
    });

    suite('create', function() {
      setup(function(done) {
        // setup the save
        subject.onfirstseen();
        subject.onafteronfirstseen = function() {
          subject.dispatch({ params: {} });
          subject.ondispatch = function() {
            // must come after dispatch
            subject._returnTo = '/foo';
            done();
          };
        };
      });

      haltsOnError('createEvent');

      test('with provider that can create', function(done) {
        provider.createEvent = function(event, callback) {
          done(function() {
            var data = subject.formData();

            data.alarms = [];

            assert.hasProperties(subject.event, data, 'updated model');
            assert.isTrue(list.contains(subject.PROGRESS));

            callback();

            assert.isFalse(list.contains(subject.PROGRESS));
            assert.equal(redirectTo, '/foo');

            assert.deepEqual(
              app.timeController.position,
              subject.event.startDate,
              'moves timeController'
            );
          });
        };

        assert.ok(!subject.provider, 'has no provider yet');

        setFieldValue('calendarId', calendar._id);
        setFieldValue('startDate', '2012-1-2');
        setFieldValue('endDate', '2012-1-3');
        setFieldValue('title', 'myfoo');

        subject.primary();
      });
    });
  });

  suite('calendar id handling', function() {
    var accounts = testSupport.calendar.dbFixtures(
      'account',
      'Account', {
        one: { _id: 55, providerType: 'Mock' }
      }
    );

    var calendars = testSupport.calendar.dbFixtures(
      'calendar',
      'Calendar', {
        one: { _id: 'one', accountId: 55 },
        two: { _id: 'two', accountId: 55 }
      }
    );

    var element;

    setup(function(done) {
      calendars[calendar._id] = calendar;

      subject.onafteronfirstseen = done;
      subject.onfirstseen();
      element = getEl('calendarId');
    });

    test('calendarId select element', function() {
      assert.length(element.children, 3, 'has two calendars');

      var id;
      var option;

      for (id in calendars) {
        option = element.querySelector('[value="' + id + '"]');
        assert.ok(option, 'option for id: ' + id);

        assert.equal(
          option.textContent,
          calendars[id].remote.name
        );
      }
    });

    test('rename calendar (#_updateCalendarId)', function(done) {
      subject.oncalendarupdate = function() {
        done(function() {
          var option = element.querySelector(
            '[value="' + calendars.one._id + '"]'
          );

          assert.equal(option.textContent, 'fooobar');
        });
      };

      calendars.one.remote.name = 'fooobar';
      calendarStore.emit('update', calendars.one._id, calendars.one);
    });

    test('change calendar permissions', function(done) {
      var newCalendar = Factory('calendar', { accountId: account._id });

      subject.onaddcalendar = function() {
        provider.stageCalendarCapabilities(newCalendar._id, {
          canCreateEvent: false
        });

        assert.length(element.children, 4, 'added one');
        calendarStore.emit('update', newCalendar._id, newCalendar);
      };

      subject.onremovecalendar = function() {
        assert.length(element.children, 3, 'added one');
        done();
      };

      calendarStore.emit('add', newCalendar._id, newCalendar);
    });

    test('add calendar (#_addCalendarId)', function(done) {
      var newCal = Factory('calendar', {
        _id: 'three',
        accountId: account._id
      });

      calendarStore.emit('add', newCal._id, newCal);

      subject.onaddcalendar = function() {
        done(function() {
          assert.length(element.children, 4, 'added one');

          var option = element.querySelector('[value="' + newCal._id + '"]');
          assert.equal(option.textContent, newCal.remote.name);
          assert.ok(option, 'added calendar');
        });
      };
    });

    test('remove calendar (#_removeCalendarId)', function(done) {
      subject.onremovecalendar = function() {
        subject.onremovecalendar = null;
        done(function() {
          assert.length(element.children, 2, 'removed one');

          var option =
            element.querySelector('[value="' + calendars.two._id + '"]');

          assert.ok(option, 'removed correct item');
        });
      };

      calendarStore.emit('preRemove', calendars.one._id);
      calendarStore.emit('remove', calendars.one._id);
    });
  });

  suite('alarm defaults', function() {

    var defaultAllDayAlarm;
    var defaultEventAlarm;
    var morning = 3600 * 9;
    var oneHour = 3600;

    setup(function(done) {
      var pending = 3;

      // setup the save
      subject.onfirstseen();
      subject.onafteronfirstseen = function() {
        subject.dispatch({ params: {} });
        subject.ondispatch = function() {
          // must come after dispatch
          subject._returnTo = '/foo';
          next();
        };
      };

      settingStore.getValue('standardAlarmDefault', function(err, value) {
        defaultEventAlarm = value;
        next();
      });

      settingStore.getValue('alldayAlarmDefault', function(err, value) {
        defaultAllDayAlarm = value;
        next();
      });

      function next() {
        if (!(--pending)) {
          done();
        }
      }
    });

    test('with no alarms set', function(done) {
      provider.createEvent = function(event, callback) {
        done(function() {
          var data = subject.formData();

          callback();

          assert.deepEqual(
            data.alarms,
            subject.event.alarms,
            'alarms'
          );
        });
      };

      subject.primary();
    });

    function testAlarmIsAdded(done, isAllDay, defaultAlarm) {
      provider.createEvent = function(event, callback) {
        done(function() {
          var data = subject.formData();
          callback();

          assert.deepEqual(
            data.alarms,
            [
              {action: 'DISPLAY', trigger: defaultAlarm},
              {action: 'DISPLAY', trigger: 123}
            ],
            'alarms'
          );
        });
      };

      var allday = subject.getEl('allday');
      allday.checked = isAllDay;
      subject.event.isAllDay = isAllDay;
      subject.updateAlarms(isAllDay, function() {
        var allAlarms = subject.alarmList.querySelectorAll('select');
        assert.equal(allAlarms.length, 2);

        var secondSelect = allAlarms[1];
        assert.ok(secondSelect);

        var newOption = document.createElement('option');
        newOption.value = '123';
        secondSelect.appendChild(newOption);
        secondSelect.value = '123';

        subject.primary();
      });
    }

    test('with all day defaults', function(done) {
      testAlarmIsAdded(done, true, defaultAllDayAlarm);
    });

    test('with event defaults', function(done) {
      testAlarmIsAdded(done, false, defaultEventAlarm);
    });

    test('populated with no existing alarms', function(done) {
      subject.event.alarms = [];
      subject.updateAlarms(true, function() {
        var allAlarms = subject.alarmList.querySelectorAll('select');
        assert.equal(allAlarms.length, 2);
        assert.equal(allAlarms[0].value, defaultAllDayAlarm);
        assert.equal(allAlarms[1].value, 'none');
        done();
      });
    });

    test('not populated with existing alarms', function(done) {
      subject.event.alarms = [
        {trigger: -300}
      ];
      subject.updateAlarms(true, function() {
        var allAlarms = subject.alarmList.querySelectorAll('select');
        assert.equal(allAlarms.length, 2);
        assert.equal(allAlarms[0].value, -300);
        assert.equal(allAlarms[1].value, 'none');
        done();
      });
    });

    test('populated presaved event with no existing alarms', function(done) {
      subject.event.alarms = [];
      subject.isSaved = function() {
        return true;
      };
      subject.updateAlarms(true, function() {
        var allAlarms = subject.alarmList.querySelectorAll('select');
        assert.equal(allAlarms.length, 1);
        assert.equal(allAlarms[0].value, 'none');
        done();
      });
    });

    function testDefaultAlarms(isAllDay, defaultValue, done) {
      settingStore.getValue('alldayAlarmDefault', function(err, value) {
        var defaultAlarm = value;
        var defaultAlarmKey;
        if (isAllDay === true) {
          defaultAlarmKey = 'alldayAlarmDefault';
        } else {
          defaultAlarmKey = 'standardAlarmDefault';
        }
        settingStore.set(defaultAlarmKey, defaultValue, function(err, value) {
          provider.createEvent = function(event, callback) {
            var data = subject.formData();

            callback();

            if (defaultValue === 'none') {
              assert.deepEqual(
                data.alarms[0].trigger,
                123,
                'alarms'
              );
            } else {
              assert.deepEqual(
                data.alarms[0].trigger,
                defaultValue,
                'alarms'
              );
            }
            settingStore.set(defaultAlarmKey, defaultAlarm,
              function(err, value) {
                done();
              }
            );
          };
          var allday = subject.getEl('allday');
          allday.checked = isAllDay;
          subject.event.isAllDay = isAllDay;
          subject.updateAlarms(isAllDay, function() {
            var allAlarms = subject.alarmList.querySelectorAll('select');
            var firstSelect = allAlarms[0];
            assert.ok(firstSelect);
            if (defaultValue === 'none') {
              assert.equal(allAlarms.length, 1);
              var newOption = document.createElement('option');
              newOption.value = '123';
              firstSelect.appendChild(newOption);
              firstSelect.value = '123';
            } else {
              assert.equal(allAlarms.length, 2);
            }
            subject.primary();
          });
        });
      });
    }

    test('Bug 898242 - when allday alarm default is none', function(done) {
      var isAllDay = true;
      var defaultValue = 'none';
      testDefaultAlarms(isAllDay, defaultValue, done);
    });

    test('Bug 898242 - when allday alarm default is not none', function(done) {
      var isAllDay = true;
      var defaultValue = morning;
      testDefaultAlarms(isAllDay, defaultValue, done);
    });

    test('Bug 898242 - when standard alarm default is none', function(done) {
      var isAllDay = false;
      var defaultValue = 'none';
      testDefaultAlarms(isAllDay, defaultValue, done);
    });

    test('Bug 898242 - when standard alarm default is not none',
      function(done) {
        var isAllDay = false;
        var defaultValue = oneHour;
        testDefaultAlarms(isAllDay, defaultValue, done);
      }
    );
  });

  suite('#returnTo', function() {
    test('without returnTo', function() {
      assert.equal(subject.returnTo(), subject.DEFAULT_VIEW);
    });

    test('with returnTo', function() {
      var path = subject._returnTo = '/foo';
      assert.equal(subject.returnTo(), path);
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
        subject.useModel(this.busytime, this.event);
        list = subject.element.classList;
        allday = subject.getEl('allday');
      });

      test('initial', function() {
        check(true);
        assert.ok(list.contains(subject.ALLDAY), 'has allday');
        assert.isTrue(subject.event.isAllDay, 'model is allday');
      });

      test('uncheck', function() {
        check(true);
        check(false);
        assert.ok(!list.contains(subject.ALLDAY), 'has allday');
        assert.isFalse(subject.event.isAllDay, 'model is allday');
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

    test('submit form', function(done) {

      subject.onfirstseen();
      subject.onafteronfirstseen = function() {
        subject.dispatch({ params: {} });
      };

      subject.ondispatch = function() {
        setFieldValue('calendarId', calendar._id);
        triggerEvent(subject.form, 'submit');
      };

      provider.createEvent = function() {
        done();
      };

    });

    test('delete button click', function(done) {
      subject.useModel(this.busytime, this.event, function() {
        triggerEvent(subject.deleteButton, 'click');
      });

      provider.deleteEvent = function() {
        done();
      };
    });
  });

});
