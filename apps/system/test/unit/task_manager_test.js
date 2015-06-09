/* global MockStackManager, MockNavigatorSettings, MockService,
          TaskManager, Card, AppWindow,
          HomescreenWindow, MocksHelper, MockL10n */

'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_lazy_loader.js');

require('/shared/js/event_safety.js');
require('/shared/js/sanitizer.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForTaskManager = new MocksHelper([
  'StackManager',
  'HomescreenWindow',
  'AppWindow',
  'Service',
  'LazyLoader'
]).init();

function waitForEvent(target, name, timeout) {
  if (isNaN(timeout)) {
    timeout = 250;
  }
  var promise = new window.Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('Timeout exceeded waiting for ' + name));
    }, timeout);
    target.addEventListener(name, function onEvent(evt){
      clearTimeout(timer);
      target.removeEventListener(name, onEvent);
      resolve(evt);
    });
  });
  return promise;
}

function failOnReject(err) {
  if (err) {
    return err;
  }
  assert.isTrue(false, 'Should not reject');
}

suite('system/TaskManager >', function() {
  var fakeInnerHeight = 200;

  var screenNode, realMozSettings, realSettingsListener, realL10n;
  var cardsView, cardsList, noRecentWindowsNode;
  var ihDescriptor;

  function createTouchEvent(type, target, x, y) {
    var touch = document.createTouch(window, target, 1, x, y, x, y);
    var touchList = document.createTouchList(touch);

    var evt = document.createEvent('TouchEvent');
    evt.initTouchEvent(type, true, true, window,
                       0, false, false, false, false,
                       touchList, touchList, touchList);
    return evt;
  }

  function sendHoldhome() {
    var evt = new CustomEvent('holdhome', { });
    taskManager.respondToHierarchyEvent(evt);
  }

  function sendAppopen(detail) {
    detail = detail || {
      manifestURL: 'http://sms.gaiamobile.org/manifest.webapp',
      origin: 'http://sms.gaiamobile.org',
      isHomescreen: false
    };

    if (detail.element) {
      detail.element.dispatchEvent(new CustomEvent('_opened'));
    }

    var evt = new CustomEvent('appopen', { detail: detail });
    window.dispatchEvent(evt);
  }

  function sendAppTerminated(detail) {
    var evt = new CustomEvent('appterminated', { detail: detail });
    window.dispatchEvent(evt);
  }

  function showTaskManager(clock, stackFilter) {
    window.dispatchEvent(new CustomEvent('taskmanagershow', {
      detail: {
        filter: stackFilter
      }
    }));
    // We wait for the app to close
    window.dispatchEvent(new CustomEvent('appclosed'));
    // Then dispatch the cardviewshow event after a tick
    clock.tick();
  }

  function fakeFinish(clock, app) {
    clock.tick(100); // smooth timeout
    app.element.dispatchEvent(new CustomEvent('_opened'));
    clock.tick(); // timeout before close event is dispatched
  }

  var apps, home;
  var sms, game, game2;
  var taskManager;

  mocksForTaskManager.attachTestHelpers();
  suiteSetup(function cv_suiteSetup(done) {
    apps = {
      'http://sms.gaiamobile.org': new AppWindow({
        launchTime: 5,
        name: 'SMS',
        frame: document.createElement('div'),
        manifest: {
          orientation: 'portrait-primary'
        },
        rotatingDegree: 0,
        requestScreenshotURL: function() {
          return null;
        },
        killable: function() {
          return true;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://sms.gaiamobile.org',
        blur: function() {}
      }),
      'http://game.gaiamobile.org': new AppWindow({
        launchTime: 4,
        name: 'GAME',
        manifest: {
          orientation: 'landscape-primary'
        },
        rotatingDegree: 90,
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://game.gaiamobile.org',
        blur: function() {}
      }),
      'browser1': new AppWindow({
        launchTime: 4,
        name: 'BROWSER1',
        rotatingDegree: 0,
        isBrowser: function() {
          return true;
        },
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://browser1.somedomain.tld/path',
        blur: function() {}
      }),
      'http://game2.gaiamobile.org': new AppWindow({
        launchTime: 3,
        name: 'GAME2',
        manifest: {
          orientation: 'landscape-secondary'
        },
        rotatingDegree: 270,
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://game2.gaiamobile.org',
        blur: function() {}
      }),
      'browser2': new AppWindow({
        name: 'BROWSER2',
        rotatingDegree: 0,
        isBrowser: function() {
          return true;
        },
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://browser2.somedomain.tld/',
        blur: function() {}
      }),
      'search': new AppWindow({
        name: 'search',
        rotatingDegree: 0,
        isBrowser: function() {
          return true;
        },
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://search.gaiamobile.org/',
        manifest: {
          role: 'search'
        },
        blur: function() {}
      })
    };

    sms = new AppWindow({
      instanceID: 'AppWindow-0',
      launchTime: 5,
      name: 'SMS',
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 0,
      origin: 'http://sms.gaiamobile.org',
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      blur: function() {}
    });

    game = new AppWindow({
      instanceID: 'AppWindow-1',
      launchTime: 5,
      name: 'GAME',
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 90,
      origin: 'http://game.gaiamobile.org',
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      blur: function() {}
    });

    game2 = new AppWindow({
      instanceID: 'AppWindow-2',
      launchTime: 5,
      name: 'GAME2',
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 270,
      origin: 'http://game2.gaiamobile.org',
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      blur: function() {}
    });

    ihDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerHeight', {
      value: fakeInnerHeight,
      configurable: true
    });

    screenNode = document.createElement('div');
    screenNode.id = 'screen';
    cardsView = document.createElement('div');
    cardsView.id = 'cards-view';

    cardsList = document.createElement('ul');
    cardsList.id = 'cards-list';
    cardsView.appendChild(cardsList);

    noRecentWindowsNode = document.createElement('div');
    noRecentWindowsNode.id = 'cards-no-recent-windows';
    cardsView.appendChild(noRecentWindowsNode);

    screenNode.appendChild(cardsView);
    document.body.appendChild(screenNode);

    realMozSettings = navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
    // dont reset the mock between tests
    MockNavigatorSettings.mSetup = function() {};
    MockNavigatorSettings.mTeardown = function() {};

    // init with minimum default settings
    MockNavigatorSettings
      .mSettings['app.cards_view.screenshots.enabled'] = true;
    MockNavigatorSettings.mSyncRepliesOnly = true;

    realSettingsListener = window.SettingsListener;
    // minimal mock for SettingsListener
    window.SettingsListener = {
      observe: function(name, defaultValue, callback) {
        MockNavigatorSettings.addObserver(name, function(event) {
          callback(event.settingValue);
        });
      },
      getSettingsLock: function() {
        return MockNavigatorSettings.createLock();
      }
    };

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    home = new HomescreenWindow('fakeHome');
    MockService.mockQueryWith('getHomescreen', home);
    requireApp('system/js/cards_helper.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/card.js');

    requireApp('system/js/task_manager.js', function() {
      // normally done by bootstrap
      taskManager = new TaskManager();
      taskManager.start();
      done();
    });

  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'innerHeight', ihDescriptor);
    screenNode.parentNode.removeChild(screenNode);
    navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
    navigator.mozL10n = realL10n;
  });

  // The whole suite should use fakeTimers to prevent intemittents
  // since the code logic is timer-heavy
  setup(function() {
    MockService.mockQueryWith('getHomescreen', home);
    MockService.mockQueryWith('fetchCurrentOrientation', 'portrait-primary');
    MockService.mockQueryWith('defaultOrientation', 'portrait-primary');
    this.sinon.useFakeTimers();
  });

  // We make sure to end each test with a hidden cardview
  // and all setTimeouts triggered
  teardown(function() {
    taskManager.hide();
    this.sinon.clock.tick(500); // 100ms exit + 400ms safety
  });

  suite('Hierarchy functions', function() {
    setup(function() {
      this.sinon.stub(taskManager, '_fetchElements');
      this.sinon.stub(taskManager, '_registerEvents');
      this.sinon.stub(taskManager, '_unregisterEvents');
      taskManager.stack = [];
      taskManager.unfilteredStack = [];
    });

    teardown(function() {
      taskManager.stop();
    });

    test('start should register hierarchy', function() {
      this.sinon.stub(MockService, 'request');
      taskManager.start();
      assert.isTrue(
        MockService.request.calledWith('registerHierarchy', taskManager));
    });

    test('stop should unregister hierarchy', function() {
      taskManager.start();
      this.sinon.stub(MockService, 'request');
      taskManager.stop();
      assert.isTrue(
        MockService.request.calledWith('unregisterHierarchy', taskManager));
    });

    test('setActive to true should publish -activated', function(done) {
      window.addEventListener(taskManager.EVENT_PREFIX + '-activated',
        function onactivated() {
          window.removeEventListener(taskManager.EVENT_PREFIX + '-activated',
            onactivated);
          done();
        });
      taskManager.setActive(true);
    });

    test('setActive to false should publish -deactivated', function(done) {
      taskManager.setActive(true);
      window.addEventListener(taskManager.EVENT_PREFIX + '-deactivated',
        function ondeactivated() {
          window.removeEventListener(taskManager.EVENT_PREFIX + '-deactivated',
            ondeactivated);
          done();
        });
      taskManager.setActive(false);
    });
  });

  suite('sanity check > ', function() {
    test('instantiable TaskManager', function(){
      assert.isTrue(taskManager instanceof window.TaskManager,
                  'taskManager instanceof TaskManager');

      var anotherTaskManager = new TaskManager();
      assert.isTrue(anotherTaskManager instanceof window.TaskManager,
                  'taskManager instanceof TaskManager');

      assert.notEqual(anotherTaskManager, taskManager,
                      'TaskManager not expected to exhibit Singleton behavior');
    });

    test('instantiable Cards', function(){
      var card = new Card();
      assert.ok(card && card instanceof window.Card,
                'Card instantiation');
    });
  });

  suite('when a document is fullscreen', function() {
    var realFullScreen;
    setup(function() {
      realFullScreen = document.mozFullScreen;
      Object.defineProperty(document, 'mozFullScreen', {
        configurable: true,
        get: function() { return true; }
      });
    });

    teardown(function() {
      Object.defineProperty(document, 'mozFullScreen', {
        configurable: true,
        get: function() { return realFullScreen; }
      });
    });

    test('should exit fullscreen when showing',
      function() {
        var cancelSpy = this.sinon.spy(document, 'mozCancelFullScreen');
        taskManager.show();
        sinon.assert.calledOnce(cancelSpy);
      });
  });

  suite('settings > ', function() {
    suite('screenshots settings >', function() {
      var SETTING_KEY;
      suiteSetup(function() {
        SETTING_KEY = TaskManager.prototype.SCREENSHOT_PREVIEWS_SETTING_KEY;
      });

      // taskManager should've added an observer when it started
      test('observes setting at startup', function() {
        var observers = MockNavigatorSettings.mObservers[SETTING_KEY];
        assert.equal(observers.length, 1,
          'exactly one observer is watching ' + SETTING_KEY);
      });

      test('observes setting updates', function() {
        var event = { settingValue: false };
        MockNavigatorSettings.mTriggerObservers(SETTING_KEY, event);
        assert.ok(!taskManager.useAppScreenshotPreviews,
          'useAppScreenshotPreviews is false when setting is false');

        event = { settingValue: true };
        MockNavigatorSettings.mTriggerObservers(SETTING_KEY, event);
        assert.ok(taskManager.useAppScreenshotPreviews,
          'useAppScreenshotPreviews is true when setting is true');
      });
    });
  });

  suite('populated task manager >', function() {
    suiteSetup(function() {
      MockStackManager.mStack = [];
      for (var app in apps) {
        MockStackManager.mStack.push(apps[app]);
      }
      apps.home = home;
      MockStackManager.mCurrent = 0;

      MockService.mockQueryWith('getTopMostWindow',
        apps['http://sms.gaiamobile.org']);
    });

    suite('display cardsview >', function() {
      setup(function() {
        MockService.mockQueryWith('getTopMostWindow',
          apps['http://sms.gaiamobile.org']);
        showTaskManager(this.sinon.clock);
      });

      test('fetch elements', function() {
        assert.equal(taskManager.element, cardsView);
        assert.equal(taskManager.cardsList, cardsList);
        assert.equal(taskManager.screenElement, screenNode);
      });

      test('cardsview should be active once app is closed', function() {
        assert.isTrue(taskManager.isShown(), 'taskManager.isShown');
        assert.isTrue(screenNode.classList.contains('cards-view'));
      });

      test('cardsview shouldnt show while already showing', function() {
        this.sinon.stub(taskManager, 'setActive');
        var onCardViewBeforeShowSpy = sinon.spy();
        window.addEventListener('cardviewbeforeshow', onCardViewBeforeShowSpy);

        taskManager.show();
        assert.isFalse(taskManager.setActive.called);
        assert.isFalse(onCardViewBeforeShowSpy.called);
        window.removeEventListener('cardviewbeforeshow',
                                   onCardViewBeforeShowSpy);
      });

      test('cardsview shouldnt respond to holdhome while already showing',
      function() {
        this.sinon.stub(taskManager, 'setActive');
        var onCardViewBeforeShowSpy = sinon.spy();
        window.addEventListener('cardviewbeforeshow', onCardViewBeforeShowSpy);

        sendHoldhome();
        assert.isFalse(taskManager.setActive.called);
        assert.isFalse(onCardViewBeforeShowSpy.called);
        window.removeEventListener('cardviewbeforeshow',
                                   onCardViewBeforeShowSpy);
      });

      test('cardsview shouldnt display no recent apps message', function() {
        assert.isFalse(cardsView.classList.contains('empty'));
      });

      test('initial state', function() {
        assert.equal(taskManager.position, 0,
                    'initial position should be 0');
        assert.ok(taskManager.currentCard,
                  'has a truthy currentCard property');
      });

      function undefinedProps(value) {
        for (var key in value) {
          if (typeof value[key] === 'undefined') {
            return true;
          }
        }
        return false;
      }

      test('applyStyle is called by swiping', function(done) {
        var card = taskManager.getCardAtIndex(0);
        var element = card.element;
        var applyStyleSpy = this.sinon.spy(card, 'applyStyle');

        waitForEvent(element, 'touchend').then(function() {
          var callCount = applyStyleSpy.callCount;
          assert.isTrue(callCount > 0,
                        'card.applyStyle was called at least once');
          assert.isFalse(applyStyleSpy.calledWith(sinon.match(undefinedProps)),
            'card.applyStyle was not called with undefined properties');

        }, failOnReject).then(function() { done(); }, done);

        // Simulate a drag up that doesn't remove the card
        element.dispatchEvent(createTouchEvent('touchstart', element, 0, 500));
        element.dispatchEvent(createTouchEvent('touchmove', element, 0, 250));
        element.dispatchEvent(createTouchEvent('touchend', element, 0, 450));
      });

      test('cards should be hidden for better performance', function() {
        var card = taskManager.getCardAtIndex(0);
        assert.equal(card.element.style.visibility, '');

        var farAway = taskManager.getCardAtIndex(3);
        assert.equal(farAway.element.style.visibility, 'hidden');
      });

      test('and shown when needed', function() {
        taskManager.position = 3;
        taskManager.alignCurrentCard();
        var card = taskManager.getCardAtIndex(0);
        assert.equal(card.element.style.visibility, 'hidden');

        var farAway = taskManager.getCardAtIndex(3);
        assert.equal(farAway.element.style.visibility, '');
      });

      test('wheel up event', function() {
        var card = taskManager.getCardAtIndex(0);
        var killAppStub = this.sinon.stub(card, 'killApp');

        taskManager.handleEvent({
          type: 'wheel',
          deltaMode: 2,
          DOM_DELTA_PAGE: 2,
          deltaY: 1
        });
        assert.isTrue(killAppStub.called);
      });

      test('wheel left/right event', function() {
        var alignCurrentCardSpy = this.sinon.spy(taskManager,
          'alignCurrentCard');

        assert.equal(taskManager.position, 0);
        taskManager.handleEvent({
          type: 'wheel',
          deltaMode: 2,
          DOM_DELTA_PAGE: 2,
          deltaX: 1
        });
        assert.equal(taskManager.position, 1);

        taskManager.handleEvent({
          type: 'wheel',
          deltaMode: 2,
          DOM_DELTA_PAGE: 2,
          deltaX: -1
        });
        assert.equal(taskManager.position, 0);

        assert.equal(alignCurrentCardSpy.callCount, 2);
      });

      test('transitions are removed correctly after swiping', function(done) {
        var card = taskManager.getCardAtIndex(0);
        var applyStyleSpy = this.sinon.spy(card, 'applyStyle');
        var element = card.element;

        // Simulate a swipe to the side
        waitForEvent(element, 'touchend').then(function() {
          assert.isTrue(applyStyleSpy.callCount > 0,
                        'card.applyStyle was called');
          assert.isFalse(applyStyleSpy.calledWith(sinon.match(undefinedProps)),
            'card.applyStyle was not called with undefined properties');
        }, failOnReject).then(function() { done(); }, done);

        element.dispatchEvent(createTouchEvent('touchstart', element, 0, 500));
        element.dispatchEvent(createTouchEvent('touchmove', element, 100, 500));
        element.dispatchEvent(createTouchEvent('touchend', element, 100, 500));
      });

      test('user can change swipe direction', function() {
        var currentCard = taskManager.currentCard;

        // Simulate a swipe that goes to one side, then back again
        var el = currentCard.element;
        el.dispatchEvent(createTouchEvent('touchstart', el, 200, 500));
        this.sinon.clock.tick(300);
        el.dispatchEvent(createTouchEvent('touchmove', el, 0, 500));
        this.sinon.clock.tick(300);
        el.dispatchEvent(createTouchEvent('touchmove', el, 380, 500));
        this.sinon.clock.tick(300);
        el.dispatchEvent(createTouchEvent('touchmove', el, 190, 500));
        this.sinon.clock.tick(300);
        el.dispatchEvent(createTouchEvent('touchend', el, 180, 500));

        assert.isTrue(currentCard == taskManager.currentCard,
                      'current card remains unchanged');
      });

    });
    suite('when the currently displayed app is out of the stack',
    function() {
      setup(function() {
        MockStackManager.mOutOfStack = true;
        MockStackManager.mStack = [
          apps['http://sms.gaiamobile.org'],
          apps['http://game.gaiamobile.org'],
          apps['http://game2.gaiamobile.org']
        ];
        MockStackManager.mCurrent = 1;
        taskManager.show();
      });

      teardown(function() {
        MockStackManager.mOutOfStack = false;
      });

      test('position should be the last position in the stack',
      function() {
        assert.equal(taskManager.position, 2);
      });

      test('exitToApp handles out-of-stack app',
      function(done) {
        var outOfStackApp = game2;
        var openStub = this.sinon.stub(outOfStackApp, 'open');
        waitForEvent(window, 'cardviewclosed').then(function(evt) {
          assert.isTrue(openStub.calledOnce);
          assert.equal(evt.detail.newStackPosition, -1);
        }, failOnReject)
        .then(function() { done(); }, done);

        taskManager.exitToApp(outOfStackApp);
        this.sinon.clock.tick(500); // allow safety timeout to fire
      });
    });

    suite('display cardsview via holdhome >', function() {
      setup(function(done) {
        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        sendHoldhome();
        window.dispatchEvent(new CustomEvent('appclosed'));
        this.sinon.clock.tick();
      });

      test('cardsview should be active', function() {
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());
      });
    });

    suite('display cardsview via holdhome > when the keyboard is displayed',
    function() {
      setup(function(done) {
        MockService.mockQueryWith('keyboardEnabled', true);
        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);

        sendHoldhome();

        window.dispatchEvent(new CustomEvent('appclosed'));
        this.sinon.clock.tick();
        assert.isFalse(taskManager.isShown());

        window.dispatchEvent(new CustomEvent('keyboardhidden'));
        this.sinon.clock.tick();
      });

      test('cardsview should be active', function() {
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());
      });
    });

    suite('populated task manager in rocketbar >', function() {
      setup(function() {
        showTaskManager(this.sinon.clock);
      });

      test('has correct classes', function() {
        assert.isTrue(cardsView.classList.contains('active'));
      });
    });
  });

  suite('empty task manager >', function() {
    setup(function() {
      MockStackManager.mStack = [];
      MockStackManager.mCurrent = -1;
    });

    test('Empty task manager opens', function(done) {
      var events = [];
      window.Promise.race([
        waitForEvent(window, 'cardviewclosed').then(function() {
          events.push('cardviewclosed');
        }, failOnReject),
        waitForEvent(window, 'cardviewshown').then(function() {
          events.push('cardviewshown');
        }, failOnReject)
      ]).then(function() {
        assert.equal(events.length, 1, 'sanity check, only one event received');
        assert.equal(events[0],
                    'cardviewshown',
                    'cardviewshown event raised when shown with empty stack');
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());
        done();
      }, failOnReject);
      // Pre-Haida/Cardsview mode: taskManager shows empty message
      showTaskManager(this.sinon.clock);
    });

    suite('display empty cardsview >', function() {
      setup(function() {
        showTaskManager(this.sinon.clock);
      });

      test('on touchstart, empty cardsview is closed and back to home screen',
      function(done) {
        var events = [];
        assert.isTrue(cardsView.classList.contains('empty'));
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());

        waitForEvent(window, 'cardviewclosed', 501).then(function(){
          events.push('cardviewclosed');
        }, failOnReject).then(function() {
          assert.equal(events.length, 1, 'sanity check, only 1 event received');
          assert.equal(events[0],
                      'cardviewclosed',
                      'cardviewclosed event raised when touch starts');
          assert.isFalse(cardsView.classList.contains('active'));
          assert.isFalse(taskManager.isShown());
        }, failOnReject)
        .then(done, done);

        cardsView.dispatchEvent(
          createTouchEvent('touchstart', cardsView, 100, 100));
        this.sinon.clock.tick(501);
      });
    });
  });

  suite('hide > ', function() {
    setup(function() {
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps['http://game.gaiamobile.org']
      ];
      MockStackManager.mCurrent = 0;
      MockService.mockQueryWith('AppWindowManager.getActiveWindow',
        apps['http://sms.gaiamobile.org']);

      showTaskManager(this.sinon.clock);
    });

    teardown(function() {
      cardsList.innerHTML = '';
    });

    test('taskManager should not be active', function() {
      taskManager.hide();
      assert.isFalse(taskManager.isShown(), 'isShown is false');
      assert.isFalse(cardsView.classList.contains('active'),
                    'no .active class');
    });

    test('removes classes', function() {
      taskManager.hide();
      assert.isFalse(screenNode.classList.contains('cards-view'));
    });

    test('all apps should leaveTaskManager', function() {
      MockStackManager.mStack.forEach(function(app) {
        this.sinon.spy(app, 'leaveTaskManager');
      }, this);

      taskManager.hide();

      MockStackManager.mStack.forEach(function(app) {
        sinon.assert.calledOnce(app.leaveTaskManager);
      }, this);
    });

    test('hide: raises cardviewclosed event', function(done) {
      taskManager.newStackPosition = 1;
      waitForEvent(window, 'cardviewclosed').then(function(event) {
        assert.equal(typeof event.detail, 'object',
                    'gets event with detail object');
        assert.equal(event.detail.newStackPosition, 1,
                    'event detail reflects taskManager.newStackPosition');
        delete taskManager.newStackPosition;
      }, failOnReject).then(done, done);
      taskManager.hide();
      this.sinon.clock.tick(101);
    });

    test('hide: removes cards', function(done) {
      waitForEvent(window, 'cardviewclosed').then(function(event) {
        assert.equal(cardsList.childNodes.length, 0,
                    'all card elements are gone');
        assert.equal(Object.keys(taskManager.cardsByAppID).length, 0,
                    'cards lookup is empty');
        done();
      }, failOnReject);
      taskManager.hide();
      this.sinon.clock.tick(101);
    });

    test('hide: calls card.destroy', function(done) {
      var firstCard = taskManager.getCardAtIndex(0);
      var secondCard = taskManager.getCardAtIndex(1);
      var destroyStub1 = sinon.stub(firstCard, 'destroy');
      var destroyStub2 = sinon.stub(secondCard, 'destroy');

      waitForEvent(window, 'cardviewclosed').then(function(event) {
        assert.isTrue(destroyStub1.calledOnce,
                      '1st card.destroy was called once');
        assert.isTrue(destroyStub2.calledOnce,
                      '2nd card.destroy was called once');
        destroyStub1.restore();
        destroyStub2.restore();
        done();
      }, failOnReject);
      taskManager.hide();
      this.sinon.clock.tick(101);
    });

  });

  suite('setActive', function() {
    test('setActive true', function(done) {
      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      // setActive(true) should fire cardsviewshown event
      waitForEvent(window, 'cardviewshown').then(function(event) {
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown(), 'isShown is true');
        done();
      }, failOnReject);
      // minimal-setup
      cardsView.classList.remove('active');
      taskManager.setActive(true);
      this.sinon.clock.tick();
    });
    test('setActive false', function(done) {
      taskManager.setActive(true);
      this.sinon.clock.tick();
      // setActive(false) should fire cardviewbeforeclose event
      waitForEvent(window, 'cardviewbeforeclose').then(function(event) {
        assert.isFalse(cardsView.classList.contains('active'));
        assert.isFalse(taskManager.isShown(), 'isShown is false');
        done();
      }, failOnReject);
      // minimal-setup
      cardsView.classList.add('active');
      taskManager.setActive(false);
      this.sinon.clock.tick();
    });
  });

  suite('one app is displayed >', function() {
    setup(function() {
      MockStackManager.mStack = [apps['http://sms.gaiamobile.org']];
      MockStackManager.mCurrent = 0;
      showTaskManager(this.sinon.clock);
    });

    test('Prevent reflowing during swipe to remove', function() {
      var card = cardsView.querySelector('.card');

      var touchstart = createTouchEvent('touchstart', card, 0, 500);
      var touchmove = createTouchEvent('touchmove', card, 0, 200);
      var touchend = createTouchEvent('touchend', card, 0, 200);

      assert.isFalse(card.dispatchEvent(touchstart));
      assert.isFalse(card.dispatchEvent(touchmove));
      assert.isFalse(card.dispatchEvent(touchend));
    });
  });

  suite('tapping on an app >', function() {
    setup(function() {
      MockStackManager.mStack = [apps['http://sms.gaiamobile.org']];
      MockStackManager.mCurrent = 0;
      showTaskManager(this.sinon.clock);
    });

    test('displays the new app before dismissing the task manager',
    function(done) {
      waitForEvent(window, 'cardviewclosed').then(function(evt) {
        assert.ok(evt.detail && !isNaN(evt.detail.newStackPosition),
                  'cardviewclosed evt has new position detail');
      }, failOnReject).then(function() { done(); }, done);

      var app = MockStackManager.mStack[0];
      this.sinon.stub(app, 'open', function() {
        sendAppopen(app);
      });

      var target = cardsList.firstElementChild;
      taskManager.handleTap({ target: target });
      target.dispatchEvent(new CustomEvent('transitionend'));
      this.sinon.clock.tick(100);
    });
  });

  suite('closeApp', function() {
    setup(function() {
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps['http://game.gaiamobile.org']
      ];
      MockStackManager.mCurrent = 0;
      showTaskManager(this.sinon.clock);
    });
    teardown(function() {
      cardsList.innerHTML = '';
    });

    test('removes the card for that app', function() {
      var card = taskManager.getCardAtIndex(0);
      var removeCardStub = this.sinon.stub(taskManager, 'removeCard');
      sendAppTerminated(card.app);
      assert.isTrue(removeCardStub.calledOnce);
    });

    test('destroys the card', function() {
      var card = taskManager.getCardAtIndex(0);
      var destroySpy = this.sinon.spy(card, 'destroy');
      assert.isTrue(card && card.element &&
                    card.element.parentNode == taskManager.cardsList);
      var instanceID = card.app.instanceID;
      sendAppTerminated(card.app);
      assert.isTrue(destroySpy.calledOnce);
      assert.equal(cardsList.childNodes.length, 1);
      assert.isFalse(instanceID in taskManager.cardsByAppID);
    });

    suite('after destroying all the cards', function() {
      setup(function() {
        sendAppTerminated(apps['http://sms.gaiamobile.org']);
      });

      test('should go back home', function(done) {
        var stub = this.sinon.stub(home, 'open');

        waitForEvent(window, 'cardviewclosed').then(function() {
          assert.isTrue(stub.calledOnce, 'home was open');
        }, failOnReject)
        .then(function() { done(); }, done);

        sendAppTerminated(apps['http://game.gaiamobile.org']);
        fakeFinish(this.sinon.clock, home);
      });
    });
  });

  suite('app is killed', function() {
    setup(function() {
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps['http://game.gaiamobile.org']
      ];
      MockStackManager.mCurrent = 0;
      taskManager.isRocketbar = false;
      showTaskManager(this.sinon.clock);
    });

    teardown(function() {
      cardsList.innerHTML = '';
    });

    test('removeCard is called on appterminated', function() {
      var deadApp = apps['http://game.gaiamobile.org'];
      var card = taskManager.cardsByAppID[deadApp.instanceID];
      var removeCardSpy = this.sinon.spy(taskManager, 'removeCard');
      var destroySpy = this.sinon.spy(card, 'destroy');
      var event = new CustomEvent('appterminated',
                                  { detail: deadApp });
      window.dispatchEvent(event);

      assert.isTrue(removeCardSpy.calledOnce, 'removeCard was called');
      assert.isTrue(destroySpy.calledOnce, 'card.destroy was called');
      assert.equal(cardsList.childNodes.length, 1);
    });
  });

  suite('exit >', function() {
    setup(function() {
      taskManager.hide();
    });

    test('locking the screen should trigger an exit', function() {
      this.sinon.spy(taskManager, 'exitToApp');
      this.sinon.spy(taskManager, 'hide');
      showTaskManager(this.sinon.clock);

      window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
      waitForEvent(window, 'cardviewclosed').then(function() {
        sinon.assert.callOrder(taskManager.exitToApp, taskManager.hide);
      }, failOnReject);
    });

    test('opening an attention screen should trigger an exit', function() {
      this.sinon.spy(taskManager, 'exitToApp');
      this.sinon.spy(taskManager, 'hide');
      showTaskManager(this.sinon.clock);

      window.dispatchEvent(new CustomEvent('attentionopened'));
      waitForEvent(window, 'cardviewclosed').then(function() {
        sinon.assert.callOrder(taskManager.exitToApp, taskManager.hide);
      }, failOnReject);
    });

    suite('when opening from the homescreen', function() {
      setup(function() {
        MockService.mockQueryWith('getHomescreen', home);
        MockService.mockQueryWith('AppWindowManager.getActiveWindow', home);
        MockStackManager.mCurrent = -1;
        showTaskManager(this.sinon.clock);
      });

      test('selected app is opened', function(done) {
        var targetApp = apps['http://game.gaiamobile.org'];
        var stub = this.sinon.stub(targetApp, 'open');

        waitForEvent(window, 'cardviewclosed').then(function() {
          assert.isTrue(stub.calledOnce, 'selected app open method was called');
        }, failOnReject)
        .then(function() { done(); }, done);

        taskManager.exitToApp(targetApp);
        fakeFinish(this.sinon.clock, targetApp);
      });

      test('no touch input handled while opening selected app', function(done) {
        var targetApp = apps['http://game.gaiamobile.org'];
        this.sinon.spy(taskManager, 'handleEvent');

        waitForEvent(window, 'cardviewclosed').then(function() {
          assert.isFalse(taskManager.handleEvent.called,
                         'handleEvent not called');
        }).then(function() { done(); }, done);

        taskManager.exitToApp(targetApp);
        var touchEvent = new CustomEvent('touchstart');
        taskManager.element.dispatchEvent(touchEvent);
        fakeFinish(this.sinon.clock, targetApp);
      });

      test('home should go back home', function(done) {
        var stub = this.sinon.stub(home, 'open');

        waitForEvent(window, 'cardviewclosed').then(function() {
          assert.isTrue(stub.calledOnce, 'home was opened');
        }, failOnReject)
        .then(function() { done(); }, done);

        MockService.mockQueryWith('getHomescreen', home);
        var event = new CustomEvent('home');
        taskManager.respondToHierarchyEvent(event);
        fakeFinish(this.sinon.clock, home);
      });
    });

    suite('when opening from an app', function() {
      setup(function() {
        MockService.mockQueryWith('AppWindowManager.getActiveWindow',
          apps['http://sms.gaiamobile.org']);
        MockStackManager.mCurrent = 0;
        showTaskManager(this.sinon.clock);
      });

      test('selected app is opened', function(done) {
        var targetApp = apps['http://game.gaiamobile.org'];
        var stub = this.sinon.stub(targetApp, 'open');

        waitForEvent(window, 'cardviewclosed').then(function() {
          assert.isTrue(stub.calledOnce, 'selected app open method was called');
        }, failOnReject)
        .then(function() { done(); }, done);

        taskManager.exitToApp(targetApp);
        fakeFinish(this.sinon.clock, targetApp);
      });

      test('when exitToApp is passed no app', function(done) {
        var activeApp =
          MockService.mockQueryWith('AppWindowManager.getActiveWindow');
        var stub = this.sinon.stub(activeApp, 'open');

        waitForEvent(window, 'cardviewclosed').then(function() {
          assert.isTrue(stub.calledOnce, 'active app open method was called');
        }, failOnReject)
        .then(function() { done(); }, done);

        taskManager.exitToApp();
        fakeFinish(this.sinon.clock, activeApp);
      });

      test('home should go back home', function(done) {
        var stub = this.sinon.stub(home, 'open');

        waitForEvent(window, 'cardviewclosed').then(function() {
          assert.isTrue(stub.calledOnce, 'home was opened');
        }, failOnReject)
        .then(function() { done(); }, done);

        var event = new CustomEvent('home');
        taskManager.respondToHierarchyEvent(event);
        fakeFinish(this.sinon.clock, home);
      });

      test('newStackPosition is defined when app is selected', function(done) {
        MockStackManager.mCurrent = 0;
        var targetApp = apps['http://game.gaiamobile.org'];

        waitForEvent(window, 'cardviewclosed').then(function(evt) {
          var stackPosition = taskManager.stack.indexOf(targetApp);
          assert.equal(evt.detail.newStackPosition,
                       stackPosition,
                       'current newStackPosition in event.detail');
          assert.equal(taskManager.newStackPosition,
                       stackPosition,
                       'current newStackPosition taskManager');
        }, failOnReject)
        .then(function() { done(); }, done);

        taskManager.exitToApp(targetApp);
        fakeFinish(this.sinon.clock, targetApp);
      });

    });
  });

  suite('filtering > ', function() {
    setup(function() {
      MockService.mockQueryWith('AppWindowManager.getActiveWindow',
        apps.browser2);
      MockStackManager.mCurrent = 0;
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps.browser1,
        apps['http://game.gaiamobile.org'],
        apps.browser2,
        apps['http://game2.gaiamobile.org']
      ];
      showTaskManager(this.sinon.clock, 'browser-only');
    });
    test('filter for browsers', function() {
      assert.equal(taskManager.stack.length, 2);
      assert.equal(taskManager.position, 1);
    });
    test('exitToApp sets newStackPosition correctly using a filtered stack',
    function(done) {
      var targetApp = apps.browser1;
      var expectedPosition = MockStackManager.mStack.indexOf(targetApp);
      var stub = this.sinon.stub(targetApp, 'open');

      waitForEvent(window, 'cardviewclosed').then(function(evt) {
        assert.isTrue(stub.calledOnce, 'selected app open method was called');
        assert.equal(evt.detail.newStackPosition, expectedPosition);
      }, failOnReject)
      .then(function() { done(); }, done);

      taskManager.exitToApp(targetApp);
      fakeFinish(this.sinon.clock, targetApp);
    });

    test('exitToApp given no app opens home', function(done) {
      var expectedPosition = -1;
      var stub = this.sinon.stub(apps.home, 'open');

      waitForEvent(window, 'cardviewclosed').then(function(evt) {
        assert.isTrue(stub.calledOnce, 'selected app open method was called');
        assert.equal(evt.detail.newStackPosition, expectedPosition);
      }, failOnReject)
      .then(function() { done(); }, done);

      taskManager.exitToApp();
      fakeFinish(this.sinon.clock, apps.home);
    });
  });

  suite('filtering > /w search role', function() {
    setup(function() {
      MockService.mockQueryWith('AppWindowManager.getActiveWindow',
        apps.search);
      MockStackManager.mCurrent = 1;
      MockStackManager.mStack = [
        apps.browser1,
        apps.search
      ];
      showTaskManager(this.sinon.clock, 'browser-only');
    });
    test('filter includes search app', function() {
      assert.equal(taskManager.stack.length, 2);
      assert.equal(taskManager.position, 1);
    });
  });

  suite('filtering > no matches ', function() {
    var stub, _filterName;
    setup(function() {
      taskManager.hide();
      MockService.mockQueryWith('AppWindowManager.getActiveWindow',
        apps['http://sms.gaiamobile.org']);
      _filterName = 'browser-only';
      stub = this.sinon.stub(taskManager, 'filter', function(filterName) {
          assert.equal(filterName, _filterName);
          taskManager.stack = [];
        });
    });

    test('filter function is called and empty stack is the result', function() {
      taskManager.show(_filterName);
      stub.calledWith([_filterName]);
      assert.isTrue(cardsView.classList.contains('empty'),
                    'Should be displaying no recent browser windows');
    });

    test('but apps should still enterTaskManager', function() {
      MockStackManager.mStack.forEach(function(app) {
        this.sinon.spy(app, 'enterTaskManager');
      }, this);

      taskManager.show(_filterName);

      MockStackManager.mStack.forEach(function(app) {
        sinon.assert.calledOnce(app.enterTaskManager);
      }, this);
    })  ;

  });

  suite('orientation', function() {
    var app;
    setup(function() {
      app = apps['http://sms.gaiamobile.org'];
      MockService.mockQueryWith('AppWindowManager.getActiveWindow', app);
      MockStackManager.mCurrent = 0;
    });

    test('lock orientation when showing', function() {
      var orientation = MockService.mockQueryWith('defaultOrientation');
      this.sinon.stub(screen, 'mozLockOrientation');
      showTaskManager(this.sinon.clock);
      assert.isTrue(screen.mozLockOrientation.calledWith(orientation));
    });

    suite('when the orientation need to change', function() {
      setup(function() {
        MockService.mockQueryWith('fetchCurrentOrientation',
          'landscape-primary');
      });

      test('should wait for a resize', function() {
        showTaskManager(this.sinon.clock);
        assert.isFalse(taskManager.isShown());
        window.dispatchEvent(new CustomEvent('resize'));
        this.sinon.clock.tick();
        assert.isTrue(taskManager.isShown());
      });
    });

    suite('when the orientation flips', function() {
      setup(function() {
        MockService.mockQueryWith('fetchCurrentOrientation',
          'portrait-secondary');
      });

      test('should just show', function() {
        showTaskManager(this.sinon.clock);
        assert.isTrue(taskManager.isShown());
      });
    });
  });
});
