requireApp('calendar/test/unit/helper.js', function() {
  requireSupport('fake_page.js');
  requireSupport('mock_view.js');

  requireLib('provider/abstract.js');
  requireLib('worker/manager.js');
  requireLib('controllers/service.js');
  requireLib('router.js');
  requireLib('app.js');
});

suite('app', function() {

  // don't need a real db for this;
  var subject;
  var router;
  var page;

  suiteSetup(function() {
    Calendar.ns('Views').Mock = Calendar.Test.MockView;
  });

  suiteTeardown(function() {
    delete Calendar.ns('Views').Mock;
  });

  setup(function() {
    page = Calendar.Test.FakePage;
    page.routes.length = 0;

    subject = testSupport.calendar.app();
    router = subject.router;
  });

  test('#configure', function() {
    assert.deepEqual(subject._routeViewFn, {});

    assert.instanceOf(
      subject.syncController,
      Calendar.Controllers.Sync
    );

    assert.instanceOf(
      subject.serviceController,
      Calendar.Controllers.Service
    );

    assert.instanceOf(
      subject.timeController,
      Calendar.Controllers.Time
    );

    assert.instanceOf(subject.db, Calendar.Db);
    assert.instanceOf(subject.router, Calendar.Router);
  });

  suite('#go', function() {
    var calledWith;

    test('result', function() {
      subject.router.show = function(url) {
        calledWith = url;
      };

      subject.go('/settings');
      assert.equal(calledWith, '/settings');
    });

  });

  test('#view', function() {
    var first = subject.view('Mock');
    var second = subject.view('Mock');

    assert.instanceOf(first, Calendar.Views.Mock);
    assert.equal(first.app, subject);

    assert.equal(first, second);
  });

  test('#provider', function() {
    var result = subject.provider('Abstract');
    assert.instanceOf(result, Calendar.Provider.Abstract);
    assert.equal(result.app, subject);
  });

  test('#store', function() {
    assert.instanceOf(
      subject.store('Account'),
      Calendar.Store.Account
    );
  });

  test('#_wrapViewObject', function() {
    var result = subject._wrapViewObject('Mock');
    var view;

    assert.equal(subject._routeViewFn.Mock, result);

    assert.ok(
      !subject._views['Mock'],
      'view should not be created by referencing it'
    );
    var nextCalled = false;

    function next() {
      nextCalled = true;
    }

    result({}, next);

    view = subject._views['Mock'];
    assert.ok(view, 'view should be created');
    assert.ok(nextCalled);
    assert.ok(view.active);

    var second = subject._wrapViewObject('Mock');
    assert.equal(result, second);
  });

  test('#modifier', function() {
    var uniq = function() {};
    subject.modifier('/foo', 'Mock');

    var cb = subject._routeViewFn['Mock'];
    assert.ok(cb);

    var route = page.routes[0];
    assert.equal(route[0], '/foo');
    assert.equal(route[1], cb, 'should set mock view');
  });

  suite('#route', function() {

    test('object', function(done) {
      var mock = new Calendar.Views.Mock();

      subject.state('/obj', mock);

      var route = page.routes[0];
      var cb = route[2];
      var ctx = {
        params: { hit: true}
      };

      cb(ctx, function() {
        done(function() {
          assert.equal(mock.activeWith[0], ctx);
        });
      });
    });

    test('normal', function() {
      var uniq = function() {};
      subject.state('/foo', 'Mock', 'Mock', uniq);

      var cb = subject._routeViewFn['Mock'];
      assert.ok(cb);

      var route = page.routes[0];
      assert.equal(route[0], '/foo');
      assert.equal(route[2], cb, 'should set mock view');
      assert.equal(route[3], cb, 'should set second mock view');
      assert.equal(route[4], uniq, 'should add normal fn');
    });
  });

});
