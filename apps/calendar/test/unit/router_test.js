requireApp('calendar/test/unit/helper.js', function() {
  requireSupport('fake_page.js');
  requireSupport('mock_view.js');
  requireLib('router.js');
});

suite('router', function() {

  var subject;
  var page;
  var View;

  suiteSetup(function() {
    View = Calendar.Test.MockView;
  });

  setup(function() {
    page = Calendar.Test.FakePage;
    subject = new Calendar.Router(page);
    page.routes.length = 0;
  });

  test('initializer', function() {
    assert.equal(subject.page, page, 'should have page');
    assert.deepEqual(subject._activeObjects, [], 'should have active objects');
  });

  suite('#mangeObject', function() {

    var object;

    setup(function() {
      object = {};
    });

    test('with onactive', function() {
      var calledWith;
      object.onactive = function() {
        calledWith = arguments;
        object.onactiveCalled = true;
      }
      subject.mangeObject(object, 'foo');
      assert.ok(object.onactiveCalled);
      assert.equal(subject._activeObjects[0], object);

      assert.equal(calledWith[0], 'foo');
    });

    test('without onactive', function() {
      subject.mangeObject(object);
      assert.ok(!subject.__routerActive);
      assert.equal(subject._activeObjects[0], object);
    });

  });

  test('#modifer', function() {
    function uniq() {};

    subject.modifier('/foo', uniq);
    assert.equal(page.routes[0][0], '/foo');
    assert.equal(page.routes[0][1], uniq);
  });


  suite('#state', function() {
    function uniq() {};

    function hasClear() {
      assert.equal(page.routes[0].length, 4);
      assert.equal(page.routes[0][1], subject._clearObjects);
      assert.equal(page.routes[0][3], subject._noop);
    }

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

    subject._activeObjects.push(one);
    subject._activeObjects.push(two);

    subject._clearObjects({}, function() {
      calledNext = true;
    });

    assert.isTrue(calledNext);
    assert.isFalse(one.active);
    assert.isFalse(two.active);
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
