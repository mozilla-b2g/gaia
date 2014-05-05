/* global StackManager, MockStackManager, MockNavigatorSettings,
          MockAppWindowManager, CardsView, AppWindow,
          MockLockScreen, MockScreenLayout, MocksHelper */
'use strict';
mocha.globals(['lockScreen', 'SettingsListener', 'CardsView']);

require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_rocketbar.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/test/unit/mock_stack_manager.js');

var mocksForCardsView = new MocksHelper([
  'GestureDetector',
  'ScreenLayout',
  'TrustedUIManager',
  'UtilityTray',
  'AppWindowManager',
  'Rocketbar',
  'SleepMenu',
  'OrientationManager',
  'StackManager',
  'NavigatorSettings',
  'AppWindow'
]).init();

var iconDataURI = 'data:image/png;base64,' +
                  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAa0lEQVR4nL' +
                  '2SwQ3AMAgDTTdpVmH/FdJR6KMSIUAR/dSvyD5LjhLgoyhaUsabIyGO0Dq/' +
                  '0Y4jpa85AZxjKOScBz1sVh9gC8xg3jZEZxXq9SrRYZItTh2yhY5I79DXnw' +
                  'X3/vl30AKFwNFp1NINUVMgoXCifAgAAAAASUVORK5CYII=';

suite('cards view >', function() {
  var fakeInnerHeight = 200;

  var screenNode, realMozLockOrientation, realScreenLayout, realMozSettings,
      realSettingsListener;
  var cardsView, cardsList;
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

  var apps;
  var sms, game, game2, game3, game4;

  mocksForCardsView.attachTestHelpers();
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

    originalLockScreen = window.lockScreen;
    window.lockScreen = MockLockScreen;
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
    screen.mozLockOrientation = MockLockScreen.mozLockOrientation;

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

    requireApp('system/js/cards_view.js', done);
  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'innerHeight', ihDescriptor);
    window.lockScreen = originalLockScreen;
    screenNode.parentNode.removeChild(screenNode);
    window.ScreenLayout = realScreenLayout;
    screen.mozLockOrientation = realMozLockOrientation;
    navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
  });

  suite('populated cards view >', function() {
    teardown(function() {
      cardsView.firstElementChild.innerHTML = '';
    });

    setup(function() {
      MockStackManager.mStack = [];
      for (var app in apps) {
        MockStackManager.mStack.push(apps[app]);
      }
      MockStackManager.mCurrent = 0;

      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mDisplayedApp = 'http://sms.gaiamobile.org';
    });

    function sendHoldhome() {
      var evt = new CustomEvent('holdhome', { });
      window.dispatchEvent(evt);
    }

    function sendAppopen() {
      var detail = {
        manifestURL: 'http://sms.gaiamobile.org/manifest.webapp',
        origin: 'http://sms.gaiamobile.org',
        isHomescreen: false
      };
      var evt = new CustomEvent('appopen', { detail: detail });
      window.dispatchEvent(evt);
    }

    test('test escapeHTML', function() {
      var escapedStr1 =
        CardsView._escapeHTML('<script>"\'script  \n\r</script>', false);
      var escapedStr2 =
        CardsView._escapeHTML('<script>"\'script  \n\r</script>', true);
      assert.equal(escapedStr1,
        '&#60;script>"\'script &nbsp;<br/><br/>&#60;/script>');
      assert.equal(escapedStr2,
        '&#60;script>&quot;&#x27;script &nbsp;<br/><br/>&#60;/script>');
    });

    suite('display cardsview >', function() {
      setup(function(done) {
        CardsView.showCardSwitcher(false);
        setTimeout(done);
      });

      test('cardsview should be active', function() {
        assert.isTrue(CardsView.cardSwitcherIsShown(), 'cardSwitcherIsShown');
        assert.isTrue(cardsView.classList.contains('active'));
      });

      test('cardsview should have no recent apps', function() {
        assert.isFalse(cardsView.classList.contains('empty'));
      });

      teardown(function() {
        CardsView.hideCardSwitcher(true);
      });
    });

    suite('display cardsview (in rocketbar) >', function() {
      setup(function(done) {
        sendHoldhome();
        setTimeout(function() { done(); });
      });

      teardown(function() {
        CardsView.hideCardSwitcher(true);
      });

      test('cardsview should be active', function() {
        assert.isTrue(cardsView.classList.contains('active'));
      });
    });

    suite('hide cardsview >', function() {
      setup(function(done) {
        CardsView.showCardSwitcher();
        setTimeout(function() {
          done(function() {
            sendAppopen();
          });
        });
      });

      teardown(function() {
        CardsView.hideCardSwitcher(true);
      });

      test('cardsview should not be active', function() {
        assert.isFalse(cardsView.classList.contains('active'));
      });
    });

    suite('cardsview and orientation apps >', function() {
      setup(function() {
        CardsView.showCardSwitcher();
      });

      teardown(function() {
        CardsView.hideCardSwitcher(true);
      });

      var testCardOrientation = function(origin, orientation) {
        var app = StackManager.mStack.find(function(app) {
          if (app.origin == origin) {
            return true;
          }
          return false;
        });

        var ordinal = StackManager.mStack.indexOf(app);
        var card =
          cardsView.querySelector('li[data-position="' + ordinal + '"]');
        card.dispatchEvent(new CustomEvent('onviewport'));
        return card.querySelector('.screenshotView')
            .classList.contains(orientation);
      };

      test('cardsview defines a landscape-primary app', function() {
        assert.isTrue(testCardOrientation('http://game.gaiamobile.org',
                                          'rotate-90'));

      });
      test('cardsview defines a landscape-secondary app', function() {
        assert.isTrue(testCardOrientation('http://game2.gaiamobile.org',
                                          'rotate-270'));
      });
      test('cardsview defines a landscape app in landscape-primary',
        function() {
        assert.isTrue(testCardOrientation('http://game3.gaiamobile.org',
                                          'rotate-90'));
      });
      test('cardsview defines a portrait app in portrait-primary', function() {
        assert.isTrue(testCardOrientation('http://sms.gaiamobile.org',
                                          'rotate-0'));
      });
      test('cardsview defines a portrait-secondary app', function() {
        assert.isTrue(testCardOrientation('http://game4.gaiamobile.org',
                                          'rotate-180'));
      });

    });

    suite('populated task manager in rocketbar >', function() {
      setup(function(done) {
        CardsView.showCardSwitcher(true);
        setTimeout(done);
      });

      teardown(function() {
        CardsView.hideCardSwitcher(true);
      });

      test('has correct classes', function() {
        var screen = document.getElementById('screen');
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(screen.classList.contains('task-manager'));
      });

      test('removes task-manager class', function() {
        var screen = document.getElementById('screen');
        CardsView.hideCardSwitcher(true);
        assert.isFalse(screen.classList.contains('task-manager'));
      });
    });

  });

  suite('empty cards view >', function() {
    setup(function(done) {
      MockStackManager.mStack = [];
      MockStackManager.mCurrent = -1;
      CardsView.showCardSwitcher(true);
      setTimeout(done);
    });

    teardown(function() {
      CardsView.hideCardSwitcher(true);
    });

    test('focuses rocketbar input on empty cards view', function(done) {
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      CardsView.showCardSwitcher(true);
      setTimeout(function nextTick() {
        var evt = dispatchStub.getCall(0).args[0];
        assert.equal(evt.type, 'cardviewclosed');
        done();
      });
    });
  });

  suite('one app is displayed >', function() {
    setup(function() {
      MockStackManager.mStack = [apps['http://sms.gaiamobile.org']];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org']
      };
      CardsView.showCardSwitcher(true);
    });

    teardown(function() {
      CardsView.hideCardSwitcher(true);
    });

    test('Prevent reflowing during swipe to remove', function() {
      var card = document.querySelector('.card');

      var touchstart = createTouchEvent('touchstart', card, 0, 500);
      var touchmove = createTouchEvent('touchmove', card, 0, 200);
      var touchend = createTouchEvent('touchend', card, 0, 200);

      assert.isFalse(card.dispatchEvent(touchstart));
      assert.isFalse(card.dispatchEvent(touchmove));
      assert.isFalse(card.dispatchEvent(touchend));
    });
  });

  suite('tapping on an app >', function() {
    var handler = {
      handleEvent: function(event) {
        if (event.type == 'cardviewclosed' &&
            event.detail.newStackPosition &&
            event.detail.newStackPosition == this.expectedStackPosition) {
          assert.isTrue(CardsView.cardSwitcherIsShown(),
                        'cards view should still be visible');
          this.done();
        }
      }
    };

    setup(function() {
      MockStackManager.mStack = [apps['http://sms.gaiamobile.org']];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org']
      };
      CardsView.showCardSwitcher(true);
      window.addEventListener('cardviewclosed', handler);
    });

    teardown(function() {
      window.removeEventListener('cardviewclosed', handler);
      CardsView.hideCardSwitcher(true);
    });

    test('displays the new app before dismissing the cards view',
    function(done) {
      handler.done = done;
      handler.expectedStackPosition = 0;

      var target = document.getElementById('cards-list').childNodes[0];
      var fakeEvent = {
        type: 'tap',
        target: target
      };

      CardsView.handleEvent(fakeEvent);
    });
  });

  suite('getIconURI > ', function() {
    suiteSetup(function() {
      var anApp = Object.create(apps['http://sms.gaiamobile.org']);
      anApp.manifest = {
        'icons': {
          '32': '/img/icon-32.png'
        }
      };
      MockStackManager.mStack = [anApp];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': anApp
      };
    });

    teardown(function() {
      CardsView.hideCardSwitcher(true);
    });

    test('gets icon from manifest.icons', function(done) {
      CardsView.showCardSwitcher();
      setTimeout(function() {
        var url = CardsView._getIconURI(0);
        assert.equal(0, url.indexOf('http://sms.gaiamobile.org/img/icon-'),
                    'got icon from manifest resolved relative to origin');
        done();
      });
    });

    test('fallback to app.icon when manifest provides none', function(done) {
      var currentApp = MockStackManager.mStack[0];
      var iconPath = '/img/foo.png';
      currentApp.icon = iconPath;
      currentApp.manifest = {};
      CardsView.showCardSwitcher();

      setTimeout(function() {
        var url = CardsView._getIconURI(0);
        assert.equal(url, 'http://sms.gaiamobile.org' + iconPath,
                    'return uri from .icon resolved from origin');
        done();
      });
    });

    test('handles data URIs', function(done) {
      var currentApp = MockStackManager.mStack[0];
      var iconPath = iconDataURI;
      currentApp.icon = iconPath;
      currentApp.manifest = {};
      CardsView.showCardSwitcher();

      setTimeout(function() {
        var url = CardsView._getIconURI(0);
        assert.equal(url, iconDataURI,
                    'return data uri as-is');
        done();
      });

    });
  });

  suite('screenshots settings >', function() {
    var SETTING_KEY = 'app.cards_view.screenshots.enabled';

    // CardsView should've added an observer when it loaded
    test('observes "' + SETTING_KEY + '" setting at startup', function() {
      var observers = MockNavigatorSettings.mObservers[SETTING_KEY];
      assert.equal(observers.length, 1,
        'exactly one observer is watching ' + SETTING_KEY);
    });

    test('observes setting updates', function() {
      var event = { settingValue: false };
      MockNavigatorSettings.mTriggerObservers(SETTING_KEY, event);
      assert.ok(!CardsView._screenshotPreviewsEnabled(),
        '_screenshotPreviewsEnabled is false when setting is false');

      event = { settingValue: true };
      MockNavigatorSettings.mTriggerObservers(SETTING_KEY, event);
      assert.ok(CardsView._screenshotPreviewsEnabled(),
        '_screenshotPreviewsEnabled is true when setting is true');
    });

    function makeSetup(isEnabled) {
      var app = Object.create(game);
      app.manifest = {
        icons: {
        '16': iconDataURI
        }
      };

      return function() {
        MockNavigatorSettings.mSettings[SETTING_KEY] = isEnabled;
        MockNavigatorSettings.mTriggerObservers(SETTING_KEY,
                                                { settingValue: isEnabled });
        MockStackManager.mStack = [app];
        MockStackManager.mCurrent = 0;
        MockAppWindowManager.mRunningApps = {
          'http://game.gaiamobile.org': app
        };
        CardsView.showCardSwitcher();
      };
    }

    suite('screenshots enabled >', function() {
      suiteSetup(makeSetup(true));
      setup(function(done) {
        CardsView.showCardSwitcher();
        setTimeout(done);
      });
      teardown(function() {
        CardsView.hideCardSwitcher(true);
      });

      test('cards dont show icons', function() {
        var cards = document.querySelectorAll('.card');

        assert.ok(cards.length, 'sanity check: ' +
                                'with screenshots enabled there were cards');

        assert.ok(Array.every(cards, function(card) {
          return !card.classList.contains('appIconPreview');
        }), 'all cards had appIconPreview class');

      });
    });

    suite('screenshots disabled >', function() {
      suiteSetup(makeSetup(false));
      setup(function(done) {
        CardsView.showCardSwitcher();
        setTimeout(done);
      });
      teardown(function() {
        CardsView.hideCardSwitcher(true);
      });

      test('cards do show icons', function() {
        var cards = document.querySelectorAll('.card');
        var iconViews = document.querySelectorAll('.card > .appIconView');

        assert.ok(cards.length, 'sanity check: ' +
                                'with screenshots disabled there were cards');
        assert.ok(Array.every(cards, function(card) {
          return card.classList.contains('appIconPreview');
        }), 'all cards had appIconPreview class');

        assert.ok(iconViews.length,
                  'there were app-icon view elements');
      });

      test('backgroundImage is set', function() {
        var gameCard = document.querySelector('.card');
        var iconView = gameCard.querySelector('.appIconView');

        assert.ok(iconView.style.backgroundImage.indexOf('url') > -1,
                  '.appIconView element has backgroundImage value');

      });
    });

  });
});

mocha.setup({ignoreLeaks: false});
