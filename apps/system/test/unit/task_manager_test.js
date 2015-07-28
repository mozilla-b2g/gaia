/* global MockStackManager, MockSettingsListener, MockService,
          TaskManager, Card, AppWindow,
          HomescreenWindow, MocksHelper, MockL10n */

'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_lazy_loader.js');

require('/shared/js/event_safety.js');
require('/shared/js/sanitizer.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForTaskManager = new MocksHelper([
  'StackManager',
  'HomescreenWindow',
  'AppWindow',
  'Service',
  'LazyLoader',
  'SettingsListener'
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
  var fakeInnerWidth = 360;
  var fakeInnerHeight = 640;

  var screenNode, realL10n;
  var cardsView, cardsList, noRecentWindowsNode;
  var innerHeightDescriptor, innerWidthDescriptor,
      scrollLeftDescriptor, scrollTopDescriptor,
      scrollToDescriptor;

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

  var apps = {}, appConfigs, home;
  var taskManager;
  var scrollProperties = {};

  mocksForTaskManager.attachTestHelpers();

  suiteSetup(function cv_suiteSetup(done) {
    appConfigs = {
      'sms': {
        launchTime: 5,
        name: 'sms',
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
      },
      'game': {
        launchTime: 4,
        name: 'game',
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
      },
      'browser1': {
        launchTime: 4,
        name: 'browser1',
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
      },
      'game2': {
        launchTime: 3,
        name: 'game2',
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
      },
      'browser2': {
        name: 'browser2',
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
      },
      'search': {
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
      }
    };

    innerHeightDescriptor = Object
                              .getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerHeight', {
      value: fakeInnerHeight,
      configurable: true
    });
    innerWidthDescriptor = Object
                            .getOwnPropertyDescriptor(window, 'innerWidth');
    Object.defineProperty(window, 'innerWidth', {
      value: fakeInnerWidth,
      configurable: true
    });

    scrollLeftDescriptor = Object.getOwnPropertyDescriptor(Element.prototype,
                            'scrollLeft');
    scrollTopDescriptor = Object.getOwnPropertyDescriptor(Element.prototype,
                            'scrollTop');
    scrollToDescriptor = Object.getOwnPropertyDescriptor(Element.prototype,
                            'scrollTo');
    Object.defineProperty(Element.prototype, 'scrollLeft', {
      configurable: true,
      get: function() { return scrollProperties[this.id].scrollLeft || 0; },
      set: function(x) { return (scrollProperties[this.id].scrollLeft = x); }
    });

    Object.defineProperty(Element.prototype, 'scrollTop', {
      configurable: true,
      get: function() { return scrollProperties[this.id].scrollTop || 0; },
      set: function(y) { return (scrollProperties[this.id].scrollTop = y); }
    });

    Object.defineProperty(Element.prototype, 'scrollTo', {
      configurable: true,
      get: function() {
        return function scrollTo(x, y) {
          if ('object' == typeof x) {
            y = x.top;
            x = x.left;
          }
          this.scrollLeft = (isNaN(x) || !x) ? 0 : x;
          this.scrollTop = (isNaN(y) || !y) ? 0 : y;
        };
      }
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

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    home = new HomescreenWindow('fakeHome');
    requireApp('system/js/cards_helper.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/card.js');

    requireApp('system/js/task_manager.js', function() {
      done();
    });

  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'innerHeight', innerHeightDescriptor);
    Object.defineProperty(window, 'innerWidth', innerWidthDescriptor);
    Object.defineProperty(Element.prototype, 'scrollTop',
                          scrollTopDescriptor);
    Object.defineProperty(Element.prototype, 'scrollLeft',
                          scrollLeftDescriptor);
    Object.defineProperty(Element.prototype, 'scrollTo',
                          scrollToDescriptor);

    screenNode.parentNode.removeChild(screenNode);
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    apps = {};
    MockStackManager.mStack = [];
    MockService.mockQueryWith('getHomescreen', home);
    MockService.mockQueryWith('fetchCurrentOrientation', 'portrait-primary');
    MockService.mockQueryWith('defaultOrientation', 'portrait-primary');
    // The whole suite should use fakeTimers to prevent intemittents
    // since the code logic is timer-heavy
    this.sinon.useFakeTimers();

    scrollProperties['cards-view'] = {
      scrollLeft: 0, scrollTop: 0
    };

    this.sinon.stub(AppWindow.prototype, 'getSiteIconUrl')
        .returns(Promise.resolve('data:image/png;base64,abc+'));

    taskManager = new TaskManager();
    taskManager.start();
  });
  // We make sure to end each test with a reset DOM,
  // hidden+stopped+destroyed task manager and all setTimeouts triggered
  teardown(function() {
    // Clean up DOM in case a test didn't end up calling hide/_removeCards
    cardsList.innerHTML = '';
    cardsView.className = '';

    if (!taskManager) {
      return;
    }
    taskManager.hide();
    // the cardviewbeforeclose event after a tick
    // the cardviewclosed event after a tick
    this.sinon.clock.tick(2);
    taskManager.stop();
    this.sinon.clock.tick(500); // 100ms exit + 400ms safety
    taskManager = null;
  });

  suite('Hierarchy functions', function() {
    var manager;
    teardown(function() {
      if (manager) {
        manager.stop();
        manager = null;
      }
    });
    test('start should register hierarchy', function() {
      this.sinon.stub(MockService, 'request');
      manager = new TaskManager();
      manager.start();
      assert.isTrue(
        MockService.request.calledWith('registerHierarchy', manager));
    });

    test('stop should unregister hierarchy', function() {
      this.sinon.stub(MockService, 'request');
      taskManager.stop();
      assert.isTrue(
        MockService.request.calledWith('unregisterHierarchy', taskManager));
    });

    test('setActive to true should publish -activated', function() {
      var wasPublished = false;
      function onactivated() {
        wasPublished = true;
      }
      window.addEventListener(
        taskManager.EVENT_PREFIX + '-activated', onactivated);

      taskManager.setActive(true);
      this.sinon.clock.tick();
      window.removeEventListener(
        taskManager.EVENT_PREFIX + '-activated', onactivated);

      assert.ok(wasPublished);
    });

    test('setActive to false should publish -deactivated', function() {
      var wasPublished = false;
      function ondeactivated() {
        wasPublished = true;
      }

      taskManager.setActive(true);
      this.sinon.clock.tick();
      window.addEventListener(
        taskManager.EVENT_PREFIX + '-deactivated', ondeactivated);
      taskManager.setActive(false);

      assert.ok(wasPublished);
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
    test('observes settings at startup', function() {
      var spy = this.sinon.spy(MockSettingsListener, 'observe');
      taskManager.start();
      var numSettings = Object.keys(taskManager._settings).length;
      var proto = TaskManager.prototype;
      assert.equal(numSettings, 1);
      assert.equal(spy.callCount, 1);
      var call = spy.getCall(0);
      assert.equal(call.args[0], proto.SCREENSHOT_PREVIEWS_SETTING_KEY);
    });
    test('observes screenshots setting updates', function() {
      taskManager.start();
      var SETTING_KEY = taskManager.SCREENSHOT_PREVIEWS_SETTING_KEY;
      MockSettingsListener.mTriggerCallback(SETTING_KEY, false);
      assert.ok(!taskManager.useAppScreenshotPreviews,
        'useAppScreenshotPreviews is false when setting is false');

      MockSettingsListener.mTriggerCallback(SETTING_KEY, true);
      assert.ok(taskManager.useAppScreenshotPreviews,
        'useAppScreenshotPreviews is true when setting is true');
    });
  });

  suite('populated task manager >', function() {
    setup(function() {
      MockStackManager.mStack = [];
      var app;
      for (var key in appConfigs) {
        app = new AppWindow(appConfigs[key]);
        apps[key] = app;
        MockStackManager.mStack.push(app);
      }
    });

    suite('display cardsview >', function() {
      setup(function() {
        MockService.mockQueryWith('getTopMostWindow', apps.search);
        MockStackManager.mCurrent = MockStackManager.mStack.length -1;
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
        assert.ok(taskManager.currentCard,
                  'has a truthy currentCard property');

        var numCards = taskManager.cardsList.children.length;
        assert.equal(MockStackManager.snapshot().length, numCards,
                     'has correct number of list items');

        // not sure we want to expose _stackIndex,
        // but we'll sanity-check check it anyway
        var currentIndex = MockStackManager.mCurrent;
        assert.equal(currentIndex, taskManager._stackIndex);
        assert.equal(taskManager.currentCard.position, currentIndex);
      });

      test('placement', function() {
        var numCards = taskManager.cardsList.children.length;
        var margins = taskManager.windowWidth - taskManager.cardWidth;
        var expectedWidth = numCards * taskManager.cardWidth +
                           (numCards - 1) * taskManager.CARD_GUTTER +
                           margins;
        assert.equal(taskManager.cardsList.style.width, expectedWidth +'px');

        function checkCardPlacement(element, position) {
          var expectedLeft = margins / 2 +
                             position * (taskManager.cardWidth +
                                             taskManager.CARD_GUTTER);
          assert.equal(element.style.left,
                       expectedLeft+'px');
        }

        for(var idx=0; idx < taskManager.cardsList.children; idx++) {
          checkCardPlacement(cardsList.children[idx], idx);
        }
      });

      test('wheel up event', function() {
        var card = taskManager.currentCard;
        var killAppStub = this.sinon.stub(card, 'killApp');
        this.sinon.stub(card.app, 'killable', function() {
          return true;
        });
        taskManager.handleEvent({
          type: 'wheel',
          deltaMode: 2,
          DOM_DELTA_PAGE: 2,
          deltaY: 1
        });
        assert.isTrue(killAppStub.called);
      });

      test('wheel left/right event', function() {
        var card = taskManager.currentCard;
        this.sinon.spy(card, 'setVisibleForScreenReader');

        taskManager.handleEvent({
          type: 'wheel',
          deltaMode: 2,
          DOM_DELTA_PAGE: 2,
          deltaX: 1
        });
        assert.ok(card.setVisibleForScreenReader.calledOnce);
      });
    });

    suite('when the currently displayed app is out of the stack',
    function() {
      setup(function() {
        MockStackManager.mOutOfStack = true;
        MockStackManager.mStack = [
          apps.sms,
          apps.game,
          apps.game2
        ];
        MockStackManager.mCurrent = MockStackManager.mStack.length -1;
        taskManager.show();
      });

      teardown(function() {
        MockStackManager.mOutOfStack = false;
      });

      test('currentCard should be the last in the stack',
      function() {
        var currentApp = taskManager.currentCard.app;
        var expectedPosition = MockStackManager.mStack.indexOf(currentApp);
        assert.equal(expectedPosition, MockStackManager.mCurrent);
      });

      test('exitToApp handles out-of-stack app', function(done) {
        var outOfStackApp = apps.search;
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

        MockStackManager.mStack = [
          apps.sms
        ];
        MockStackManager.mCurrent = MockStackManager.mStack.length -1;

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

        MockStackManager.mStack = [
          apps.sms
        ];
        MockStackManager.mCurrent = MockStackManager.mStack.length -1;
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
        MockStackManager.mStack = [
          apps.sms
        ];
        MockStackManager.mCurrent = MockStackManager.mStack.length -1;
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
      }).then(function() {
        done();
      }, failOnReject);

      showTaskManager(this.sinon.clock);
    });

    suite('display empty cardsview >', function() {
      setup(function() {
        showTaskManager(this.sinon.clock);
      });

      test('on click, empty cardsview is closed and back to home screen',
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

        taskManager.handleEvent({target: taskManager.element,
                              type: 'click',
                              preventDefault: function(){} });
        this.sinon.clock.tick(501);
      });
    });
  });

  suite('hide > ', function() {
    setup(function() {
      MockStackManager.mStack = [
        appConfigs.sms,
        appConfigs.game
      ].map((config) => {
        var app = new AppWindow(config);
        apps[app.name] = app;
        return app;
      });
      MockStackManager.mCurrent = 0;
      MockService.mockQueryWith('AppWindowManager.getActiveWindow', apps.sms);

      showTaskManager(this.sinon.clock);
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
    setup(function() {
      MockService.mockQueryWith('getTopMostWindow', apps.search);
      MockStackManager.mStack = [];
      MockStackManager.mCurrent = MockStackManager.mStack.length -1;
      taskManager.stack = taskManager.unfilteredStack = [];
    });

    test('setActive true', function(done) {
      // setActive(true) should fire cardsviewshown event
      waitForEvent(window, 'cardviewshown').then(function(event) {
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown(), 'isShown is true');
        done();
      }, failOnReject);

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

  suite('tapping on an app >', function() {
    setup(function() {
      MockStackManager.mStack = [
        appConfigs.sms,
        appConfigs.game
      ].map((config) => {
        return new AppWindow(config);
      });
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
        appConfigs.sms,
        appConfigs.game
      ].map((config) => {
        var app = new AppWindow(config);
        apps[app.name] = app;
        return app;
      });
      MockStackManager.mCurrent = 0;
      showTaskManager(this.sinon.clock);
      this.sinon.clock.tick();
    });

    test('removes the card for that app', function() {
      this.sinon.stub(taskManager, 'removeCard');
      sendAppTerminated(apps.sms);
      assert.isTrue(taskManager.removeCard.calledOnce);
    });

    test('destroys the card', function() {
      var card = taskManager.getCardAtIndex(0);
      var destroySpy = this.sinon.spy(card, 'destroy');
      assert.isTrue(card && card.element &&
                    card.element.parentNode == taskManager.cardsList);
      var instanceID = card.app.instanceID;
      sendAppTerminated(card.app);
      assert.isTrue(destroySpy.calledOnce);
      assert.equal(cardsList.children.length, 1);
      assert.isFalse(instanceID in taskManager.cardsByAppID);
    });
    suite('after destroying all the cards', function() {
      setup(function() {
        sendAppTerminated(apps.sms);
        sendAppTerminated(apps.game);
      });

      test('should go back home', function(done) {
        var stub = this.sinon.stub(home, 'open');

        waitForEvent(window, 'cardviewclosed').then(function() {
          assert.isTrue(stub.calledOnce, 'home was open');
        }, failOnReject)
        .then(function() { done(); }, done);

        sendAppTerminated(apps.game);
        fakeFinish(this.sinon.clock, home);
      });
    });
  });

  suite('app is killed', function() {
    setup(function() {
      MockStackManager.mStack = [
        appConfigs.sms,
        appConfigs.game
      ].map((config) => {
        var app = new AppWindow(config);
        apps[app.name] = app;
        return app;
      });
      MockStackManager.mCurrent = 0;
      showTaskManager(this.sinon.clock);
    });

    test('removeCard is called on appterminated', function() {
      var deadApp = apps.game;
      var card = taskManager.cardsByAppID[deadApp.instanceID];
      var removeCardSpy = this.sinon.spy(taskManager, 'removeCard');
      var destroySpy = this.sinon.spy(card, 'destroy');
      sendAppTerminated(deadApp);
      this.sinon.clock.tick();

      assert.isTrue(removeCardSpy.calledOnce, 'removeCard was called');
      assert.isTrue(destroySpy.calledOnce, 'card.destroy was called');
      assert.equal(cardsList.childNodes.length, 1);
    });
  });

  suite('exit >', function() {
    setup(function() {
      MockStackManager.mStack = [
        appConfigs.sms,
        appConfigs.game
      ].map((config) => {
        var app = new AppWindow(config);
        apps[app.name] = app;
        return app;
      });
      MockStackManager.mCurrent = 0;
      this.sinon.stub(AppWindow.prototype, 'open', function() {
        this.element.dispatchEvent(new CustomEvent('_opened'));
      });
    });

    test('locking the screen should trigger an exit', function() {
      this.sinon.spy(taskManager, 'exitToApp');
      this.sinon.spy(taskManager, 'hide');
      showTaskManager(this.sinon.clock);

      window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
      this.sinon.clock.tick(500);
      sinon.assert.callOrder(taskManager.exitToApp, taskManager.hide);
    });

    test('opening an attention screen should trigger an exit', function() {
      this.sinon.spy(taskManager, 'exitToApp');
      this.sinon.spy(taskManager, 'hide');
      showTaskManager(this.sinon.clock);

      window.dispatchEvent(new CustomEvent('attentionopened'));
      this.sinon.clock.tick(500);
      sinon.assert.callOrder(taskManager.exitToApp, taskManager.hide);
    });

    suite('when opening from the homescreen', function() {
      setup(function() {
        MockService.mockQueryWith('AppWindowManager.getActiveWindow', home);
        MockStackManager.mCurrent = -1;
        showTaskManager(this.sinon.clock);
      });

      test('selected app is opened', function(done) {
        var targetApp = apps.game;
        var stub = targetApp.open;

        waitForEvent(window, 'cardviewclosed').then(function() {
          assert.isTrue(stub.calledOnce, 'selected app open method was called');
        }, failOnReject)
        .then(function() { done(); }, done);

        taskManager.exitToApp(targetApp);
        fakeFinish(this.sinon.clock, targetApp);
      });

      test('no touch input handled while opening selected app', function(done) {
        var targetApp = apps.game;
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

        var event = new CustomEvent('home');
        taskManager.respondToHierarchyEvent(event);
        fakeFinish(this.sinon.clock, home);
      });
    });

    suite('when opening from an app', function() {
      setup(function() {
        MockService.mockQueryWith('AppWindowManager.getActiveWindow', apps.sms);
        MockStackManager.mCurrent = 0;
        showTaskManager(this.sinon.clock);
      });

      test('selected app is opened', function(done) {
        var targetApp = apps.game;
        var stub = targetApp.open;

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
        var stub = activeApp.open;

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
        var targetApp = apps.game;
        var stackPosition = taskManager.unfilteredStack.indexOf(targetApp);

        waitForEvent(window, 'cardviewclosed').then(function(evt) {
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
      MockStackManager.mStack = [
        appConfigs.sms,
        appConfigs.browser1,
        appConfigs.game,
        appConfigs.browser2
      ].map((config) => {
        var app = new AppWindow(config);
        apps[app.name] = app;
        return app;
      });
      MockStackManager.mCurrent = 0;
      MockService.mockQueryWith('AppWindowManager.getActiveWindow',
        apps.sms);
      showTaskManager(this.sinon.clock, 'browser-only');
    });

    test('filter for browsers', function() {
      assert.equal(taskManager.stack.length, 2);
      // ensure sms app is filtered out, so browser1 should be first
      var firstCard = taskManager.getCardAtIndex(0);
      assert.equal(firstCard.app, apps.browser1);
    });
    test('exitToApp sets newStackPosition correctly using a filtered stack',
    function(done) {
      var targetApp = apps.browser2;
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
      var stub = this.sinon.stub(home, 'open');

      waitForEvent(window, 'cardviewclosed').then(function(evt) {
        assert.isTrue(stub.calledOnce, 'selected app open method was called');
        assert.equal(evt.detail.newStackPosition, expectedPosition);
      }, failOnReject)
      .then(function() { done(); }, done);

      taskManager.exitToApp();
      fakeFinish(this.sinon.clock, home);
    });
  });

  suite('filtering > /w search role', function() {
    setup(function() {
      MockService.mockQueryWith('AppWindowManager.getActiveWindow',
        apps.search);

      MockStackManager.mStack = [
        appConfigs.browser1,
        appConfigs.search,
        appConfigs.sms
      ].map((config) => {
        var app = new AppWindow(config);
        apps[app.name] = app;
        return app;
      });

      MockStackManager.mCurrent = 1;
      showTaskManager(this.sinon.clock, 'browser-only');
    });
    test('filter includes search app', function() {
      assert.equal(taskManager.stack.length, 2);
      assert.ok(taskManager.cardsByAppID[apps.search.instanceID]);
    });
  });

  suite('filtering > no matches ', function() {
    var stub, _filterName;
    setup(function() {
      MockStackManager.mStack = [
        appConfigs.sms
      ].map((config) => {
        var app = new AppWindow(config);
        apps[app.name] = app;
        return app;
      });

      MockService.mockQueryWith('AppWindowManager.getActiveWindow', apps.sms);
      _filterName = 'browser-only';
      stub = this.sinon.stub(taskManager, 'filter', function(filterName) {
          assert.equal(filterName, _filterName);
          taskManager.stack = [];
        });
    });

    test('filter function is called and empty stack is the result', function() {
      showTaskManager(this.sinon.clock, _filterName);
      stub.calledWith([_filterName]);
      assert.isTrue(cardsView.classList.contains('empty'),
                    'Should be displaying no recent browser windows');
    });

    test('but apps should still enterTaskManager', function() {
      MockStackManager.mStack.forEach((app) => {
        this.sinon.spy(app, 'enterTaskManager');
      });

      showTaskManager(this.sinon.clock, _filterName);

      MockStackManager.mStack.forEach(function(app) {
        sinon.assert.calledOnce(app.enterTaskManager);
      }, this);
    });

  });

  suite('orientation', function() {
    setup(function() {
      MockStackManager.mStack = [
        appConfigs.sms,
      ].map((config) => {
        var app = new AppWindow(config);
        apps[app.name] = app;
        return app;
      });
      MockStackManager.mCurrent = 0;
      MockService.mockQueryWith('AppWindowManager.getActiveWindow', apps.sms);
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
