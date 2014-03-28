require('/shared/js/gesture_detector.js');
requireLib('timespan.js');

suiteGroup('Views.TimeParent', function() {

  var testEl;
  var viewDate = new Date(2012, 1, 15);
  var app;
  var subject;
  var id;
  var scrollTop;
  var controller;

  var TimeParent;

  function mapKeys(map) {
    return map.items.map(function(item) {
      return item[0];
    });
  }

  function viewActive(id) {
    var view = subject.frames.get(id);
    return view.active;
  }

  function ChildView(options) {
    this.date = options.date;
    this.app = options.app;
    this.id = this.date.valueOf();
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
    assert.instanceOf(subject.frames, Calendar.Utils.OrderedMap);

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
      var id = date.valueOf();
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

    test('creation and duplication', function() {
      // verify frame is there
      var id = date.valueOf();
      var originalFrame = subject.frames.get(id);
      assert.equal(result, originalFrame, 'returns frame');

      // verify we have it in the data
      assert.ok(
        originalFrame,
        'has initial frame'
      );

      // verify it exists in the dom
      var el = document.getElementById(id);
      assert.ok(el, 'has element');
      assert.equal(el, originalFrame.element, 'is same element');

      subject.addFrame(date);

      assert.equal(
        subject.frames.get(id),
        originalFrame,
        're-create existing frames'
      );
    });
  });

  suite('#changeDate', function() {
    var date = new Date(2012, 0, 1);

    setup(function() {
      subject.changeDate(date);
    });

    test('create intial frame', function() {
      // find ids so we can verify they exist.
      var curId = subject._getId(date);

      var nextId =
        subject._getId(subject._nextTime(date));

      var prevId =
        subject._getId(subject._previousTime(date));

      assert.equal(subject.date, date, 'sets current date');

      // verify current element is in working order.
      assert.ok(subject.currentFrame, 'has current frame');
      assert.equal(subject.currentFrame.id, curId, 'cur id');
      assert.ok(document.getElementById(curId), 'element in dom');
      assert.isTrue(subject.frames.get(curId).active, 'is active');

      var nextFrame = subject.frames.get(nextId);
      var prevFrame = subject.frames.get(prevId);

      assert.equal(prevFrame.id, prevId, 'frame sanity');

      assert.ok(!nextFrame.active, 'has next frame (should be inactive)');
      assert.ok(!prevFrame.active, 'has prev frame (should be inactive)');
    });

    test('sequentially activate second frame', function() {
      var curId = subject._getId(date);
      var curFrame = subject.frames.get(curId);

      var next = subject._nextTime(date);
      subject.changeDate(next);

      assert.ok(!curFrame.active, 'deactivated previously current');
      assert.ok(subject.frames.get(curId), 'previous id is still present');
      assert.length(subject.frames, 4);
    });

    test('max frame pruge', function() {
      var max = subject.maxFrames - 2;
      var i = 0;
      for (; i < max; i++) {
        subject.changeDate(
          subject._nextTime(subject.date)
        );
      }

      // current
      var cur = subject._getId(subject.date);
      cur = subject.frames.get(cur);

      // previous
      var prev =
        subject._getId(subject._previousTime(subject.date));

      prev = subject.frames.get(prev);

      // next
      var next =
        subject._getId(subject._nextTime(subject.date));

      next = subject.frames.get(next);

      // verify frames exist
      assert.length(subject.frames, 3, 'trims extra frames when over max');
      assert.ok(subject.frames.has(cur), 'cur');
      assert.ok(subject.frames.has(prev), 'prev');
      assert.ok(subject.frames.has(next), 'next');

      // verify other children where removed
      assert.length(subject.frameContainer.children, 3);
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
      subject.purgeFrames = function() {
        calledWith = arguments;
      };

      subject.app.timeController.emit('purge', span);
      assert.equal(calledWith[0], span);
    });
  });

  suite('#purgeFrames', function() {
    var purgeSpan;
    var items;

    function span(start, end) {
      return new Calendar.Timespan(
        new Date(2012, 1, start),
        new Date(2012, 1, end)
      );
    }

    setup(function() {
      purgeSpan = new Calendar.Timespan(
        new Date(2012, 1, 5),
        new Date(2012, 1, 10)
      );

      items = Object.create(null);

      function destroy() {
        this.destroyed = true;
      }

      items.before = {
        id: 1,
        timespan: span(2, 4)
      };

      items.overlap = {
        id: 2,
        timespan: span(3, 7)
      };

      items.same = {
        id: 3,
        timespan: purgeSpan,
        destroy: destroy
      };

      items.contains = {
        id: 4,
        timespan: span(7, 8),
        destroy: destroy
      };

      items.after = {
        id: 5,
        timespan: span(11, 24)
      };

      var key;
      for (key in items) {
        subject.frames.set(items[key].id, items[key]);
      }

      // set current frame to a frame
      // that will be deleted...
      subject.currentFrame = items.contains;

      subject.purgeFrames(purgeSpan);
    });

    test('after purge', function() {
      var frames = subject.frames;

      assert.ok(frames.get(items.before.id), 'before');
      assert.ok(frames.get(items.overlap.id), 'overlap');
      assert.ok(frames.get(items.after.id), 'after');

      assert.ok(!frames.get(items.same.id), 'removed same');
      assert.ok(!frames.get(items.contains.id), 'removed contains');

      assert.ok(
        !subject.currentFrame,
        'removes current frame when it is deleted'
      );

      assert.isTrue(items.same.destroyed);
      assert.isTrue(items.contains.destroyed);
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
