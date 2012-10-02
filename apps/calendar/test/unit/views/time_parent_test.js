requireApp('calendar/test/unit/helper.js', function() {
  require('/shared/js/gesture_detector.js');
  requireLib('timespan.js');
  requireLib('ordered_map.js');
  requireLib('views/time_parent.js');
});

suite('views/time_parent', function() {

  var testEl;
  var viewDate = new Date(2012, 1, 15);
  var app;
  var subject;
  var id;
  var controller;

  var TimeParent;

  function expectFrameOffset(expected) {
    expected.forEach(function(item, idx) {
      var frame = subject._activeChildren.items[idx];
      var el = frame[1].element;
      assert.ok(el.style.transform);
      assert.include(
        el.style.transform, item,
        'should move frame:' + id + ' by: ' + item
      );
    });
  }

  function relativeId(day) {
    var day = viewDate.getDate() + day;

    var date = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      day
    );

    return subject._getId(date);
  }

  function mapKeys(map) {
    return map.items.map(function(item) {
      return item[0];
    });
  }

  function viewActive(id) {
    var view = subject.children.get(id);
    return view.active;
  }

  function ChildView(date) {
    this.date = date;
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
    },

    create: function() {
      var el = document.createElement('div');
      el.innerHTML = this.id;
      el.id = this.id;
      this.element = el;
      return el;
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

      // easier for testing we have
      // a separate test which does purge...
      maxChildren: 20,

      get element() {
        return testEl;
      },

      _getId: function(input) {
        return input.valueOf();
      },

      _createChild: function(time) {
        return new ChildView(time);
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
    assert.instanceOf(subject.children, Calendar.OrderedMap);
    assert.instanceOf(subject._activeChildren, Calendar.OrderedMap);

    assert.equal(subject.element.id, 'test');
  });

  suite('inheritance', function() {
    //verify our test child is sane

    test('#_getId', function() {
      var date = new Date();
      var id = subject._getId(date);
      assert.equal(id, date.valueOf());
    });

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

    test('#_createChild', function() {
      var date = new Date();
      var id = subject._getId(date);
      var out = subject._createChild(date);

      assert.instanceOf(out, ChildView);
      assert.equal(out.id, id);
    });
  });

  suite('#handleEvent', function() {

    //XXX Move to helpers?
    function trigger(type, opts) {
      if (typeof(opts) === 'undefined') {
        opts = {};
      }

      var event = document.createEvent('MouseEvents');
      event.initMouseEvent(
        type,
        true,
        true,
        window,
        opts.detail || {},
        opts.screenX || 0,
        opts.screenY || 0,
        opts.clientX || 0,
        opts.clientY || 0,
        false,
        false,
        false,
        false,
        0,
        null
      );

      subject.element.dispatchEvent(event);
    }

    suite('pan', function() {
      var calledPan;
      var calledSwipe;

      setup(function() {
        calledSwipe = null;
        calledPan = null;

        subject._onswipe = function() {
          calledSwipe = arguments;
        }

        subject._pan = function() {
          calledPan = arguments;
        }

        subject._activateTime(viewDate);
      });

      test('barely move', function() {
        trigger('mousedown', { screenX: 20 });
        trigger('mousemove', { screenX: 21 });

        assert.ok(!subject._isPanning, 'should not pan for minor moves');
      });

      test('start & stop pan', function(done) {
        var start = 50;
        var threshold = subject.panThreshold + 1;

        trigger('mousedown', { screenX: start });

        assert.equal(
          subject._startEvent.screenX, start,
          'has start event'
        );

        trigger('mousemove', {
          screenX: start + threshold
        });

        var moveAmount = (start + threshold) - start;

        assert.equal(
          calledPan[0], moveAmount, 'should call pan'
        );

        assert.isTrue(subject._isPanning);

        // release pan
        trigger('mouseup');
        assert.isFalse(subject._isPanning);
        assert.ok(!subject._startEvent);

        subject.handleEvent = function() {
          done(new Error('should not handle move after done panning'));
        }

        // trigger may fire in next tick apparently?
        // so we verify here that a mouse move will not
        // be fired...
        setTimeout(function() {
          done();
        }, 50);

        trigger('mousemove', { screenX: 250 });
      });

    });

    test('event: purge', function() {
      var span = new Calendar.Timespan(new Date(), new Date());
      var calledWith;
      subject.purgeChildren = function() {
        calledWith = arguments;
      }

      subject.app.timeController.emit('purge', span);
      assert.equal(calledWith[0], span);
    });
  });

  test('#recalculateWidth', function() {
    subject.viewportSize = 200;
    subject.visibleChildren = 2;
    subject.recalculateWidth();

    assert.equal(subject._childWidth, 100, 'width');

    assert.equal(
      subject._childThreshold,
      subject._childWidth / subject.childThreshold,
      'threshold'
    );
  });

  suite('#purgeChildren', function() {
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
        subject.children.set(items[key].id, items[key]);
      }

      subject.purgeChildren(purgeSpan);
    });

    test('after purge', function() {
      var children = subject.children;

      assert.ok(children.get(items.before.id), 'before');
      assert.ok(children.get(items.overlap.id), 'overlap');
      assert.ok(children.get(items.after.id), 'after');

      assert.ok(!children.get(items.same.id), 'removed same');
      assert.ok(!children.get(items.contains.id), 'removed contains');

      assert.isTrue(items.same.destroyed);
      assert.isTrue(items.contains.destroyed);
    });
  });

  suite('#deactivateChildren', function() {
    var past;
    var current;
    var future;

    setup(function() {
      past = subject._createChild(
        new Date(2012, 1, 1)
      );

      current = subject._createChild(
        new Date(2012, 1, 2)
      );

      future = subject._createChild(
        new Date(2012, 1, 3)
      );

      subject._addChild(past);
      subject._addChild(current);
      subject._addChild(future);

      subject.currentChild = current;

      subject.activateChild(past);
      subject.activateChild(current);
      subject.activateChild(future);
    });

    test('when number of items is over max', function() {
      subject.maxChildren = 1;
      subject.deactivateChildren();

      assert.length(subject.children, 1);
      assert.length(subject._activeChildren, 1);

      assert.deepEqual(
        mapKeys(subject._activeChildren),
        [current.id]
      );

      assert.deepEqual(
        mapKeys(subject.children),
        [current.id]
      );

    });

    test('hidding', function() {
      subject.deactivateChildren();

      assert.isFalse(past.active, 'hide past');
      assert.isTrue(current.active, 'show active');
      assert.isFalse(future.active, 'hide future');

      assert.deepEqual(
        mapKeys(subject._activeChildren),
        [current.id]
      );
    });
  });

  test('#activeChild', function() {
    var child = subject._createChild(new Date());

    subject.activateChild(child);
    assert.isTrue(child.active);

    assert.length(subject._activeChildren, 1);
    assert.equal(
      subject._activeChildren.get(child.id),
      child
    );

    subject.activateChild(child);
    assert.length(subject._activeChildren, 1);
  });

  test('#_addChild', function() {
    var child = subject._createChild(
      new Date()
    );

    subject._addChild(child);

    assert.ok(subject.children.has(child.id));
    assert.equal(subject.children.get(child.id), child);
  });

  suite('#_padChildren', function() {
    var children;

    setup(function() {
      subject.currentChild = subject._createChild(
        viewDate
      );
      subject._addChild(subject.currentChild);
      subject.element.appendChild(
        subject.currentChild.create()
      );

      children = subject.element.children;

      var html = subject.element.outerHTML;

      assert.ok(html);
      assert.include(html, relativeId(0));
    });

    ['future', 'past'].forEach(function(type) {
      var mod = 1;
      if (type == 'past') {
        mod = -1;
      }

      suite(type, function() {
        test('reuse', function() {
          subject._padChildren(type, 2, viewDate);
          subject._padChildren(type, 3, viewDate);

          assert.length(subject.children, 4);
          assert.length(children, 4);
        });

        test('single', function() {
          subject._padChildren(type, 1, viewDate);
          assert.equal(subject.children.length, 2);
          var html = subject.element.outerHTML;
          var id = relativeId(1 * mod);

          assert.ok(!viewActive(id));
          assert.include(html, id);
        });

        test('multiple', function() {
          subject._padChildren(type, 2, viewDate);

          assert.equal(subject.children.length, 3);
          assert.equal(children.length, 3);

          var html = subject.element.outerHTML;

          assert.include(html, relativeId(1 * mod));
          assert.include(html, relativeId(2 * mod));
        });
      });

    });

  });

  suite('#move(Next|Previous)', function() {
    var calledWith;
    var current = new Date(2012, 1, 5);

    setup(function() {
      calledWith = null;
      app.timeController.move = function() {
        calledWith = arguments;
      }
      subject.currentChild = subject._createChild(
        current
      );
    });

    test('previous', function() {
      subject.movePrevious();
      assert.deepEqual(calledWith[0], new Date(
        2012, 1, 4
      ));
      assert.isTrue(subject._internalMove);
    });

    test('next', function() {
      subject.moveNext();
      assert.deepEqual(calledWith[0], new Date(
        2012, 1, 6
      ));
      assert.isTrue(subject._internalMove);
    });
  });

  suite('panning operations', function() {
    setup(function() {
      subject.visibleChildren = 2;
      subject.viewportSize = 400;
      subject._childWidth = 200;
      subject.paddingBefore = 4;
      subject.paddingAfter = 4;

      subject._activateTime(viewDate);
      subject._startPanning();
      assert.length(subject.children, 9);
    });

    suite('#_moveFrames', function() {

      test('while panning', function() {
        // going into the future...
        subject._childWidth = 200;
        subject._moveFrames(-15);


        // four frames.
        // each frame is 200px wide
        var expected = [
          -215,
          -15,
          185,
          385
        ];

        assert.length(subject._activeChildren, 4);
        expectFrameOffset(expected);
      });

      test('while not panning', function() {
        // remove extra padding
        subject._activeChildren.items.shift();
        subject._activeChildren.items.pop();

        subject._childWidth = 200;
        subject._moveFrames(0);

        var expected = [
          0,
          200
        ];

        expectFrameOffset(expected);
      });

    });

    test('#_moveFrames', function() {

    });

    test('#_unshiftFrame', function() {
      var frame = subject._activeChildren.items;
      var first = frame[0];

      assert.equal(
        first[0],
        subject._getId(new Date(2012, 1, 14))
      );

      var last = frame[frame.length - 1];

      assert.equal(
        last[0],
        subject._getId(new Date(2012, 1, 17))
      );

      subject._unshiftFrame();

      assert.equal(
        subject._frameMoveOffset,
        subject._childWidth
      );

      // don't deactivate it until we have
      // added two items to the other side
      assert.isTrue(
        last[1].active,
        'should not deactvate past frame yet'
      );

      assert.length(frame, 5);

      var first = frame[0];
      assert.equal(
        first[0],
        subject._getId(new Date(2012, 1, 13))
      );

      subject._unshiftFrame();

      assert.equal(
        subject._frameMoveOffset,
        subject._childWidth * 2
      );

      // now that frame two beyond this point
      // we can remove it from frames...
      assert.isFalse(last[1].active, 'should deactivate frame');

      assert.length(frame, 5);

      var last = frame[frame.length - 1];

      assert.equal(
        last[0],
        subject._getId(new Date(2012, 1, 16))
      );

      var active = [
        relativeId(-3),
        relativeId(-2),
        relativeId(-1),
        relativeId(0),
        relativeId(1)
      ];

      assert.deepEqual(
        mapKeys(subject._activeChildren),
        active
      );
    });

    test('#_pushFrame', function() {
      var frame = subject._activeChildren.items;
      var first = frame[0];

      assert.equal(
        first[0],
        subject._getId(new Date(2012, 1, 14))
      );

      var last = frame[frame.length - 1];

      assert.equal(
        last[0],
        subject._getId(new Date(2012, 1, 17))
      );

      subject._pushFrame();

      // don't deactivate it until we have
      // added two items to the other side
      assert.isTrue(
        first[1].active,
        'should not deactvate past frame yet'
      );

      assert.length(frame, 5);

      var last = frame[frame.length - 1];
      assert.equal(
        last[0],
        subject._getId(new Date(2012, 1, 18))
      );

      subject._pushFrame();

      // now that frame two beyond this point
      // we can remove it from frames...
      assert.isFalse(first[1].active, 'should deactivate frame');

      // now that frame is removed we need to update
      // the _frameMoveOffset
      assert.equal(subject._frameMoveOffset, (subject._childWidth * -1));

      assert.length(frame, 5);

      var first = frame[0];

      assert.equal(
        first[0],
        subject._getId(new Date(2012, 1, 15))
      );

      var active = [
        relativeId(0), // 15
        relativeId(1), // 16
        relativeId(2), // 17 - current
        relativeId(3), // 18
        relativeId(4)  // 19
      ];

      assert.deepEqual(
        mapKeys(subject._activeChildren),
        active
      );
    });

  });

  test('#_startPanning', function() {
    subject._activateTime(new Date(2012, 1, 15));
    assert.length(subject._activeChildren, 1);

    subject._startPanning();

    assert.isTrue(subject._isPanning);

    var expected = [
      subject._getId(new Date(2012, 1, 14)),
      subject._getId(new Date(2012, 1, 15)),
      subject._getId(new Date(2012, 1, 16))
    ];

    var actual = mapKeys(subject._activeChildren);

    assert.deepEqual(
      actual, expected,
      'when panning starts activate extra views'
    );
  });

  test('#_stopPanning', function() {
    var calledWith;
    subject._activateTime(new Date());
    subject._isPanning = true;

    subject.deactivateChildren = function() {
      calledWith = true;
    }

    subject._panOffset = 2;
    subject._frameMoveOffset = 2;
    subject._frame = [];

    subject._stopPanning();

    assert.equal(subject._panOffset, 0);
    assert.equal(subject._frameMoveOffset, 0);
    assert.ok(!subject._isPanning);

    assert.isTrue(calledWith, 'clears children');
  });

  suite('#onpan', function() {
    return;

    function pan(pos) {
      subject._pan(pos);
    }

    setup(function() {
      // start
      subject._activateTime(new Date(2012, 1, 15));
      subject.viewportSize = 400;

      // pan back
      pan(-15);
    });

    // Note that positive numbers indicate going
    // into the past...
    test('initial pan', function() {
      assert.ok(subject._frame);

      // width
      assert.equal(subject._childWidth, 400);

      // threshold
      var expected = 400 / subject.childThreshold;
      assert.equal(subject._childThreshold, expected);

      expectFrameOffset([
        -415,
        -15,
        385
      ]);

      assert.length(subject._frame, 3);
    });

    test('move into the future', function() {
      var amount = (subject._childThreshold * -1) + -1;
      var width = subject._childWidth;
      pan(amount);

      expectFrameOffset([
        amount + (width * -1),
        amount,
        amount + width,
        amount + (2 * width)
      ]);

      // should move children...
      var nextDate = new Date(2012, 1, 16);
      assert.deepEqual(
        subject.currentChild.date, nextDate
      );

      // should increase frame size
      assert.length(subject._frame, 4);

      // sensitively check we don't want
      // to move to next frame until we are past
      // the current one completely
      pan((amount * 2) + -1);


      assert.deepEqual(
        subject.currentChild.date, nextDate
      );

      // now that we are over + threshold we
      // move again
      pan(-400 + amount);

      var nextAmount = -400 + amount;

      expectFrameOffset([
        amount + (width * -1),
        amount,
        amount + width,
        amount + (2 * width)
      ]);

      nextDate = new Date(2012, 1, 17);
      assert.deepEqual(
        subject.currentChild.date,
        nextDate
      );

      assert.length(subject._frame, 4);

      subject._onswipe();
    });

  });

  suite('#_activateTime', function() {
    var current = new Date(2012, 1, 1);
    var elChildren;
    var itemChildren;
    var calledDeactivate;

    setup(function() {
      calledDeactivate = false;
      elChildren = subject.element.children;
      itemChildren = subject.children;

      subject.deactivateChildren = function() {
        calledDeactivate = true;
      }
    });

    test('non-internal move', function() {
      subject._internalMove = false;
      subject._activateTime(current);
      assert.ok(calledDeactivate, 'should call deactivate');
    });

    test('internal move', function() {
      subject._internalMove = true;

      subject._activateTime(current);
      assert.ok(!calledDeactivate, 'should not call deactivate');
      assert.isFalse(subject._internalMove);
    });

    test('initial activate - 3 main', function() {
      subject.visibleChildren = 3;
      subject.paddingAfter = 3;
      subject.paddingBefore = 3;

      subject._activateTime(current);

      assert.length(elChildren, 7);
      assert.length(itemChildren, 7);

      var active = [
        subject._getId(new Date(2012, 1, 1)),
        subject._getId(new Date(2012, 1, 2)),
        subject._getId(new Date(2012, 1, 3))
      ];

      assert.deepEqual(
        mapKeys(subject._activeChildren),
        active
      );
    });

    test('initial activate - one main', function() {
      subject._activateTime(current);

      assert.length(elChildren, 3);
      assert.length(itemChildren, 3);

      assert.deepEqual(
        mapKeys(subject._activeChildren),
        [subject._getId(current)]
      );
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

  suite('multiple children', function() {
    var start = new Date(2012, 0, 1);

    setup(function() {
      subject.paddingBefore = 1;
      subject.visibleChildren = 4;
      subject.paddingAfter = 5;
    });

    test('initial render', function() {
      subject._activateTime(start);
    });
  });

});
