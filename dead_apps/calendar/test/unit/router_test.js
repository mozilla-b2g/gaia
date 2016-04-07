define(function(require) {
'use strict';

var FakePage = require('test/support/fake_page');
var MockView = require('test/support/mock_view');
var router = require('router');

suite('router', function() {
  var subject;
  var page;
  var View;

  suiteSetup(function() {
    View = MockView;
  });

  setup(function() {
    page = FakePage;
    subject = router;
    subject.page = FakePage;
    subject._activeObjects = [];
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
      };
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

  test('#clearObjects', function() {
    var one = new View();
    var two = new View();

    two.active = one.active = true;

    subject._activeObjects.push(one);
    subject._activeObjects.push(two);

    subject.clearObjects({});

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

});
