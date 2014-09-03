/* global MockStackManager, MockNavigatorSettings, MockAppWindowManager,
          TaskManager, Card, AppWindow, HomescreenLauncher,
          HomescreenWindow, MocksHelper */

'use strict';

requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');

require('/shared/test/unit/mocks/mock_system.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

var mocksForTaskManager = new MocksHelper([
  'TrustedUIManager',
  'AppWindowManager',
  'HomescreenLauncher',
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

  var screenNode, realMozSettings, realSettingsListener;
  var cardsView, cardsList;
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

  var apps, home;
  var sms, game, game2, game3, game4;
  var taskManager;

  mocksForTaskManager.attachTestHelpers();
  suiteSetup(function cv_suiteSetup(done) {
    apps = {
      'http://sms.gaiamobile.org': new AppWindow({
        launchTime: 5,
        name: 'SMS',
        element: document.createElement('div'),
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
        element: document.createElement('div'),
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
        element: document.createElement('div'),
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
        element: document.createElement('div'),
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
        element: document.createElement('div'),
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
      element: document.createElement('div'),
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
      element: document.createElement('div'),
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
      element: document.createElement('div'),
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
      element: document.createElement('div'),
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
      element: document.createElement('div'),
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

      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mActiveApp = apps['http://sms.gaiamobile.org'];
    });

    suite('display cardsview >', function() {
      var realRAF;
      suiteSetup(function() {
        realRAF = window.mozRequestAnimationFrame;

        window.mozRequestAnimationFrame = function(cb) {
          cb();
        };
      });

      suiteTeardown(function() {
        window.mozRequestAnimationFrame = realRAF;
      });

      setup(function(done) {
        MockAppWindowManager.mActiveApp = apps['http://sms.gaiamobile.org'];
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        taskManager.show();
        window.dispatchEvent(new CustomEvent('appclosed'));
      });

      teardown(function() {
        taskManager.hide();
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
        assert.equal(card.element.style.display, 'block');

        var farAway = taskManager.getCardAtIndex(3);
        assert.equal(farAway.element.style.display, 'none');
      });

      test('and shown when needed', function() {
        taskManager.position = 3;
        taskManager.alignCurrentCard();
        var card = taskManager.getCardAtIndex(0);
        assert.equal(card.element.style.display, 'none');

        var farAway = taskManager.getCardAtIndex(3);
        assert.equal(farAway.element.style.display, 'block');
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
        this.sinon.useFakeTimers();
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
        taskManager.hide();
      });

      test('cardsview should be active', function() {
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());
      });
    });

    suite('populated task manager in rocketbar >', function() {
      setup(function(done) {
        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        taskManager.show();
      });

      teardown(function() {
        taskManager.hide();
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

    teardown(function() {
      taskManager.hide();
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

        waitForEvent(window, 'cardviewclosed').then(function(){
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
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide();
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
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide();
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
    setup(function(done) {
      MockStackManager.mStack = [apps['http://sms.gaiamobile.org']];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org']
      };

      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide();
    });

    test('displays the new app before dismissing the task manager',
    function(done) {
     waitForEvent(window, 'cardviewclosed').then(function(evt) {
        assert.ok(evt.detail && !isNaN(evt.detail.newStackPosition),
                  'cardviewclosed evt has new position detail');
        done();
      }, failOnReject);

      var app = MockStackManager.mStack[0];
      this.sinon.stub(app, 'open', function() {
        setTimeout(function() {
          sendAppopen(app);
        });
      });

      var target = cardsList.firstElementChild;
      taskManager.handleTap({ target: target });
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
      taskManager.show();
    });
    teardown(function() {
      taskManager.hide();
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
      taskManager.hide();
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
    setup(function(done) {
      this.sinon.useFakeTimers();
      taskManager.hide();
      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mActiveApp = apps['http://sms.gaiamobile.org'];
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.show();
      window.dispatchEvent(new CustomEvent('appclosed'));
      this.sinon.clock.tick();
    });

    teardown(function() {
      this.sinon.clock.tick(500); // safety timeout
      taskManager.hide();
    });

    function fakeFinish(clock, app) {
      clock.tick(100); // smooth timeout
      app.element.dispatchEvent(new CustomEvent('_opened'));
      clock.tick(); // timeout before close event is dispatched
    }

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
      var activeApp = MockAppWindowManager.mActiveApp;
      var stub = this.sinon.stub(activeApp, 'open');

      waitForEvent(window, 'cardviewclosed').then(function() {
        assert.isTrue(stub.calledOnce, 'active app open method was called');
      }, failOnReject)
      .then(function() { done(); }, done);

      taskManager.exitToApp();
      fakeFinish(this.sinon.clock, activeApp);
    });

    test('active app is opened on home event', function(done) {
      var activeApp = MockAppWindowManager.mActiveApp;
      var stub = this.sinon.stub(activeApp, 'open');

      waitForEvent(window, 'cardviewclosed').then(function() {
        assert.isTrue(stub.calledOnce, 'active app open method was called');
      }, failOnReject)
      .then(function() { done(); }, done);

      var event = new CustomEvent('home');
      window.dispatchEvent(event);
      fakeFinish(this.sinon.clock, activeApp);
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

  suite('filtering > ', function() {
    var stub, _filterName;
    setup(function() {
      taskManager.hide();
      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mActiveApp = apps['http://sms.gaiamobile.org'];
      _filterName = 'browser-only';
      stub = this.sinon.stub(taskManager, 'filter', function(filterName) {
          assert.equal(filterName, _filterName);
          taskManager.stack = [];
        });
    });

    teardown(function() {
      taskManager.hide();
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
    });
  });
});
