/* global MockStackManager, MockNavigatorSettings, MockAppWindowManager,
          TaskManager, Card, TaskCard, AppWindow,
          MockSystem, MockScreenLayout, MocksHelper */
'use strict';
mocha.globals(['System', 'SettingsListener',
               'TaskManager', 'CardsHelper', 'Card', 'TaskCard', 'BaseUI']);

require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_system.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_rocketbar.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_app_window.js');


var mocksForTaskManager = new MocksHelper([
  'GestureDetector',
  'ScreenLayout',
  'TrustedUIManager',
  'UtilityTray',
  'AppWindowManager',
  'Rocketbar',
  'SleepMenu',
  'OrientationManager',
  'StackManager',
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
  throw err;
}

suite('system/TaskManager >', function() {
  var fakeInnerHeight = 200;

  var screenNode, realMozLockOrientation, realScreenLayout, realMozSettings,
      realSettingsListener;
  var cardsView, cardsList;
  var originalSystem;
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

  var apps;
  var sms, game, game2, game3, game4;
  var taskManager;

  mocksForTaskManager.attachTestHelpers();
  suiteSetup(function cv_suiteSetup(done) {
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

    originalSystem = window.System;
    window.System = MockSystem;
    screenNode = document.createElement('div');
    screenNode.id = 'screen';
    cardsView = document.createElement('div');
    cardsView.id = 'cards-view';

    cardsList = document.createElement('ul');
    cardsList.id = 'cards-list';
    cardsView.appendChild(cardsList);

    screenNode.appendChild(cardsView);
    document.body.appendChild(screenNode);
    realScreenLayout = window.ScreenLayout;
    window.ScreenLayout = MockScreenLayout;
    realMozLockOrientation = screen.mozLockOrientation;
    screen.mozLockOrientation = function() {};

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
    window.System = originalSystem;
    screenNode.parentNode.removeChild(screenNode);
    window.ScreenLayout = realScreenLayout;
    screen.mozLockOrientation = realMozLockOrientation;
    navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
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

  suite('settings > ', function() {

    teardown(function() {
      taskManager.hide(true);
      cardsList.innerHTML = '';
    });

    test('isRocketbar tracks rocketbar.enabled setting', function() {
      // var withRocketBar = new TaskManager();
      MockNavigatorSettings.mTriggerObservers('rocketbar.enabled',
                                              { settingValue: true });
      assert.isTrue(taskManager.isRocketbar,
                    'isRocketbar is true when setting goes true');

      taskManager.isRocketbar = true;
      MockNavigatorSettings.mTriggerObservers('rocketbar.enabled',
                                              { settingValue: false });
      assert.isFalse(taskManager.isRocketbar,
                    'isRocketbar is false when setting goes false');
    });

    test('creates Card instances when isRocketbar is false', function(){
      taskManager.isRocketbar = false;
      taskManager.addCard(0, apps['http://sms.gaiamobile.org']);
      var card = taskManager.getCardAtIndex(0);
      assert.ok(card && card instanceof Card,
                'creates Card instances when isRocketbar is false');
    });

    test('creates TaskCard instances when isRocketbar is true', function(){
      taskManager.isRocketbar = true;
      taskManager.addCard(0, apps['http://sms.gaiamobile.org']);
      var card = taskManager.getCardAtIndex(0);
      assert.ok(card && card instanceof TaskCard,
                'creates TaskCard instances when isRocketbar is true');
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
      MockStackManager.mCurrent = 0;

      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mDisplayedApp = 'http://sms.gaiamobile.org';
    });

    suite('display cardsview >', function() {
      setup(function(done) {
        taskManager.hide(true);
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        taskManager.isRocketbar = false;
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

      test('cardsview should be active', function() {
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
    });

    suite('display cardsview via holdhome >', function() {
      setup(function(done) {
        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
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
    });

    suite('populated task manager in rocketbar >', function() {
      setup(function(done) {
        taskManager.isRocketbar = true;
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

    test('when isRocketbar is true, empty task manager closes', function(done) {
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
      taskManager.isRocketbar = true;
      taskManager.show();
    });

    test('when isRocketbar is false, empty task manager opens', function(done) {
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
      taskManager.isRocketbar = false;
      taskManager.show();
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
      taskManager.isRocketbar = false;
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
      waitForEvent(window, 'cardviewclosed').then(function(event) {
        assert.equal(typeof event.detail, 'object',
                    'gets event with detail object');
        assert.equal(event.detail.newStackPosition, 0,
                    'newStackPosition is the position passed to hide method');
        done();
      }, failOnReject);
      taskManager.hide(true, 0);
    });

    test('hide: removes cards', function(done) {
      waitForEvent(window, 'cardviewclosed').then(function(event) {
        assert.equal(cardsList.childNodes.length, 0,
                    'all card elements are gone');
        assert.equal(Object.keys(taskManager.cardsByOrigin).length, 0,
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
      taskManager.isRocketbar = false;
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
      taskManager.isRocketbar = true;
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

    test('removes the card for that app', function() {
      var card = taskManager.getCardAtIndex(0);
      var removeCardStub = this.sinon.stub(taskManager, 'removeCard');

      taskManager.closeApp(card);
      assert.isTrue(removeCardStub.calledOnce);
    });

    test('destroys the card', function() {
      var card = taskManager.getCardAtIndex(0);
      assert.isTrue(card && card.element &&
                    card.element.parentNode == taskManager.cardsList);
      var destroySpy = this.sinon.spy(card, 'destroy');

      taskManager.closeApp(card);
      assert.isTrue(destroySpy.calledOnce);
      assert.equal(cardsList.childNodes.length, 1);
      assert.isFalse('http://sms.gaiamobile.org' in taskManager.cardsByOrigin);
    });
  });
});

mocha.setup({ignoreLeaks: false});
