/* global MockStackManager, MockService,
          TaskManager, AppWindow,
          HomescreenWindow, MocksHelper, MockL10n */

'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_stack_manager.js');

require('/shared/js/event_safety.js');
require('/shared/js/sanitizer.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForTaskManager = new MocksHelper([
  'StackManager',
  'HomescreenWindow',
  'AppWindow',
  'Service',
]).init();

suite('system/TaskManager >', function() {

  suiteSetup(mocksForTaskManager.suiteSetup);
  setup(mocksForTaskManager.setup);

  // MockLazyLoader invokes promise callbacks in the wrong order, but changing
  // it causes many other tests to fail. So for now, use a dead-simple shim:
  window.LazyLoader = {
    load(files) {
      return Promise.resolve();
    }
  };

  suiteSetup((done) => {
    function overrideProperty(obj, propName, newConfig) {
      var previousDescriptor = Object.getOwnPropertyDescriptor(obj, propName);
      if (previousDescriptor) {
        suiteTeardown(() => {
          Object.defineProperty(obj, propName, previousDescriptor);
        });
      }
      newConfig.configurable = true;
      Object.defineProperty(obj, propName, newConfig);
    }

    overrideProperty(window, 'innerHeight', { value: 640 });
    overrideProperty(window, 'innerWidth', { value: 320 });
    overrideProperty(document, 'mozFullScreen',
      { writable: true, value: false });

    sinon.stub(AppWindow.prototype, 'getSiteIconUrl')
      .returns(Promise.resolve('data:image/png;base64,abc+'));

    document.body.innerHTML = `
    <div id="screen">
      <div id="cards-view" data-z-index-level="cards-view">
        <ul id="cards-list"></ul>
        <span id="cards-no-recent-windows" class="no-recent-apps"></span>
      </div>
    </div>
    `;

    navigator.mozL10n = MockL10n;

    requireApp('system/js/task_manager_utils.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/card.js');
    requireApp('system/js/task_manager.js', function() {

      TaskManager.prototype._TEST_currentIndex = 0;
      TaskManager.prototype.getCurrentIndex = function() {
        return this._TEST_currentIndex;
      };
      TaskManager.prototype.panToApp = function(app) {
        var index = this.stack.indexOf(app);
        if (index === -1) {
          index = this.stack.length - 1;
        }
        this._TEST_currentIndex = index;
        this.updateScrollPosition();
        return Promise.resolve();
      };

      done();
    });
  });

  var clock;

  setup(function() {
    clock = this.sinon.useFakeTimers();
  });

  suiteTeardown(mocksForTaskManager.suiteTeardown);
  teardown(mocksForTaskManager.teardown);

  test('Hierarchy', function(done) {
    var tm = new TaskManager();

    this.sinon.stub(MockService, 'request');
    tm.start().then(() => {
      assert.isTrue(
        MockService.request.calledWith('registerHierarchy', tm));
    }).then(() => {
      return tm.stop();
    }).then(() => {
      assert.isTrue(
        MockService.request.calledWith('unregisterHierarchy', tm));
    }).then(done, done);
    clock.tick(1000);
  });

  function spyEvent(obj, name) {
    var spy = sinon.stub();
    obj.addEventListener(name, spy);
    teardown(() => {
      obj.removeEventListener(name, spy);
    });
    return spy;
  }

  suite('With Empty Task Manager', function() {
    var tm;
    var isActivated;

    setup(function(done) {
      MockStackManager.mStack = [];
      MockService.mockQueryWith('getHomescreen', new HomescreenWindow('home'));
      MockService.mockQueryWith('fetchCurrentOrientation', 'portrait-primary');
      MockService.mockQueryWith('defaultOrientation', 'portrait-primary');

      isActivated = false;
      window.addEventListener('taskmanager-activated', () => {
        isActivated = true;
      });
      window.addEventListener('taskmanager-deactivated', () => {
        isActivated = false;
      });

      this.sinon.spy(document, 'mozCancelFullScreen');
      document.mozFullScreen = true; // Made overridable in suiteSetup

      tm = new TaskManager();
      tm.start().then(() => tm.show()).then(() => { done(); }, done);
      clock.tick(1000);
    });

    teardown(function(done) {
      tm.hide().then(() => tm.stop()).then(() => { done(); }, done);
      clock.tick(1000);
    });

    test('Proper state after show and hide', (done) => {
      assert.isTrue(tm.isShown());
      assert.isFalse(tm._isTransitioning);
      assert.isTrue(
        document.querySelector('#screen').classList.contains('cards-view'));
      assert.isTrue(isActivated);
      assert.ok(document.querySelector('#cards-view.empty.active'));
      // We're pretending to be in fullscreen mode.
      assert.isTrue(document.mozCancelFullScreen.calledOnce);

      var startHide = tm.hide();
      assert.isTrue(tm._isTransitioning);
      startHide.then(() => {
        assert.isFalse(tm._isTransitioning);
        assert.isFalse(tm.isShown());
        assert.isFalse(isActivated);
        assert.ok(document.querySelector('#screen:not(.cards-view)'));
        assert.equal(document.querySelectorAll('.card').length, 0);
        done();
      });
      clock.tick(1000);
    });

    test('Should not show if already showing', (done) => {
      var spyBeforeShow = spyEvent(window, 'cardviewbeforeshow');
      assert.isTrue(tm.isShown()); // (noting that we're already shown)
      tm.show().then(() => {
        assert.isFalse(spyBeforeShow.called);
        done();
      });
    });

    test('Should not respond to holdhome if already showing', () => {
      var showSpy = sinon.spy(tm, 'show');
      tm.respondToHierarchyEvent(new CustomEvent('holdhome'));
      assert.isFalse(showSpy.called);
    });

    test('home takes you home', () => {
      sinon.spy(tm, 'hide');
      tm.respondToHierarchyEvent(new CustomEvent('home'));
      assert.ok(tm.hide.calledOnce);
    });

    test('hit "home" while already closing, ignore event (bug 1203772)', () => {
      sinon.spy(tm, 'hide');
      tm.hide();
      // If we receive a "home" event while already going home, we should
      // ignore it. (i.e. in this implementation, _isTransitioning is true)
      var result = tm.respondToHierarchyEvent(new CustomEvent('home'));
      assert.equal(result, true);
      assert.ok(tm.hide.calledOnce);
    });

    test('click when empty takes you home', () => {
      sinon.spy(tm, 'hide');
      tm.handleEvent(new CustomEvent('click'));
      clock.tick(1000);
      assert.ok(tm.hide.calledOnce);
    });

    test('takes you home after closing all cards', (done) => {
      sinon.spy(tm, 'hide');
      tm.handleEvent(new CustomEvent('appterminated'));
      clock.tick(1000);
      assert.ok(tm.hide.calledOnce);
      done();
    });
  });


  suite('With Populated Task Manager', function() {
    var tm;
    var apps;
    var APP_CONFIGS = {};
    var APP_NAMES = [
      'sms', 'game', 'browser1', 'game2', 'browser2', 'search'
    ];
    APP_NAMES.forEach((name) => {
      APP_CONFIGS[name] = {
        launchTime: 5,
        name: name,
        origin: `http://${name}.gaiamobile.org`,
        frame: document.createElement('div'),
        manifest: {
          orientation: 'portrait-primary'
        },
        rotatingDegree: 0,
        requestScreenshotURL() { return null; },
        killable() { return true; },
        getScreenshot(cb) { cb(); },
        blur: function() {}
      };
    });

    setup(function(done) {
      MockStackManager.mStack = [];
      MockService.mockQueryWith('getHomescreen', new HomescreenWindow('home'));
      MockService.mockQueryWith('fetchCurrentOrientation', 'portrait-primary');
      MockService.mockQueryWith('defaultOrientation', 'portrait-primary');

      apps = {};
      var app;
      APP_NAMES.forEach((appName) => {
        app = apps[appName] = new AppWindow(APP_CONFIGS[appName]);
        MockStackManager.mStack.push(app);
      });
      apps.search.manifest.role = 'search';
      apps.browser1.isBrowser = () => true;
      apps.browser2.isBrowser = () => true;

      MockService.mockQueryWith('getTopMostWindow', apps.search);
      MockStackManager.mCurrent = MockStackManager.mStack.length - 1;

      tm = new TaskManager();
      tm.start().then(() => tm.show()).then(() => { done(); }, done);
      clock.tick(1000);
    });

    teardown(function(done) {
      tm.hide().then(() => tm.stop()).then(done, done);
      clock.tick(1000);
    });

    test('Proper state', (done) => {
      assert.isTrue(tm.isShown());
      assert.ok(document.querySelector('#cards-view.active:not(.empty)'));

      assert.equal(
        MockStackManager.getCurrent(),
        tm.currentCard.app);

      done();
    });

    test('Wheel handling for accessibility', (done) => {
      var card = tm.currentCard;
      var killAppStub = sinon.stub(card.app, 'kill');
      sinon.stub(card.app, 'killable', () => true);
      tm.handleEvent({
        type: 'wheel',
        deltaMode: 2,
        DOM_DELTA_PAGE: 2,
        deltaY: 1
      });
      assert.isTrue(killAppStub.called);

      done();
    });

    test('wheel left/right event', function() {
      this.sinon.spy(tm, 'updateScrollPosition');
      tm.handleEvent({
        type: 'wheel',
        deltaMode: 2,
        DOM_DELTA_PAGE: 2,
        deltaX: 1
      });
      assert.ok(tm.updateScrollPosition.calledOnce);
    });

    test('hide destroys each card properly', function(done) {
      var spies = [];
      tm.stack.forEach((app) => {
        spies.push(sinon.spy(app, 'leaveTaskManager'));
      });
      tm.hide().then(() => {
        spies.forEach((spy) => {
          assert.ok(spy.called);
        });
      }).then(done, done);
      clock.tick(1000);
    });

    test('close and reopen', function(done) {
      tm.hide().then(() => {
        MockStackManager.mCurrent = 0;
        var promise = tm.show();
        clock.tick(1000);
        return promise;
      }).then(() => {
        assert.equal(
          MockStackManager.getCurrent(),
          tm.currentCard.app);
      }).then(done, done);
      clock.tick(1000);
    });

    test('StackManager.outOfStack', function(done) {
      var outOfStackApp = apps[APP_NAMES[5]];
      sinon.spy(outOfStackApp, 'open');
      tm.hide().then(() => {
        MockStackManager.mOutOfStack = true;
        MockStackManager.mStack.length = 3;
        MockStackManager.mCurrent = 2;
        var promise = tm.show();
        clock.tick(1000);
        return promise;
      }).then(() => {
        // current card should be the last in the stack
        assert.equal(
          MockStackManager.getCurrent(),
          tm.currentCard.app);
        var promise = tm.hide(outOfStackApp);
        clock.tick(1000);
        return promise;
      }).then(() => {
        assert.ok(outOfStackApp.open.calledOnce);
        assert.ok(MockStackManager.position, -1);
      }).then(done, done);
      clock.tick(1000);
    });

    test('kill cards and update', function() {
      MockStackManager.mStack.length = 2;
      tm.handleEvent(new CustomEvent('appterminated'));
      clock.tick(1000);
      assert.equal(
        document.querySelectorAll('.card').length,
        MockStackManager.mStack.length
      );
    });

    // These events should trigger an exit:
    [
      'lockscreen-appopened',
      'attentionopened',
      'appopen'
    ].forEach((NAME) => {
      test(`${NAME} should trigger hide`, function() {
        this.sinon.spy(tm, 'hide');
        window.dispatchEvent(new CustomEvent(NAME));
        clock.tick(1000);
        assert.ok(tm.hide.called);
      });
    });

    test('opening from homescreen', function(done) {
      // NOTE: The promise chains activated here make using sinon's clock
      // unnecessarily difficult, because sinon's clock does not magically make
      // Promises synchronous. To compensate for  the increased intermittent
      // potential, we increase this test's timeout.
      clock.restore();
      this.timeout(20000);
      var openStub = sinon.stub(apps.game, 'open');
      tm.hide().then(() => {
        MockService.mockQueryWith(
          'AppWindowManager.getActiveWindow',
          MockService.query('getHomescreen', true));
        MockStackManager.mCurrent = -1;
        return tm.show();
      }).then(() => {
        return tm.hide(apps.game);
      }).then(() => {
        assert.ok(openStub.calledOnce);
      }).then(done, done);
    });

    test('browser-only filtering', function(done) {
      var allBrowserApps = [apps.browser1, apps.browser2, apps.search];
      clock.restore();
      this.timeout(20000);
      tm.hide().then(() => {
        return tm.show({ browserOnly: true });
      }).then(() => {
        assert.equal(tm.stack.length, allBrowserApps.length);
        tm.hide(apps.browser1);
        // cardviewclosed happens after tm.hide().
        return new Promise((resolve) => {
          window.addEventListener('cardviewclosed', (evt) => {
            resolve(evt.detail.newStackPosition);
          });
        });
      }).then((newStackPosition) => {
        assert.equal(
          newStackPosition,
          MockStackManager.mStack.indexOf(apps.browser1)
        );
      }).then(done, done);
    });

  });






});
