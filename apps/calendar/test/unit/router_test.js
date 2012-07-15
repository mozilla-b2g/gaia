requireApp('calendar/test/unit/helper.js', function() {
  requireLib('router.js');
});

suite('router', function() {

  var subject;
  var page = function() {
    page.routes.push(Array.prototype.slice.call(arguments));
  };

  page.routes = [];

  page.show = function(item) {
    this.shown = item;
  }

  page.start = function() {
    this.started = true;
  }

  page.stop = function() {
    this.started = false;
  }

  function View() {
    var self = this;

    this.called = 1;
    this.args = arguments;

    this.onactive = function() {
      self.active = true;
    };

    this.oninactive = function() {
      self.active = false;
    };
  }


  setup(function() {
    subject = new Calendar.Router(page);
    page.routes.length = 0;
  });

  test('initializer', function() {
    assert.equal(subject.page, page, 'should have page');
    assert.deepEqual(subject._activeObjects, [], 'should have active objects');
  });

  suite('#_wrapObject', function() {
    var view, calledNext, result;

    function callResult(arg) {
      result(arg, function() {
        calledNext = true;
      });
    }

    setup(function() {
      calledNext = false;
      view = new View();
      result = subject._wrapObject(view);
      callResult({});
    });

    test('creating function', function() {
      assert.deepEqual(subject._activeObjects, [
        view
      ]);

      assert.isTrue(view.active);
      assert.isTrue(view.__routerActive);
    });

  });

  suite('#modifer', function() {
    function uniq() {};

    test('with objects', function() {
      var calledWith;

      subject._wrapObject = function() {
        calledWith = arguments;
        return uniq;
      }

      var view = new View();

      subject.modifier('/foo', view);
      assert.deepEqual(calledWith, [view]);

      assert.equal(page.routes[0][0], '/foo');
      assert.equal(page.routes[0][1], uniq);
    });

    test('without objects', function() {
      subject.modifier('/foo', uniq);

      assert.equal(page.routes[0][0], '/foo');
      assert.equal(page.routes[0][1], uniq);
    });
  });


  suite('#state', function() {
    function uniq() {};

    function hasClear() {
      assert.equal(page.routes[0].length, 4);
      assert.equal(page.routes[0][1], subject._clearObjects);
      assert.equal(page.routes[0][3], subject._noop);
    }

    test('with objects', function() {
      var calledWith;

      subject._wrapObject = function() {
        calledWith = arguments;
        return uniq;
      }

      var view = new View();

      subject.state('/foo', view);
      hasClear();

      assert.equal(page.routes[0][0], '/foo');
      assert.equal(page.routes[0][2], uniq);

      assert.deepEqual(calledWith, [view]);
    });

    test('without objects', function() {
      subject.state('/foo', uniq);

      hasClear();
      assert.equal(page.routes[0][0], '/foo');
      assert.equal(page.routes[0][2], uniq);
    });
  });


  test('#_clearObjects', function() {
    var calledNext = false;

    var one = new View();
    var two = new View();

    two.active = one.active = true;
    one.__routerActive = two.__routerActive = true;

    subject._activeObjects.push(one);
    subject._activeObjects.push(two);

    subject._clearObjects({}, function() {
      calledNext = true;
    });

    assert.isTrue(calledNext);
    assert.isFalse(one.active);
    assert.isFalse(two.active);

    assert.isFalse(one.__routerActive);
    assert.isFalse(two.__routerActive);
  });

  var wrappedMethods = ['start', 'stop', 'show'];

  wrappedMethods.forEach(function(method) {
    test('#' + method, function() {
      //hard to test because we are going
      //to bind them to page to ensure the
      //correct scope.
      assert.ok(subject[method]);
    });
  });

});
