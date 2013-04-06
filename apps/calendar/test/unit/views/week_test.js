requireCommon('test/synthetic_gestures.js');
require('/shared/js/gesture_detector.js');
requireLib('timespan.js');

suiteGroup('Views.Week', function() {
  var subject;
  var app;
  var controller;
  var busytimes;
  var triggerEvent;
  var testEl;

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  teardown(function() {
    testEl.parentNode.removeChild(testEl);
  });

  setup(function() {
    testEl = document.createElement('div');
    testEl.id = 'test';
    testEl.innerHTML = [
      '<div id="week-view">',
      '</div>'
    ].join('');

    document.body.appendChild(testEl);

    app = testSupport.calendar.app();
    controller = app.timeController;
    controller.move(new Date());

    subject = new Calendar.Views.Week({
      app: app
    });
  });

  suite('Frame', function() {
    var id = 'foo';
    var children = [];
    var subject;

    // constructor shortcut
    function child(date) {
      var el = document.createElement('li');
      return new Calendar.Views.WeekChild({
        app: app,
        date: date,
        stickyFrame: el
      });
    }

    function countMethod(name) {
      var count = 0;
      children.forEach(function(item) {
        item[name] = function() {
          count++;
          item[name] = function() {};
        };
      });
      subject[name]();
      return count;
    }

    setup(function() {
      children.length = 0;
      children.push(child(new Date(2012, 0, 1)));
      children.push(child(new Date(2012, 0, 2)));
      children.push(child(new Date(2012, 0, 3)));

      var list = document.createElement('ul');
      subject = new Calendar.Views.Week.Frame(
        id,
        children,
        list
      );
    });

    test('initializer', function() {
      assert.ok(subject.element);
      assert.length(subject.element.children, 2);
    });

    test('.id', function() {
      assert.equal(subject.id, id);
    });

    test('.timespan', function() {
      var first = children[0].timespan;
      var last = children[children.length - 1].timespan;
      var expected = new Calendar.Timespan(
        first.start,
        last.end
      );

      assert.deepEqual(subject.timespan, expected);
    });

    test('.element', function() {
      assert.ok(subject.element);
      assert.equal(
        subject.element.tagName.toLowerCase(),
        'section'
      );
    });

    test('#activate', function() {
      var list = subject.element.classList;
      var activateCount = countMethod('activate');

      assert.equal(activateCount, 3);
      assert.ok(
        list.contains(Calendar.View.ACTIVE),
        'adds active class to frame'
      );
    });

    test('#destroy', function() {
      var elId = 'delete-me-please';

      subject.element.id = elId;
      testEl.appendChild(subject.element);
      assert.ok(subject.element.parentNode, 'has parent');

      var destroyCount = countMethod('destroy');

      assert.equal(destroyCount, 3);
      assert.ok(!subject.timespan);
      assert.ok(!document.getElementById(elId), 'removes from dom');
    });

    test('#deactivate', function() {
      var list = subject.element.classList;
      subject.activate();

      var count = countMethod('deactivate');
      assert.equal(count, 3);

      assert.ok(
        !list.contains(Calendar.View.ACTIVE),
        'removes active class'
      );
    });
  });

  test('#initialize', function() {
    assert.instanceOf(subject, Calendar.Views.Day);
  });

  test('#element', function() {
    assert.equal(
      subject.element.id,
      'week-view'
    );
  });

  suite('#weekDetails', function() {
    function checkDates(dates, expected) {
      dates.forEach(function(time) {
        test('resolve: ' + time, function() {
          var result = subject.weekDetails(time);
          assert.deepEqual(
            result,
            expected
          );
        });
      });
    }

    suite('start of week', function() {
      var expected = {
        start: new Date(2012, 0, 1),
        end: new Date(2012, 0, 4),
        length: 4
      };

      checkDates([
        new Date(2012, 0, 1),
        new Date(2012, 0, 2),
        new Date(2012, 0, 3),
        new Date(2012, 0, 4)
      ], expected);
    });

    suite('end of week', function() {
      var expected = {
        start: new Date(2012, 0, 5),
        end: new Date(2012, 0, 7),
        length: 3
      };

      checkDates([
        new Date(2012, 0, 5),
        new Date(2012, 0, 6),
        new Date(2012, 0, 7)
      ], expected);
    });
  });

  test('#changeDate', function() {
    var expected = new Date(2012, 0, 1);
    // initial sanity check
    subject.changeDate(expected);
    assert.deepEqual(subject.date, expected);

    // verify we enforce that all dates are normalized to a start/end of week.
    subject.changeDate(new Date(2012, 0, 4));
    assert.deepEqual(subject.date, expected);

    // sanity check the week end case
    subject.changeDate(new Date(2012, 0, 6));
    assert.deepEqual(subject.date, new Date(2012, 0, 5));
  });

  test('#_createFrame', function() {
    var date = new Date(2012, 0, 1);
    var frame = subject._createFrame(date);

    assert.equal(frame.id, date.valueOf());
    assert.instanceOf(frame, Calendar.Views.Week.Frame);
    assert.length(frame.children, 4, 'has children');

    for (var i = 1; i <= 4; i++) {
      assert.deepEqual(
        frame.children[i - 1].date,
        new Date(2012, 0, i),
        'child #' + i
      );
    }
  });

  test('#_nextTime', function() {
    var start = new Date(2012, 0, 1);
    subject.date = start;

    var actual = [];
    var order = [
      new Date(2012, 0, 5),
      new Date(2012, 0, 8),
      new Date(2012, 0, 12),
      new Date(2012, 0, 15)
    ];

    for (var i = 0; i <= 3; i++) {
      subject.date = subject._nextTime(subject.date);
      actual.push(subject.date);
    }

    assert.deepEqual(actual, order);
  });

  test('#_previousTime', function() {
    subject.date = new Date(2012, 0, 15);
    var actual = [];
    var order = [
      new Date(2012, 0, 12),
      new Date(2012, 0, 8),
      new Date(2012, 0, 5),
      new Date(2012, 0, 1)
    ];

    for (var i = 0; i <= 3; i++) {
      subject.date = subject._previousTime(subject.date);
      actual.push(subject.date);
    }

    assert.deepEqual(actual, order);
  });

  test('#frameContainer', function() {
    assert.ok(subject.frameContainer);
  });

  test('#onfirstseen', function() {
    assert.equal(subject.onfirstseen, subject.render);
  });

  suite('#render', function() {
    setup(function() {
      subject.render();
    });

    test('child placement', function() {
      var container = subject.frameContainer;
      assert.length(container.children, 3);
    });

    test('#_appendSidebarHours', function() {
      var html = subject.element.querySelector('.sidebar').outerHTML;
      assert.ok(html, 'has contents');

      var i = 0;
      for (; i < 24; i++) {
        assert.include(html, i, 'has hour #' + i);
        assert.include(
          html, Calendar.Calc.formatHour(i),
          'has display hour #' + i
        );
      }
    });
  });

});
