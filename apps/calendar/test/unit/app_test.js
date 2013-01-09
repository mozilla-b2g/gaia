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
  var Pending;

  suiteSetup(function() {
    Calendar.ns('Views').Mock = Calendar.Test.MockView;
    Pending = function(pending=false) {
      this.pending = pending;

      Calendar.Responder.call(this);
    };

    Pending.prototype = {
      __proto__: Calendar.Responder.prototype,

      startEvent: 'start',
      completeEvent: 'complete'
    };
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

  suite('PendingManager', function() {
    var subject;

    setup(function() {
      subject = new Calendar.App.PendingManager();
    });

    suite('life-cycle', function() {
      test('without pending', function() {
        var one = new Pending();
        subject.register(one);
        assert.isFalse(subject.isPending());
      });

      test('with pending', function() {
        var two = new Pending(true);
        subject.register(two);
        assert.isTrue(subject.isPending());
      });

      test('add with pending then remove', function() {
        var two = new Pending(true);
        subject.register(two);
        subject.unregister(two);
        assert.isFalse(subject.isPending());
      });
    });

    suite('event life-cycle', function() {
      var one;
      var two;

      setup(function() {
        one = new Pending();
        two = new Pending();
      });

      test('register while pending', function() {
        one.pending = true;
        subject.register(one);
        assert.equal(subject.pending, 1);
      });

      test('register while not pending', function() {
        subject.register(one);
        assert.equal(subject.pending, 0);
      });

      test('emit start', function() {
        subject.register(one);
        one.emit('start');
        assert.equal(subject.pending, 1);
      });

      test('emit complete', function() {
        one.pending = true;
        subject.register(one);
        one.emit('complete');

        assert.equal(subject.pending, 0);
      });

      test('wait for onpending', function(done) {

        subject.onpending = function() {
          subject.oncomplete = function() {
            done();
          };
          one.emit('complete');
        };

        one.pending = true;
        subject.register(one);
      });

      test('multiple events', function(done) {
        subject.register(one);
        subject.register(two);

        subject.onpending = function() {
          subject.oncomplete = function() {
            done();
          };

          Calendar.nextTick(function() {
            one.emit('complete');
            two.emit('complete');
          });
        };

        one.emit('start');
        two.emit('start');
      });

    });
  });

  test('initialization', function() {
    assert.ok(subject.startingURL, 'has startingURL');
  });

  suite('global events', function() {
    var calledWith;
    var realRestart;
    var realTimeout;

    setup(function() {
      calledWith = 0;
      realTimeout = subject._mozTimeRefreshTimeout;
      realRestart = Calendar.App.forceRestart;

      subject._mozTimeRefreshTimeout = 1;
      subject.forceRestart = function() {
        calledWith++;
      };
    });

    teardown(function() {
      subject.forceRestart = realRestart;
      subject._mozTimeRefreshTimeout = realTimeout;
    });

    test('moztimechange', function(done) {
      // dispatch multiple times to ensure it only fires callback
      // once...
      window.dispatchEvent(new Event('moztimechange'));
      window.dispatchEvent(new Event('moztimechange'));

      setTimeout(function() {
        window.dispatchEvent(new Event('moztimechange'));
      }, 0);

      setTimeout(function() {
        done(function() {
          assert.equal(calledWith, 1);
        });
      }, 100);
    });
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

  test('pending objects', function() {
    var object = new Pending(true);

    subject.observePendingObject(object);

    assert.ok(
      document.body.classList.contains(
        subject.pendingClass
      ),
      'adds pending class'
    );

    object.emit('complete');

    assert.ok(
      !document.body.classList.contains(
        subject.pendingClass
      ),
      'removes pendign class'
    );
  });

  suite('#forceRestart', function() {
    var realLocation = window.location;

    suiteSetup(function() {
      assert.equal(subject._location, window.location);
      subject._location = {};
    });

    suiteTeardown(function() {
      subject._location = realLocation;
    });

    test('redirect to manifest url', function() {
      subject.forceRestart();

      assert.equal(
        subject._location.href,
        subject.startingURL,
        'redirects to manifest entrypoint'
      );
    });

    test('with pending restart', function() {
      // begin the restart
      subject.forceRestart();
      var url = subject.startingURL = '/xxx';

      // try again while restarting
      subject.forceRestart();

      // should fail
      assert.notEqual(subject._location.href, url);

      assert.isTrue(subject.restartPending);
      subject.restartPending = false;

      // works after pending is done
      subject.forceRestart();
      assert.equal(subject._location.href, url);
    });
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
