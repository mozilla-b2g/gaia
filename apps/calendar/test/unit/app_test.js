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
    subject.view('Mock', function(first) {
      subject.view('Mock', function(second) {
        assert.instanceOf(first, Calendar.Views.Mock);
        assert.equal(first.app, subject);

        assert.equal(first, second);
      });
    });
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

  test('#modifier', function() {
    var uniq = function() {};
    subject.modifier('/foo', 'Mock');

    var route = page.routes[0];

    assert.equal(route.length, 5);
    assert.equal(route[0], '/foo');
    assert.equal(route[4], subject.router._lastState, 'should add lastState fn');
  });

  suite('#route', function() {

    test('singleRoute', function() {
      var mock = new Calendar.Views.Mock();

      subject.state('/single', 'Mock');

      var route = page.routes[0];

      assert.equal(route.length, 5);
      assert.equal(route[0], '/single');
      assert.instanceOf(route[1], Function, 'should add setPath');
      assert.instanceOf(route[2], Function, 'should add loadAllViews');
      assert.instanceOf(route[3], Function, 'should add handleView');
      assert.equal(route[4], subject.router._lastState, 'should add lastState fn');
    });

    test('twoRoutes', function() {
      var uniq = function() {};
      subject.state('/foo', ['Mock', 'Mock']);

      var route = page.routes[0];

      assert.equal(route.length, 5);
      assert.equal(route[0], '/foo');
      assert.instanceOf(route[1], Function, 'should add setPath');
      assert.instanceOf(route[2], Function, 'should add loadAllViews');
      assert.instanceOf(route[3], Function, 'should add handleView');
      assert.equal(route[4], subject.router._lastState, 'should add lastState fn');
    });
  });

});
