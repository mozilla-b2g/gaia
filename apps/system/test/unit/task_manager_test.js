/* global MockStackManager, MockNavigatorSettings, MockAppWindowManager,
          TaskManager, Card, TaskCard, AppWindow, HomescreenLauncher,
          HomescreenWindow, MockScreenLayout, MocksHelper, MockL10n */
'use strict';
require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/test/unit/mock_homescreen_window.js');
require('/shared/test/unit/mocks/mock_system.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_rocketbar.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_app_window.js');
require('/shared/js/tagged.js');

var mocksForTaskManager = new MocksHelper([
  'GestureDetector',
  'ScreenLayout',
  'TrustedUIManager',
  'UtilityTray',
  'AppWindowManager',
  'Rocketbar',
  'sleepMenu',
  'HomescreenLauncher',
  'OrientationManager',
  'StackManager',
  'HomescreenWindow',
  'AppWindow',
  'System'
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

  var screenNode, realMozLockOrientation, realScreenLayout, realMozSettings,
      realSettingsListener;
  var cardsView, cardsList, cardsNoWindows;
  var originalLockScreen;
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
    window.dispatchEvent(evt);
  }

  function sendAppopen(detail) {
    detail = detail || {
      manifestURL: 'http://sms.gaiamobile.org/manifest.webapp',
      origin: 'http://sms.gaiamobile.org',
      isHomescreen: false
    };
    var evt = new CustomEvent('appopen', { detail: detail });
    window.dispatchEvent(evt);
  }

  function sendAppTerminated(detail) {
    detail = detail || {
      manifestURL: 'http://sms.gaiamobile.org/manifest.webapp',
      origin: 'http://sms.gaiamobile.org',
      isHomescreen: false
    };
    var evt = new CustomEvent('appterminated', { detail: detail });
    window.dispatchEvent(evt);
  }

  var apps, home;
  var sms, game, game2, game3, game4;
  var taskManager;
  var realL10n;

  mocksForTaskManager.attachTestHelpers();
  suiteSetup(function cv_suiteSetup(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    apps = {
      'http://sms.gaiamobile.org': new AppWindow({
        launchTime: 5,
        name: 'SMS',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
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
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
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
      'http://game2.gaiamobile.org': new AppWindow({
        launchTime: 3,
        name: 'GAME2',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
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
      'http://game3.gaiamobile.org': new AppWindow({
        launchTime: 2,
        name: 'GAME3',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape'
        },
        rotatingDegree: 90,
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://game3.gaiamobile.org',
        blur: function() {}
      }),
      'http://game4.gaiamobile.org': new AppWindow({
        launchTime: 1,
        name: 'GAME4',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'portrait-secondary'
        },
        rotatingDegree: 180,
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://game4.gaiamobile.org',
        blur: function() {}
      }),
      'search': new AppWindow({
        name: 'search',
        element: document.createElement('div'),
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
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
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
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
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
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
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
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

    game3 = new AppWindow({
      instanceID: 'AppWindow-3',
      launchTime: 5,
      name: 'GAME3',
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 90,
      origin: 'http://game3.gaiamobile.org',
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      blur: function() {}
    });

    game4 = new AppWindow({
      instanceID: 'AppWindow-4',
      launchTime: 5,
      name: 'GAME4',
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 180,
      origin: 'http://game4.gaiamobile.org',
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

    cardsNoWindows = document.createElement('span');
    cardsNoWindows.id = 'cards-no-recent-windows';
    cardsView.appendChild(cardsNoWindows);

    screenNode.appendChild(cardsView);
    document.body.appendChild(screenNode);
    realScreenLayout = window.ScreenLayout;
    window.ScreenLayout = MockScreenLayout;
    realMozLockOrientation = screen.mozLockOrientation;
    screen.mozLockOrientation = sinon.stub();

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

    home = new HomescreenWindow('fakeHome');
    var homescreenLauncher = new HomescreenLauncher();
    window.homescreenLauncher = homescreenLauncher;
    window.homescreenLauncher.start();
    homescreenLauncher.mFeedFixtures({
      mHomescreenWindow: home,
      mOrigin: 'fakeOrigin',
      mReady: true
    });

    requireApp('system/js/cards_helper.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/card.js');
    requireApp('system/js/task_card.js');

    requireApp('system/js/task_manager.js', function() {
      // normally done by bootstrap
      taskManager = new TaskManager();
      taskManager.start();
      done();
    });

  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'innerHeight', ihDescriptor);
    window.lockScreen = originalLockScreen;
    screenNode.parentNode.removeChild(screenNode);
    window.ScreenLayout = realScreenLayout;
    screen.mozLockOrientation = realMozLockOrientation;
    navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
    navigator.mozL10n = realL10n;

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
      var taskCard = new TaskCard();
      assert.ok(card && card instanceof window.Card,
                  'Card instantiation');
      assert.ok(taskCard && taskCard instanceof window.TaskCard,
                  'TaskCard instantiation');
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

    teardown(function() {
      taskManager.hide(true);
      cardsList.innerHTML = '';
    });

    test('isTaskStrip tracks taskstrip.enabled setting', function() {
      // var withRocketBar = new TaskManager();
      MockNavigatorSettings.mTriggerObservers('taskstrip.enabled',
                                              { settingValue: true });
      assert.isTrue(taskManager.isTaskStrip,
                    'isTaskStrip is true when setting goes true');

      taskManager.isTaskStrip = true;
      MockNavigatorSettings.mTriggerObservers('taskstrip.enabled',
                                              { settingValue: false });
      assert.isFalse(taskManager.isTaskStrip,
                    'isTaskStrip is false when setting goes false');
    });

    test('creates Card instances when isTaskStrip is false', function(){
      taskManager.isTaskStrip = false;
      var app = apps['http://sms.gaiamobile.org'];
      taskManager.addCard(0, app);
      var card = taskManager.cardsByAppID[app.instanceID];
      assert.ok(card && card instanceof Card,
                'creates Card instances when isTaskStrip is false');
    });

    test('creates TaskCard instances when isTaskStrip is true', function(){
      taskManager.isTaskStrip = true;
      var app = apps['http://sms.gaiamobile.org'];
      taskManager.addCard(0, app);
      var card = taskManager.cardsByAppID[app.instanceID];
      assert.ok(card && card instanceof TaskCard,
                'creates TaskCard instances when isTaskStrip is true');
    });

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
    suiteTeardown(function() {
      taskManager.hide(true);
      cardsList.innerHTML = '';
    });

    suiteSetup(function() {
      MockStackManager.mStack = [];
      for (var app in apps) {
        MockStackManager.mStack.push(apps[app]);
      }
      apps.home = home;
      MockStackManager.mCurrent = 0;

      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mActiveApp = apps['http://sms.gaiamobile.org'];
    });

    suite('display cardsview >', function() {
      setup(function(done) {
        taskManager.hide(true);
        MockAppWindowManager.mActiveApp = apps['http://sms.gaiamobile.org'];
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        taskManager.isTaskStrip = false;
        taskManager.show();
      });

      teardown(function() {
        taskManager.hide(true);
      });

      test('fetch elements', function() {
        assert.equal(taskManager.element, cardsView);
        assert.equal(taskManager.cardsList, cardsList);
        assert.equal(taskManager.screenElement, screenNode);
      });

      test('cardsview should be active after receiving appclosed', function() {
        window.dispatchEvent(new CustomEvent('appclosed'));
        assert.isTrue(taskManager.isShown(), 'taskManager.isShown');
        assert.isTrue(screenNode.classList.contains('cards-view'));
      });

      // Bug 1080362
      test('cardsview class not present after multiple appclosed', function() {
        window.dispatchEvent(new CustomEvent('appclosed'));
        assert.isTrue(screenNode.classList.contains('cards-view'));

        taskManager.hide(true);
        assert.isFalse(screenNode.classList.contains('cards-view'));

        window.dispatchEvent(new CustomEvent('appclosed'));
        assert.isFalse(screenNode.classList.contains('cards-view'));
      });

      test('cardsview should be active when active app is null', function() {
        MockAppWindowManager.mActiveApp = null;
        taskManager.show();
        assert.isTrue(taskManager.isShown(), 'taskManager.isShown');
        assert.isTrue(screenNode.classList.contains('cards-view'));
      });

      test('cardsview should be active when active app is null', function() {
        MockAppWindowManager.mActiveApp = null;
        taskManager.show();
        assert.isTrue(taskManager.isShown(), 'taskManager.isShown');
        assert.isTrue(screenNode.classList.contains('cards-view'));
      });

      test('cardsview should be active, close homescreen if active app ' +
           'is homescreen', function() {
        MockAppWindowManager.mActiveApp = {
          isHomescreen: true,
          close: function() {}
        };
        var stubClose = this.sinon.stub(MockAppWindowManager.mActiveApp,
          'close');
        taskManager.show();
        assert.isTrue(stubClose.calledOnce);
        assert.isTrue(taskManager.isShown(), 'taskManager.isShown');
        assert.isTrue(screenNode.classList.contains('cards-view'));
      });

      test('cardsview shouldnt display no recent apps message', function() {
        assert.isFalse(cardsView.classList.contains('empty'));
      });

      test('initial state', function() {
        assert.equal(taskManager.currentPosition, 0,
                    'initial position should be 0');
        assert.equal(taskManager.currentDisplayed, 0, 0,
                    'currentDisplayed should be 0');
        assert.ok(taskManager.currentCard,
                  'has a truthy currentCard property');
        assert.ok(taskManager.nextCard,
                  'has a truthy nextCard property');
        assert.ok(!taskManager.prevCard,
                  'has no prevCard at initial position');
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

      test('wheel up event', function() {
        var card = taskManager.getCardAtIndex(0);
        var closeAppStub = this.sinon.stub(taskManager, 'closeApp');
        var alignCurrentCardStub = this.sinon.stub(taskManager,
          'alignCurrentCard');

        taskManager.handleEvent({
          type: 'wheel',
          deltaMode: 2,
          DOM_DELTA_PAGE: 2,
          deltaY: 1
        });
        assert.isTrue(closeAppStub.called);
        assert.isTrue(closeAppStub.calledWith(card));
        assert.isTrue(alignCurrentCardStub.called);
      });

      test('wheel left/right event', function() {
        var alignCurrentCardSpy = this.sinon.spy(taskManager,
          'alignCurrentCard');

        assert.equal(taskManager.currentPosition, 0);
        taskManager.handleEvent({
          type: 'wheel',
          deltaMode: 2,
          DOM_DELTA_PAGE: 2,
          deltaX: 1
        });
        assert.equal(taskManager.currentPosition, 1);

        taskManager.handleEvent({
          type: 'wheel',
          deltaMode: 2,
          DOM_DELTA_PAGE: 2,
          deltaX: -1
        });
        assert.equal(taskManager.currentPosition, 0);

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
        el.dispatchEvent(createTouchEvent('touchmove', el, 0, 500));
        el.dispatchEvent(createTouchEvent('touchmove', el, 50, 500));
        el.dispatchEvent(createTouchEvent('touchend', el, 100, 500));

        assert.isTrue(currentCard == taskManager.currentCard,
                      'current card remains unchanged');
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

        test('currentPosition should be the last position in the stack',
        function() {
          assert.equal(taskManager.currentPosition, 2);
        });
      });
    });

    suite('display cardsview via holdhome >', function() {
      setup(function(done) {
        var sms = apps['http://sms.gaiamobile.org'];
        MockStackManager.mStack = [sms];
        MockStackManager.mCurrent = 0;
        MockAppWindowManager.mActiveApp = sms;

        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
        this.sinon.spy(sms, 'getScreenshot');

        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        sendHoldhome();
      });

      teardown(function() {
        taskManager.hide(true);
      });

      test('cardsview should be active', function() {
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());
      });
      test('non-browser app had its getScreenshot method called', function() {
        assert.isTrue(MockAppWindowManager.mActiveApp.getScreenshot.called);
      });
    });

    suite('display browser in cardsview via holdhome >', function() {
      setup(function(done) {
        var browser = apps.search;
        MockStackManager.mStack = [browser];
        MockStackManager.mCurrent = 0;
        MockAppWindowManager.mActiveApp = browser;

        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
        this.sinon.spy(browser, 'getScreenshot');
        this.sinon.stub(taskManager, 'show', function() {
          done();
        });
        sendHoldhome();
      });

      teardown(function() {
        taskManager.hide(true);
      });

      test('browser sheet didnt have getScreenshot method called', function() {
        assert.isFalse(MockAppWindowManager.mActiveApp.getScreenshot.called);
      });
    });

    suite('populated task manager in rocketbar >', function() {
      setup(function(done) {
        taskManager.isTaskStrip = true;
        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        taskManager.show();
      });

      teardown(function() {
        taskManager.hide(true);
      });

      test('has correct classes', function() {
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(screenNode.classList.contains('task-manager'));
      });

    });

  });

  suite('empty task manager >', function() {
    setup(function() {
      MockStackManager.mStack = [];
      MockStackManager.mCurrent = -1;
    });

    teardown(function() {
      taskManager.hide(true);
    });

    test('when isTaskStrip is true, empty task manager closes', function(done) {
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
                    'cardviewclosed',
                    'cardviewclosed event raised when shown with empty stack');
        assert.isFalse(cardsView.classList.contains('active'));
        assert.isFalse(taskManager.isShown());
        done();
      }, failOnReject);
      // Haida/rocketbar mode: taskManager aborts show when empty
      taskManager.isTaskStrip = true;
      taskManager.show();
    });

    test('when isTaskStrip is false, empty task manager opens', function(done) {
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
      taskManager.isTaskStrip = false;
      taskManager.show();
    });

    suite('display empty cardsview >', function() {
      setup(function(done) {
        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        taskManager.show();
      });

      test('on touchstart, empty cardsview is closed and back to home screen',
      function(done) {
        var events = [];
        assert.isTrue(cardsView.classList.contains('empty'));
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());

        waitForEvent(window, 'cardviewclosedhome').then(function(){
          events.push('cardviewclosedhome');
        }, failOnReject).then(function() {
          assert.equal(events.length, 1, 'sanity check, only 1 event received');
          assert.equal(events[0],
                      'cardviewclosedhome',
                      'cardviewclosedhome event raised when touch starts');
          assert.isFalse(cardsView.classList.contains('active'));
          assert.isFalse(taskManager.isShown());
        }, failOnReject)
        .then(function() {done(); }, function() {done(); });

        cardsView.dispatchEvent(
          createTouchEvent('touchstart', cardsView, 100, 100));
      });
    });
  });

  suite('hide > ', function() {
    setup(function(done) {
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps['http://game.gaiamobile.org']
      ];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mDisplayedApp = 'http://sms.gaiamobile.org';

      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.isTaskStrip = false;
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide(false);
      cardsList.innerHTML = '';
    });

    test('taskManager should not be active', function() {
      taskManager.hide(true);
      assert.isFalse(taskManager.isShown(), 'isShown is false');
      assert.isFalse(cardsView.classList.contains('active'),
                    'no .active class');
    });

    test('removes classes', function() {
      taskManager.hide(true);
      assert.isFalse(screenNode.classList.contains('task-manager'));
      assert.isFalse(screenNode.classList.contains('cards-view'));
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
      taskManager.hide(true);
    });

    test('hide: removes cards', function(done) {
      waitForEvent(window, 'cardviewclosed').then(function(event) {
        assert.equal(cardsList.childNodes.length, 0,
                    'all card elements are gone');
        assert.equal(Object.keys(taskManager.cardsByAppID).length, 0,
                    'cards lookup is empty');
        done();
      }, failOnReject);
      taskManager.hide(true);
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
      taskManager.hide(true);
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
    });
    test('setActive false', function(done) {
      // setActive(false) should fire cardsviewbeforeclose event
      waitForEvent(window, 'cardviewbeforeclose').then(function(event) {
        assert.isFalse(cardsView.classList.contains('active'));
        assert.isFalse(taskManager.isShown(), 'isShown is false');
        done();
      }, failOnReject);
      // minimal-setup
      cardsView.classList.add('active');
      taskManager.setActive(false);
    });
  });

  suite('one app is displayed >', function() {
    setup(function(done) {
      MockStackManager.mStack = [apps['http://sms.gaiamobile.org']];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org']
      };
      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.isTaskStrip = false;
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide(true);
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
    var displayStub;

    setup(function(done) {
      MockStackManager.mStack = [apps['http://sms.gaiamobile.org']];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org']
      };

      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.isTaskStrip = true;
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide(true);
      displayStub.restore();
    });

    test('displays the new app before dismissing the task manager',
    function(done) {
      var target = cardsList.firstElementChild;
      var fakeEvent = {
        type: 'tap',
        target: target
      };

     waitForEvent(window, 'cardviewclosed').then(function(evt) {
        assert.ok(evt.detail && !isNaN(evt.detail.newStackPosition),
                  'cardviewclosed evt has new position detail');
        done();
      }, failOnReject);

      // stub the display method to fire the 'appopen' event normally
      // triggered by the transition controller
      displayStub = sinon.stub(MockAppWindowManager, 'display', function() {
        setTimeout(function() {
          displayStub.restore();
          sendAppopen(MockStackManager.mStack[0]);
        });
      });
      taskManager.handleEvent(fakeEvent);
    });
  });
  suite('closeApp', function() {
    setup(function(done) {
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps['http://game.gaiamobile.org']
      ];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org'],
        'http://game.gaiamobile.org': apps['http://game.gaiamobile.org']
      };
      sinon.stub(apps['http://sms.gaiamobile.org'], 'kill', function() {
        sendAppTerminated(this);
      });
      sinon.stub(apps['http://game.gaiamobile.org'], 'kill', function() {
        sendAppTerminated(this);
      });

      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.isTaskStrip = false;
      taskManager.show();
    });
    teardown(function() {
      apps['http://sms.gaiamobile.org'].kill.restore();
      apps['http://game.gaiamobile.org'].kill.restore();
      taskManager.hide(true);
      cardsList.innerHTML = '';
    });

    test('removes the card for that app', function() {
      var card = taskManager.getCardAtIndex(0);
      var removeCardStub = this.sinon.stub(taskManager, 'removeCard');

      taskManager.closeApp(card);
      assert.isTrue(removeCardStub.calledOnce);
    });

    test('destroys the card', function() {
      var card = taskManager.getCardAtIndex(0);
      var destroySpy = this.sinon.spy(card, 'destroy');
      assert.isTrue(card && card.element &&
                    card.element.parentNode == taskManager.cardsList);
      var instanceID = card.app.instanceID;
      taskManager.closeApp(card);
      assert.isTrue(destroySpy.calledOnce);
      assert.equal(cardsList.childNodes.length, 1);
      assert.isFalse(instanceID in taskManager.cardsByAppID);
    });
  });

  suite('app is killed', function() {
    setup(function(done) {
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps['http://game.gaiamobile.org']
      ];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org'],
        'http://game.gaiamobile.org': apps['http://game.gaiamobile.org']
      };

      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.isRocketbar = false;
      taskManager.show();
    });
    teardown(function() {
      taskManager.hide(true);
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

  suite('event handling while hidden', function() {
    setup(function() {
      taskManager.hide(true);
    });
    // to listen for while hidden
    ['holdhome', 'taskmanagershow'].forEach(function(name) {
      test('ignore ' + name + ' events', function() {
        this.sinon.spy(taskManager, 'handleEvent');
        this.sinon.stub(taskManager, 'show');
        var evt = new CustomEvent(name, { });
        window.dispatchEvent(evt);
        assert.isTrue(taskManager.handleEvent.called,
                      name + ' event wasnt handled');
        assert.isTrue(taskManager.show.called,
                      name + ' event didnt trigger taskManager.show');
      });
    }, this);

    // to ignore while hidden
    ['appopen', 'appterminated', 'appopen', 'lockscreen-appopened',
     'tap', 'wheel', 'opencurrentcard'].forEach(function(name) {
      test('ignore ' + name + ' events', function() {
        this.sinon.spy(taskManager, 'handleEvent');
        this.sinon.stub(taskManager, 'exitToApp');
        var evt = new CustomEvent(name, { });
        window.dispatchEvent(evt);
        assert.isFalse(taskManager.handleEvent.called,
                       name + ' event was handled');
        assert.isFalse(taskManager.exitToApp.called,
                       name + ' caused exitToApp to be called');
      });
    }, this);
  });

  suite('event handling while shown', function() {
    var sms, game;
    setup(function(done) {
      taskManager.hide(true);
      sms = apps['http://sms.gaiamobile.org'];
      game = apps['http://game.gaiamobile.org'];
      MockStackManager.mStack = [ sms, game ];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': sms,
        'http://game.gaiamobile.org': game
      };

      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.isTaskStrip = false;
      taskManager.show();
    });

    // exit points while showing
    [
      'opencurrentcard',
      'home',
      'lockscreen-appopened',
      'attentionopened'
    ].forEach(function(name) {
      test('handle ' + name + ' events', function() {
        this.sinon.spy(taskManager, 'handleEvent');
        this.sinon.stub(taskManager, 'exitToApp');
        var evt = new CustomEvent(name, { });
        window.dispatchEvent(evt);
        assert.isTrue(taskManager.handleEvent.called,
                       name + ' event was handled');
        assert.isTrue(taskManager.exitToApp.calledOnce,
                       name + ' caused exitToApp to be called');
      });
    }, this);

    // other events we expect to be handled while showing
    ['appterminated', 'tap', 'wheel'].forEach(function(name) {
      test('handle ' + name + ' events', function() {
        this.sinon.stub(taskManager, 'handleEvent');
        var evt = new CustomEvent(name, { });
        window.dispatchEvent(evt);
        assert.isTrue(taskManager.handleEvent.called,
                       name + ' event was handled');
      });
    }, this);

    // ensure lockscreen-appopened and attentionopened cause
    // exit to last app
    ['lockscreen-appopened', 'attentionopened'].forEach(function(name) {
      test('exit to last app on ' + name, function(done) {
        this.sinon.spy(taskManager, 'exitToApp');
        this.sinon.stub(sms, 'open', function() {
          done(function() {
            assert.isTrue(taskManager.exitToApp.calledWith(sms),
                          name + ' exitToApp called with last app');
            assert.isTrue(sms.open.calledOnce,
                          name + ' resulted in opening last app');
          });
        });
        var evt = new CustomEvent(name, { });
        window.dispatchEvent(evt);
      });
    }, this);

  });

  suite('exit >', function() {
    setup(function(done) {
      taskManager.hide(true);
      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mActiveApp = apps['http://sms.gaiamobile.org'];
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.isTaskStrip = false;
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide(true);
    });

    test('selected app is opened', function(done) {
      var targetApp = apps['http://game.gaiamobile.org'];
      var stub = this.sinon.stub(targetApp, 'open');

      waitForEvent(window, 'cardviewclosed').then(function() {
        assert.isTrue(stub.calledOnce, 'selected app open method was called');
      }, failOnReject)
      .then(function() { done(); }, done);

      taskManager.exitToApp(targetApp);
    });

    test('when exitToApp is passed no app', function(done) {
      // See bug 1071852, in v2.1 'home' button should always open homescreen
      var stub = this.sinon.stub(apps.home, 'open');

      waitForEvent(window, 'cardviewclosed').then(function() {
        assert.isTrue(stub.calledOnce, 'homescreen open method was called');
      }, failOnReject)
      .then(function() { done(); }, done);

      taskManager.exitToApp();
    });

    test('home app is opened on home event', function(done) {
      var stub = this.sinon.stub(apps.home, 'open');

      waitForEvent(window, 'cardviewclosed').then(function() {
        assert.isTrue(stub.calledOnce, 'active app open method was called');
      }, failOnReject)
      .then(function() { done(); }, done);

      var event = new CustomEvent('home');
      window.dispatchEvent(event);
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
                     'current newStackPosition taskManaget');
      }, failOnReject)
      .then(function() { done(); }, done);

      taskManager.exitToApp(targetApp);
    });

  });

  suite('filtering > ', function() {
    suiteSetup(function() {
      var isShownStub = sinon.stub(taskManager, 'isShown', function() {
        return true;
      });
      taskManager.hide(true);
      isShownStub.restore();
    });
    setup(function() {
      taskManager.hide(true);
      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mActiveApp = apps['http://sms.gaiamobile.org'];
      taskManager.isTaskStrip = false;
    });

    teardown(function() {
      taskManager.hide(true);
    });

    test('filtered class', function() {
      // test without, then with
      window.dispatchEvent(new CustomEvent('taskmanagershow', {}));

      assert.isFalse(taskManager.element.classList.contains('filtered'));

      this.sinon.stub(taskManager, 'show');
      this.sinon.stub(taskManager, 'isShown', function() {
        return true;
      });

      var evt = new CustomEvent('taskmanagershow', { detail: {
        filter: 'browser-only'
      }});
      window.dispatchEvent(evt);

      assert.isTrue(taskManager.element.classList.contains('filtered'));

      taskManager.hide(true);

      assert.isFalse(taskManager.element.classList.contains('filtered'));
    });

    test('filtered cardviewbeforeshow', function(done) {
      waitForEvent(window, 'cardviewbeforeshow', function(evt) {
        assert.equal(evt.detail, 'browser-only',
                    'event detail is "browser-only"');
      }).then(function() { done(); }, function() { done(); });

      var evt = new CustomEvent('taskmanagershow', { detail: {
        filter: 'browser-only'
      }});
      window.dispatchEvent(evt);
    });

    test('filter function is called and empty stack is the result',
    function(done) {
      var _filterName = 'browser-only';
      var stub = this.sinon.stub(taskManager, 'filter', function(filterName) {
        assert.equal(filterName, _filterName);
        taskManager.stack = [];
      });

      waitForEvent(window, 'cardviewshown').then(
        function() {
          stub.calledWith([_filterName]);
          assert.isTrue(cardsView.classList.contains('empty'),
                        'Should be displaying no recent browser windows');
          done();
        }, failOnReject);

      taskManager.show(_filterName);
    });

    test('filter still calls enter/leaveTaskManager on all apps',
    function(done) {
      var _filterName = 'browser-only';
      var app = apps['http://sms.gaiamobile.org'];
      var enterStub = this.sinon.stub(app, 'enterTaskManager');
      var leaveStub = this.sinon.stub(app, 'leaveTaskManager');

      waitForEvent(window, 'cardviewshown').then(
        function() {
          assert.isTrue(enterStub.calledOnce);
          taskManager.exitToApp();
        }, failOnReject);

      waitForEvent(window, 'cardviewclosed').then(
        function() {
          assert.isTrue(leaveStub.calledOnce);
          done();
        }, failOnReject);

      taskManager.show(_filterName);
    });

  });

  suite('filtering > /w search role', function() {
    setup(function() {
      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mActiveApp = apps.search;
      MockStackManager.mCurrent = 0;
      MockStackManager.mStack = [
        apps.search
      ];
      var _filterName = 'browser-only';
      taskManager.show(_filterName);
    });
    test('filter includes search app', function() {
      assert.equal(taskManager.stack.length, 1);
      assert.equal(taskManager.currentPosition, 0);
    });
  });

});
