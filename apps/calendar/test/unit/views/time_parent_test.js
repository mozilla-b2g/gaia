require('/shared/js/gesture_detector.js');
requireLib('timespan.js');

suiteGroup('Views.TimeParent', function() {
  'use strict';

  var testEl;
  var app;
  var subject;
  var id;
  var controller;
  var TimeParent;

  function ChildView(options) {
    this.date = options.date;
    this.app = options.app;
    this.id = getDateId(this.date);
  }

  ChildView.prototype = {
    activate: function() {
      this.active = true;
    },

    deactivate: function() {
      this.active = false;
    },

    destroy: function() {
      this.destroyed = true;
      var el = this.element;
      el.parentNode.removeChild(el);
    },

    create: function() {
      var el = document.createElement('div');
      el.innerHTML = this.id;
      el.id = this.id;
      this.element = el;
      return el;
    },

    getScrollTop: function() {
      return this.scrollTop;
    },

    setScrollTop: function(scrollTop) {
      this.scrollTop = scrollTop;
    }
  };

  function getDateId(date) {
    return Calendar.Calc.getDayId(date);
  }

  suiteSetup(function() {
    TimeParent = Calendar.Views.TimeParent;
  });

  setup(function() {
    id = 0;
    app = testSupport.calendar.app();
    controller = app.timeController;
    testEl = document.createElement('div');
    testEl.id = 'test';

    document.body.appendChild(testEl);

    function Subclass() {
      TimeParent.apply(this, arguments);
    }

    Subclass.prototype = {
      __proto__: TimeParent.prototype,

      childClass: ChildView,

      get element() {
        return testEl;
      },

      _previousTime: function(date) {
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate() - 1
        );
      },

      _nextTime: function(date) {
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate() + 1
        );
      }

    };

    subject = new Subclass({ app: app });
    subject.app.timeController.on('dayChange', function(date) {
      subject._activateTime(date);
    });
  });

  teardown(function() {
    testEl.parentNode.removeChild(testEl);
  });

  test('initializer', function() {
    assert.instanceOf(subject, TimeParent);
    assert.instanceOf(subject, Calendar.View);

    assert.equal(subject.element.id, 'test');
  });

  suite('inheritance', function() {

    //verify our test child is sane
    test('#_nextTime', function() {
      var input = new Date(2012, 1, 1);
      var out = new Date(2012, 1, 2);
      assert.deepEqual(subject._nextTime(input), out);
    });

    test('#_previousTime', function() {
      var out = new Date(2012, 1, 1);
      var input = new Date(2012, 1, 2);
      assert.deepEqual(subject._previousTime(input), out);
    });

    test('#_createFrame', function() {
      var date = new Date();
      var id = getDateId(date);
      var out = subject._createFrame(date);

      assert.instanceOf(out, ChildView);
      assert.equal(out.id, id);
    });
  });

  suite('#addFrame', function() {
    var date = new Date(2012, 0, 1);
    var result;

    setup(function() {
      result = subject.addFrame(date);
    });

    test('create frame and add to DOM', function() {
      // verify frame is there
      var id = getDateId(date);
      var el = document.getElementById(id);
      assert.ok(el, 'has element');
      assert.equal(el, result.element, 'is same element');
    });
  });

  suite('#changeDate', function() {
    var date = new Date(2012, 0, 1);

    setup(function() {
      subject.changeDate(date);
    });

    test('create intial frame', function() {
      // find ids so we can verify they exist.
      var curId = getDateId(date);

      assert.equal(subject.date, date, 'sets current date');

      // verify current element is in working order.
      assert.ok(subject.currentFrame, 'has current frame');
      assert.equal(subject.currentFrame.id, curId, 'cur id');
      assert.ok(document.getElementById(curId), 'element in dom');
    });

    test('sequentially activate second frame', function() {
      var prevId = getDateId(date);
      var prevFrame = subject.currentFrame;
      var next = subject._nextTime(date);
      var nextId = getDateId(next);
      subject.changeDate(next);

      assert.ok(prevFrame.destroyed, 'previous frame was destroyed');
      assert.ok(subject.currentFrame.active, 'current frame is active');
      assert.notEqual(subject.currentFrame, prevFrame, 'changed frames');
      assert.ok(
        !document.getElementById(prevId),
        'previous element not in dom'
      );
      assert.ok(document.getElementById(nextId), 'element in dom');
    });

    test('the same scrollTop between day ane week views', function() {
      subject.currentFrame.setScrollTop(100);

      var next = subject._nextTime(date);
      subject.changeDate(next);
      var scrollTop = subject.currentFrame.getScrollTop();

      assert.equal(scrollTop, 100, 'same scrollTop');
    });
  });

  suite('#handleEvent', function() {
    test('event: purge', function() {
      var span = new Calendar.Timespan(new Date(), new Date());
      var calledWith;
      subject._purgeFrames = function() {
        calledWith = arguments;
      };

      subject.app.timeController.emit('purge', span);
      assert.equal(calledWith[0], span);
    });
  });

  suite('#purgeFrames', function() {
    var purgeSpan = new Calendar.Timespan(
      new Date(2012, 1, 5),
      new Date(2012, 1, 10)
    );

    function span(start, end) {
      return new Calendar.Timespan(
        new Date(2012, 1, start),
        new Date(2012, 1, end)
      );
    }

    function destroy() {
      /*jshint validthis:true */
      this.destroyed = true;
    }

    suite('not purged', function() {
      ([
        {
          id: 'before',
          timespan: span(2, 4)
        },
        {
          id: 'overlap',
          timespan: span(3, 7)
        },
        {
          id: 'after',
          timespan: span(11, 24)
        }
      ]).forEach(function(context) {

        test(context.id, function() {
          subject.currentFrame = context;
          subject._purgeFrames(purgeSpan);
          assert.equal(subject.currentFrame, context);
        });

      });
    });

    suite('should be purged', function() {
      ([
        {
          id: 'same',
          timespan: purgeSpan,
          destroy: destroy
        },
        {
          id: 'contains',
          timespan: span(7, 8),
          destroy: destroy
        }
      ]).forEach(function(context) {

        test(context.id, function() {
          subject.currentFrame = context;
          subject._purgeFrames(purgeSpan);
          assert.ok(!subject.currentFrame, 'remove pointer');
          assert.isTrue(context.destroyed, 'destroy frame');
        });

      });
    });

  });

  suite('#onactive', function() {

    test('without scale', function() {
      subject.scale = null;
      assert.ok(!controller.scale);
      subject.onactive();
      assert.ok(!controller.scale, 'should not set scale');
    });

    test('with scale', function() {
      subject.scale = 'random';

      assert.ok(!controller.scale);

      subject.onactive();

      assert.equal(
        controller.scale, 'random',
        'when'
      );
    });

  });

});
