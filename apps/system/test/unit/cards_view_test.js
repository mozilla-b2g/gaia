// Card Views Test

'use strict';
// Ignore leak, otherwise an error would occur when using MockMozActivity.
mocha.setup({ignoreLeaks: true});

requireApp('system/test/unit/mock_gesture_detector.js');
requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/test/unit/mock_popup_manager.js');

var mocksForCardsView = new MocksHelper([
  'GestureDetector',
  'ScreenLayout',
  'TrustedUIManager',
  'UtilityTray',
  'WindowManager',
  'LockScreen',
  'SleepMenu',
  'PopupManager'
]).init();

suite('cards view >', function() {
  var subject;

  var screenNode, realMozLockOrientation, realScreenLayout;
  var cardsView;

  mocksForCardsView.attachTestHelpers();
  suiteSetup(function(done) {
    screenNode = document.createElement('div');
    screenNode.id = 'screen';
    cardsView = document.createElement('div');
    cardsView.id = 'cards-view';

    cardsView.innerHTML = '<ul></ul>';

    screenNode.appendChild(cardsView);
    document.body.appendChild(screenNode);
    realScreenLayout = window.ScreenLayout;
    window.ScreenLayout = MockScreenLayout;
    realMozLockOrientation = screen.mozLockOrientation;
    screen.mozLockOrientation = MockLockScreen.mozLockOrientation;
    requireApp('system/js/cards_view.js', done);
  });

  suiteTeardown(function() {
    screenNode.parentNode.removeChild(screenNode);
    window.ScreenLayout = realScreenLayout;
    screen.mozLockOrientation = realMozLockOrientation;
  });

  teardown(function() {
    cardsView.firstElementChild.innerHTML = '';
  });

  setup(function() {
    MockWindowManager.mRunningApps = {
      'http://sms.gaiamobile.org': {
        launchTime: 5,
        name: 'SMS',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'portrait-primary'
        },
        rotatingDegree: 0,
        getScreenshot: function(callback) {
          callback();
        }
      },
      'http://game.gaiamobile.org': {
        launchTime: 4,
        name: 'GAME',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape-primary'
        },
        rotatingDegree: 90,
        getScreenshot: function(callback) {
          callback();
        }
      },
      'http://game2.gaiamobile.org': {
        launchTime: 3,
        name: 'GAME2',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape-secondary'
        },
        rotatingDegree: 270,
        getScreenshot: function(callback) {
          callback();
        }
      },
      'http://game3.gaiamobile.org': {
        launchTime: 2,
        name: 'GAME3',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape'
        },
        rotatingDegree: 90,
        getScreenshot: function(callback) {
          callback();
        }
      },
      'http://game4.gaiamobile.org': {
        launchTime: 1,
        name: 'GAME4',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'portrait-secondary'
        },
        rotatingDegree: 180,
        getScreenshot: function(callback) {
          callback();
        }
      }
    };
    MockWindowManager.mDisplayedApp = 'http://sms.gaiamobile.org';
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
      sendHoldhome();
      setTimeout(function() { done(); });
    });

    teardown(function() {
      CardsView.hideCardSwitcher();
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

    test('cardsview should not be active', function() {
      assert.isFalse(cardsView.classList.contains('active'));
    });
  });

  suite('cardsview and orientation apps >', function() {
    setup(function() {
      CardsView.showCardSwitcher();
    });

    teardown(function() {
      CardsView.hideCardSwitcher();
    });

    var testCardOrientation = function(origin, orientation) {
      var card = cardsView.querySelector('li[data-origin="' + origin + '"]');
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
    test('cardsview defines a landscape app in landscape-primary', function() {
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
});

mocha.setup({ignoreLeaks: false});

