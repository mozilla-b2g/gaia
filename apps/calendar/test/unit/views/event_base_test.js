suiteGroup('Views.EventBase', function() {

  var subject;
  var app;
  var triggerEvent;

  function hasClass(value) {
    return subject.element.classList.contains(value);
  }

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
    delete app._providers.Test;
  });

  setup(function(done) {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="event-test">',
        '<button class="primary">primary</button>',
        '<button class="cancel">cancel</button>',
      '</div>'
    ].join('');

    document.body.appendChild(div);
    app = testSupport.calendar.app();

    subject = new Calendar.Views.EventBase({
      app: app,
      selectors: {
        element: '#event-test',
        cancelButton: '#event-test .cancel',
        primaryButton: '#event-test .primary'
      }
    });

    app.db.open(done);
  });

  // setup this.account / this.calendar
  testSupport.calendar.accountEnvironment();

  // setup this.event / this.busytime
  testSupport.calendar.eventEnvironment();

  teardown(function(done) {
    testSupport.calendar.clearStore(
      app.db,
      ['accounts', 'calendars', 'events', 'busytimes'],
      function() {
        app.db.close();
        done();
      }
    );
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.instanceOf(subject, Calendar.Views.EventBase);

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

  test('.uiSelector', function() {
    assert.ok(subject.uiSelector);
  });

  suite('#useModel', function() {
    var callsUpdateUI;
    setup(function() {
      callsUpdateUI = false;
      subject._updateUI = function() {
        callsUpdateUI = true;
      };
    });

    test('multiple pending operations', function(done) {
      function throwsError() {
        done(new Error('incorrect callback fired...'));
      }

      subject.useModel(this.busytime, this.event, throwsError);
      subject.useModel(this.busytime, this.event, throwsError);
      subject.useModel(this.busytime, this.event, done);
    });

    test('readonly', function(done) {
      var provider = app.provider('Mock');

      provider.stageEventCapabilities(this.event._id, null, {
        canUpdate: false
      });

      subject.useModel(this.busytime, this.event, function() {
        done(function() {
          assert.isTrue(hasClass(subject.READONLY), 'is readonly');
          assert.isTrue(callsUpdateUI, 'updates ui');
        });
      });
    });

    test('normal', function(done) {
      var isDone = false;
      subject.useModel(this.busytime, this.event, function() {
        done(function() {
          assert.ok(isDone, 'not async');
          assert.ok(
            !subject.element.classList.contains(subject.LOADING),
            'is not loading'
          );

          assert.equal(
            subject.originalCalendar._id,
            this.event.calendarId
          );

          assert.isTrue(callsUpdateUI, 'updates ui');
          assert.isFalse(hasClass(subject.READONLY), 'is readonly');
        }.bind(this));
      }.bind(this));

      assert.ok(
        subject.element.classList.contains(subject.LOADING),
        'is loading'
      );
      isDone = true;
    });
  });

  suite('#dispatch', function() {
    var classList;

    setup(function() {
      classList = subject.element.classList;
    });

    suite('create', function() {
      var date = new Date();
      date.setDate(date.getDate() + 1);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);

      setup(function(done) {
        app.timeController.move(date);
        subject.dispatch({ params: {} });

        subject.ondispatch = done;
      });

      test('display', function() {
        // class details
        assert.isTrue(classList.contains(subject.CREATE), 'has create class');
        assert.isFalse(
          classList.contains(subject.UPDATE),
          'has update class'
        );

        // model
        assert.instanceOf(
          subject.event,
          Calendar.Models.Event
        );

        // expected model time
        var expectedStart = new Date(date.valueOf());
        var expectedEnd = new Date(expectedStart.valueOf());
        expectedEnd.setHours(expectedStart.getHours() + 1);

        assert.deepEqual(subject.event.startDate, expectedStart);
        assert.deepEqual(subject.event.endDate, expectedEnd);
      });

    });

    test('/add returnTo', function() {
      subject.app.router.last = {
        path: '/event/add/'
      };

      subject.dispatch({ params: {} });
      assert.equal(subject.returnTo(), subject.DEFAULT_VIEW);
    });

    test('/advanced-settings returnTo', function() {
      subject.app.router.last = {
        path: '/advanced-settings/'
      };

      subject.dispatch({ params: {} });
      assert.strictEqual(subject.returnTo(), subject.DEFAULT_VIEW);
    });

    test('/day returnTo', function() {
      subject.app.router.last = {
        path: '/day/'
      };

      subject.dispatch({ params: {} });
      assert.strictEqual(subject.returnTo(), '/day/');
    });

   suite('update', function() {
      var busytime;
      var event;

      setup(function(done) {
        subject.ondispatch = done;
        subject.dispatch({
          params: { id: this.busytime._id }
        });

        assert.ok(
          subject.element.classList.contains(subject.LOADING),
          'is loading'
        );
      });

      test('is done loading', function() {
        assert.ok(
          !subject.element.classList.contains(subject.LOADING)
        );
      });

      test('existing model', function() {
        assert.isFalse(classList.contains(subject.CREATE), 'has create class');
        assert.isTrue(classList.contains(subject.UPDATE), 'has update class');

        assert.deepEqual(
          subject.busytime,
          this.busytime,
          'has correct busytime'
        );

        assert.deepEqual(
          this.event,
          subject.event.data,
          'has correct event'
        );
      });
    });
  });

  test('#returnTop', function(done) {
    assert.ok(subject.returnTop);

    subject._returnTo = '/foo';
    subject._updateUI = function() {
      assert.equal(subject._returnTo, '/foo');
      assert.equal(subject._returnTop, '/foo');
    };

    subject.dispatch({params: {}});

    subject._returnTo = '/bar';
    subject._updateUI = function() {
      assert.equal(subject._returnTo, '/bar');
      assert.equal(subject._returnTop, '/foo');
    };
    subject.dispatch({params: {}});

    var fetchReturnTop = subject.returnTop();
    subject._returnTo = '/bar';
    subject._updateUI = function() {
      assert.equal(subject._returnTo, '/bar');
      assert.equal(subject._returnTop, '/bar');
      done();
    };
    subject.dispatch({params: {}});
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

});
