/* global MockStackManager, MockService, TaskManagerUtils,
          TaskManager, AppWindow, WheelEvent, MockAppWindow,
          HomescreenWindow, MockSettingsListener, MocksHelper, MockL10n */

'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_stack_manager.js');

require('/shared/js/event_safety.js');
require('/shared/js/sanitizer.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForTaskManager = new MocksHelper([
  'StackManager',
  'HomescreenWindow',
  'AppWindow',
  'Service',
  'SettingsListener'
]).init();


var TICK_SHOW_HIDE_MS = 2000;

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
      <div id="task-manager" data-z-index-level="cards-view">
        <div id="cards-view">
          <ul id="cards-list"></ul>
          <span id="cards-no-recent-windows" class="no-recent-apps"
                data-l10n-id="no-recent-app-windows"></span>
        </div>
        <div id="task-manager-buttons">
          <button id="task-manager-new-private-sheet-button"></button>
          <button id="task-manager-new-sheet-button"></button>
        </div>
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
    clock.tick(TICK_SHOW_HIDE_MS);
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
    var homescreenApp;

    setup(function(done) {
      MockStackManager.mStack = [];
      homescreenApp = new HomescreenWindow('home');
      MockService.mockQueryWith('getHomescreen', homescreenApp);
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
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    teardown(function(done) {
      tm.hide().then(() => tm.stop()).then(() => { done(); }, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('Proper state after show and hide', (done) => {
      assert.isTrue(tm.isShown());
      assert.isFalse(tm._isTransitioning);
      assert.isTrue(
        document.querySelector('#screen').classList.contains('cards-view'));
      assert.isTrue(isActivated);
      assert.ok(document.querySelector('#task-manager.empty.active'));
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
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('Should emit "cardviewclosed" after hiding', (done) => {
      var spyCardViewClosed = spyEvent(window, 'cardviewclosed');
      tm.hide().then(() => {
        assert.isTrue(spyCardViewClosed.called);
      }).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('Should only emit "cardviewclosed" after !isActive', (done) => {
      var wasActive;
      function onclosed() {
        window.removeEventListener('cardviewclosed', onclosed);
        wasActive = tm.isActive();
      }
      window.addEventListener('cardviewclosed', onclosed);

      tm.hide().then(() => {
        assert.isFalse(wasActive);
      }).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('Should emit "cardviewbeforeshow" and "cardviewshown"', (done) => {
      var spyCardViewBeforeShow = spyEvent(window, 'cardviewbeforeshow');
      var spyCardViewShown = spyEvent(window, 'cardviewshown');
      tm.hide().then(() => {
        var show = tm.show();
        assert.isTrue(spyCardViewBeforeShow.called);
        clock.tick(TICK_SHOW_HIDE_MS);
        return show;
      }).then(() => {
        assert.isTrue(spyCardViewShown.called);
      }).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('Should hide the overflow during the opening transition', (done) => {
      sinon.stub(TaskManagerUtils, 'waitForScreenToBeReady')
        .returns(Promise.resolve());

      tm.hide().then(() => {
        var show = tm.show();
        clock.tick(TICK_SHOW_HIDE_MS);
        return Promise.resolve().then(() => {
          assert.equal(tm.scrollElement.style.overflowX, 'hidden');
          return show;
        });
      }).then(() => {
        assert.equal(tm.scrollElement.style.overflowX, 'scroll');
      }).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('respondToHierarchyEvent should return true during waitForAppToClose',
    (done) => {
      tm.hide().then(() => {
        var waitForAppToClose = TaskManagerUtils.waitForAppToClose;
        TaskManagerUtils.waitForAppToClose = function() {
          TaskManagerUtils.waitForAppToClose = waitForAppToClose;
          assert.isTrue(tm.respondToHierarchyEvent({ type: 'home' }));
          return Promise.resolve();
        };

        var show = tm.show();
        clock.tick(TICK_SHOW_HIDE_MS);
        return show;
      }).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
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

    test('Should open in response to holdhome from homescreen', (done) => {
      clock.restore();
      tm.hide().then(() => {
        MockService.mockQueryWith(
          'AppWindowManager.getActiveWindow', homescreenApp);
        var showSpy = sinon.spy(tm, 'show');

        sinon.spy(homescreenApp, 'close');

        var handleShown = () => {
          window.removeEventListener('cardviewshown', handleShown);
          try {
            assert.ok(homescreenApp.close.calledWith('home-to-cardview'));
            assert.isTrue(showSpy.called);
            assert.ok(tm.element.classList.contains('from-home'));
            done();
          } catch(e) {
            done(e);
          }
        };
        window.addEventListener('cardviewshown', handleShown);

        tm.respondToHierarchyEvent(new CustomEvent('holdhome'));
      });
    });

    test('tapping the home button when open opens the homescreen', (done) => {
      sinon.spy(tm, 'hide');
      homescreenApp.open = function(why) {
        try {
          assert.ok(tm.hide.calledOnce);
          assert.equal(why, 'home-from-cardview');
          done();
        } catch(e) {
          done(e);
        }
      };
      tm.respondToHierarchyEvent(new CustomEvent('home'));
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
      tm.element.dispatchEvent(new CustomEvent('click'));
      clock.tick(TICK_SHOW_HIDE_MS);
      assert.ok(tm.hide.calledOnce);
    });
  });


  suite('With Populated Task Manager', function() {
    var tm;
    var apps;
    var homescreenApp;
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
      homescreenApp = new HomescreenWindow('home');
      MockService.mockQueryWith('getHomescreen', homescreenApp);
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
      this.sinon.spy(tm, 'getCurrentIndex');
      tm.start().then(() => tm.show()).then(() => { done(); }, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    teardown(function(done) {
      tm.hide().then(() => tm.stop()).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('Proper state', () => {
      assert.isTrue(tm.isShown());
      assert.ok(document.querySelector('#task-manager.active:not(.empty)'));

      assert.equal(
        MockStackManager.getCurrent(),
        tm.currentCard.app);
    });

    test('should not query the currentIndex for the initial launch (reflow)',
    function() {
      // Called once for the scrollEvent once we set the overflow
      sinon.assert.calledOnce(tm.getCurrentIndex);
    });

    test('Proper accessibility attributes for cards', function() {
      assert.equal(
        tm.currentCard.element.getAttribute('aria-labelledby'),
        tm.currentCard.titleId);

      var allCards = document.querySelectorAll('.card');
      assert.equal(allCards.length, MockStackManager.mStack.length);
      for (var i = 0; i < allCards.length; i++) {
        var cardEl = allCards[i];
        assert.equal(
          cardEl.getAttribute('aria-hidden'),
          cardEl === tm.currentCard.element ? 'false' : 'true');
        assert.equal(cardEl.getAttribute('aria-setsize'), allCards.length + '');
        assert.equal(cardEl.getAttribute('aria-posinset'), (i + 1).toString());
        assert.equal(cardEl.getAttribute('role'), 'presentation');
      }
    });

    test('Wheel handling for accessibility', (done) => {
      var card = tm.currentCard;
      var killAppStub = sinon.stub(card.app, 'kill');
      sinon.stub(card.app, 'killable', () => true);
      window.dispatchEvent(new WheelEvent('wheel', {
        deltaMode: 2,
        deltaY: 1
      }));
      assert.isTrue(killAppStub.called);

      done();
    });

    test('wheel left/right event should change the current card', function() {
      var index = tm.stack.indexOf(tm.currentCard.app);
      assert.equal(index, tm.stack.length - 1);
      var previousCard = tm.currentCard;

      // Go left first, since we're at the end of the stack
      window.dispatchEvent(new WheelEvent('wheel', {
        deltaMode: 2,
        deltaX: -1
      }));

      assert.equal(tm.currentCard.app, tm.stack[index - 1]);
      assert.equal(tm.currentCard.element.getAttribute('aria-hidden'), 'false');
      assert.equal(previousCard.element.getAttribute('aria-hidden'), 'true');
      previousCard = tm.currentCard;

      // Go right
      window.dispatchEvent(new WheelEvent('wheel', {
        deltaMode: 2,
        deltaX: 1
      }));

      assert.equal(tm.currentCard.app, tm.stack[index]);
      assert.equal(tm.currentCard.element.getAttribute('aria-hidden'), 'false');
      assert.equal(previousCard.element.getAttribute('aria-hidden'), 'true');
      previousCard = tm.currentCard;

      // Cannot scroll past the final card
      window.dispatchEvent(new WheelEvent('wheel', {
        deltaMode: 2,
        deltaX: 1
      }));

      assert.equal(tm.currentCard.app, tm.stack[index]);
      assert.equal(tm.currentCard.element.getAttribute('aria-hidden'), 'false');
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
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('close and reopen', function(done) {
      tm.hide().then(() => {
        MockStackManager.mCurrent = 0;
        var promise = tm.show();
        clock.tick(TICK_SHOW_HIDE_MS);
        return promise;
      }).then(() => {
        assert.equal(
          MockStackManager.getCurrent(),
          tm.currentCard.app);
      }).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    suite('settings > ', function() {
      test('observes settings at startup', function(done) {
        tm.stop();
        var spy = this.sinon.spy(MockSettingsListener, 'observe');
        tm.start().then(() => {
          assert.equal(spy.callCount, 1);
          done();
        });
      });

      test('observes screenshots setting updates', function() {
        var SETTING_KEY = tm.USE_SCREENSHOTS_SETTING;
        MockSettingsListener.mTriggerCallback(SETTING_KEY, true);
        assert.isFalse(tm.disableScreenshots,
          'disableScreenshots is true when setting is false');

        MockSettingsListener.mTriggerCallback(SETTING_KEY, false);
        assert.isTrue(tm.disableScreenshots,
          'disableScreenshots is false when setting is true');
      });
    });

    test('disableScreenshots = true', function(done) {
      tm.hide().then(() => {
        tm.disableScreenshots = true;
        MockStackManager.mCurrent = 0;
        var promise = tm.show();
        clock.tick(TICK_SHOW_HIDE_MS);
        return promise;
      }).then(() => {
        assert.ok(tm.currentCard.element.classList.contains('appIconPreview'));
      }).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('disableScreenshots = false', function(done) {
      tm.hide().then(() => {
        tm.disableScreenshots = false;
        MockStackManager.mCurrent = 0;
        var promise = tm.show();
        clock.tick(TICK_SHOW_HIDE_MS);
        return promise;
      }).then(() => {
        assert.ok(!tm.currentCard.element.classList.contains('appIconPreview'));
      }).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    function getExpectedCardPlacement(element, position) {
      var margins = window.innerWidth - tm.cardWidth;
      return margins / 2 + position * (tm.cardWidth + tm.CARD_GUTTER);
    }

    test('placement', function() {
      var numCards = tm.cardsList.children.length;
      var margins = window.innerWidth - tm.cardWidth;
      var expectedWidth = numCards * tm.cardWidth +
                         (numCards - 1) * tm.CARD_GUTTER + margins;
      assert.equal(tm.cardsList.style.width, expectedWidth + 'px');

      for(var idx = 0; idx < tm.cardsList.children.length; idx++) {
        var expected =
          getExpectedCardPlacement(tm.cardsList.children[idx], idx);
        assert.equal(
          tm.cardsList.children[idx].style.transform,
          `translate(${expected}px, calc(50% + 0px))`);
      }
    });

    test('StackManager.outOfStack', function(done) {
      var outOfStackApp = apps[APP_NAMES[5]];
      sinon.spy(outOfStackApp, 'open');
      tm.hide().then(() => {
        MockStackManager.mOutOfStack = true;
        MockStackManager.mStack.length = 3;
        MockStackManager.mCurrent = 2;
        var promise = tm.show();
        clock.tick(TICK_SHOW_HIDE_MS);
        return promise;
      }).then(() => {
        // current card should be the last in the stack
        assert.equal(
          MockStackManager.getCurrent(),
          tm.currentCard.app);
        var promise = tm.hide(outOfStackApp);
        clock.tick(TICK_SHOW_HIDE_MS);
        return promise;
      }).then(() => {
        assert.ok(outOfStackApp.open.calledOnce);
        assert.ok(MockStackManager.position, -1);
      }).then(done, done);
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    suite('center apps', function() {
      setup(function(done) {
        tm.hide().then(() => {
          MockService.mockQueryWith('getTopMostWindow', apps.search);
          MockStackManager.mCurrent = MockStackManager.mStack.length - 1;
          return tm.show();
        }).then(() => { done(); }, done);
        clock.tick(TICK_SHOW_HIDE_MS);
      });

      test('initial centering', function() {
        // test that the current card gets centered
        var currentApp = MockStackManager.mStack[MockStackManager.mCurrent];
        var elem = tm.currentCard.element;

        assert.equal(currentApp, tm.currentCard.app);

        var expectedLeft = getExpectedCardPlacement(
          elem, MockStackManager.mCurrent
        );
        assert.equal(tm.currentCard.element.style.transform,
                     `translate(${expectedLeft}px, calc(50% + 0px))`);
      });

      test('centering at different stack position after closing',
      function(done) {
        // close and re-open the task manager at a different stack position
        tm.hide(apps.game).then(() => {
          // open again at position 0.
          MockStackManager.mCurrent = 0;
          return tm.show();
        }).then(() => {
          var currentApp = MockStackManager.mStack[0];
          var elem = tm.currentCard.element;

          assert.equal(currentApp, tm.currentCard.app);

          var expectedLeft =
            getExpectedCardPlacement(elem, MockStackManager.mCurrent);
          assert.equal(tm.currentCard.element.style.transform,
                       `translate(${expectedLeft}px, calc(50% + 0px))`);
        }).then(done, done);
        clock.tick(TICK_SHOW_HIDE_MS);
      });
    });

    test('takes you home after closing all cards', (done) => {
      MockStackManager.mStack.length = 0;
      sinon.spy(tm, 'hide');
      window.dispatchEvent(new CustomEvent('appterminated'));
      clock.tick(TICK_SHOW_HIDE_MS);
      assert.ok(tm.hide.calledOnce);
      done();
    });

    test('kill cards and update in response to StackManager', function() {
      MockStackManager.mStack.length = 2;
      window.dispatchEvent(new CustomEvent('appterminated'));
      clock.tick(TICK_SHOW_HIDE_MS);
      assert.equal(
        document.querySelectorAll('.card').length,
        MockStackManager.mStack.length
      );
    });

    test('hide by tapping on the current card', function(done) {
      // Tapping on the current card should trigger app.open('from-cardview')
      // as well as hide the task manager.
      var card = tm.currentCard;
      this.sinon.spy(tm, 'hide');
      card.app.open = function(how) {
        try {
          assert.equal(how, 'from-cardview');
          assert.ok(tm.hide.calledWith(card.app));
          done();
        } catch(e) {
          done(e);
        }
      };
      card.element.click();
    });

    test('hide by tapping on a _different_ (non-current) card', function(done) {
      // Tapping on a non-current card, we should first scroll to that app,
      // and then open the app and hide the task manager.
      var card = tm.appToCardMap.get(tm.stack[0]);
      this.sinon.spy(tm, 'hide');
      this.sinon.spy(tm, 'panToApp');

      // Sanity: make sure we didn't choose the current card by mistake
      assert.notEqual(card, tm.currentCard);

      card.app.open = function(how) {
        try {
          // When we finally open the card, we'll know that we've scrolled
          // to make it front-and-center when (card === tm.currentCard).
          assert.equal(how, 'from-cardview');
          assert.equal(card, tm.currentCard);
          assert.ok(tm.panToApp.calledWith(card.app));
          assert.ok(tm.hide.calledWith(card.app));
          done();
        } catch(e) {
          done(e);
        }
      };

      card.element.click();
    });

    test('kill a card by clicking on the close button', function(done) {
      var card = tm.currentCard;
      card.app.kill = function() {
        done();
      };
      card.element.querySelector('.close-button').click();
      clock.tick(TICK_SHOW_HIDE_MS);
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
        clock.tick(TICK_SHOW_HIDE_MS);
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

      // Ensure that the selected app ('game') is opened.
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


    test('no touch input handled while opening selected app', function(done) {
      this.sinon.spy(tm, 'handleEvent');

      tm.hide(apps.game).then(() => {
        assert.isFalse(tm.handleEvent.called, 'handleEvent not called');
      }).then(function() { done(); }, done);
      tm.element.dispatchEvent(new CustomEvent('touchstart'));
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    suite('card-will-drag / scroll axis lock', function() {
      test('handling card-will-drag (prevent scrolling)', function() {
        tm.scrollElement.style.overflowX = 'scroll';
        // In this test, they did not scroll, so the card-will-drag event
        // should be passed through as-is, and we should set 'overflow: hidden'.
        var willDragEvent = new CustomEvent('card-will-drag', {
          detail: { firstTouchTimestamp: Date.now() },
          bubbles: true,
          cancelable: true
        });

        tm.currentCard.element.dispatchEvent(willDragEvent);
        assert.isFalse(willDragEvent.defaultPrevented);
        assert.equal(tm.scrollElement.style.overflowX, 'hidden');
      });

      test('handling card-will-drag (cancel event)', function() {
        tm.scrollElement.style.overflowX = 'scroll';
        // In this test, they scrolled AFTER the first touch, meaning we
        // should prevent the card-will-drag event.
        tm.scrollElement.dispatchEvent(new CustomEvent('scroll'));

        var willDragEvent = new CustomEvent('card-will-drag', {
          detail: { firstTouchTimestamp: Date.now() - 1000 },
          bubbles: true,
          cancelable: true
        });

        tm.currentCard.element.dispatchEvent(willDragEvent);
        assert.isTrue(willDragEvent.defaultPrevented);
        assert.equal(tm.scrollElement.style.overflowX, 'scroll');
      });
    });

    test('card-dropped, not killed', function() {
      tm.scrollElement.style.overflowX = 'hidden';
      var dropEvent = new CustomEvent('card-dropped', {
        detail: { willKill: false },
        bubbles: true
      });

      tm.currentCard.element.dispatchEvent(dropEvent);
      assert.equal(tm.scrollElement.style.overflowX, 'scroll');
    });

    test('card-dropped, kill the app', function(done) {
      tm.scrollElement.style.overflowX = 'hidden';
      var dropEvent = new CustomEvent('card-dropped', {
        detail: { willKill: true },
        bubbles: true
      });

      tm.currentCard.app.kill = function() {
        done();
      };

      tm.currentCard.element.dispatchEvent(dropEvent);
      assert.equal(tm.scrollElement.style.overflowX, 'scroll');
      clock.tick(TICK_SHOW_HIDE_MS);
    });

    test('browser-only filtering', function(done) {
      var allBrowserApps = [apps.browser1, apps.browser2, apps.search];
      clock.restore();
      this.timeout(20000);
      var newApp;
      tm.hide().then(() => {
        return tm.show({ browserOnly: true });
      }).then(() => {
        assert.equal(tm.stack.length, allBrowserApps.length);

        window.addEventListener('cardviewclosed', (evt) => {
          newApp = evt.detail;
        });

        return tm.hide(apps.browser1);
      }).then(() => {
        assert.equal(
          newApp,
          apps.browser1
        );
      }).then(done, done);
    });

    suite('new sheet buttons >', function() {
      var NEW_SHEET_SELECTOR = '#task-manager-new-sheet-button';
      var NEW_PRIVATE_SHEET_SELECTOR = '#task-manager-new-private-sheet-button';
      setup(function() {
        window.AppWindow = function(config) {
          var app = new MockAppWindow(config);
          MockStackManager.mStack.push(app);
          return app;
        };
        window.BrowserConfigHelper = function(config) {
          return config;
        };
      });

      function testSheetButton(name, { selector, isPrivate }) {
        test(name, function() {
          this.sinon.spy(tm, 'hide');
          var originalStack = tm.stack.slice();

          tm.element.querySelector(selector).click();

          var newStack = tm.stack.slice();
          var lastApp = newStack[newStack.length - 1];

          assert.equal(newStack.length, originalStack.length + 1);
          assert.equal(lastApp.isPrivate ? true : false, isPrivate);
          assert.equal(tm.currentCard.app, lastApp);
          assert.ok(tm.hide.calledWith(lastApp, 'from-new-card'));
        });
      }

      testSheetButton('open new sheet', {
        selector: NEW_SHEET_SELECTOR,
        isPrivate: false
      });

      testSheetButton('open new private sheet', {
        selector: NEW_PRIVATE_SHEET_SELECTOR,
        isPrivate: true
      });

      test('only opens one sheet, even if called multiple times', function() {
        this.sinon.spy(tm, 'hide');

        var button = tm.element.querySelector(NEW_SHEET_SELECTOR);
        button.click();
        button.click();
        button.click();

        assert.ok(tm.hide.calledOnce);
      });

    });

  });

});
