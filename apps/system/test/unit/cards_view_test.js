// Card Views Test

'use strict';
// Ignore leak, otherwise an error would occur when using MockMozActivity.
mocha.setup({ignoreLeaks: true});

requireApp('system/test/unit/mock_gesture_detector.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/test/unit/mock_popup_manager.js');
requireApp('system/test/unit/mocks_helper.js');

var mocksForCardsView = ['GestureDetector',
                         'TrustedUIManager',
                         'UtilityTray',
                         'WindowManager',
                         'LockScreen',
                         'SleepMenu',
                         'PopupManager'];

mocksForCardsView.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

suite('cards view >', function() {
  var mocksHelper;
  var subject;

  var screenNode;
  var cardsView;

  suiteSetup(function(done) {
    mocksHelper = new MocksHelper(mocksForCardsView);
    mocksHelper.suiteSetup();

    screenNode = document.createElement('div');
    screenNode.id = 'screen';
    cardsView = document.createElement('div');
    cardsView.id = 'cards-view';

    cardsView.innerHTML = '<ul></ul>';

    screenNode.appendChild(cardsView);
    document.body.appendChild(screenNode);

    requireApp('system/js/cards_view.js', done);
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    screenNode.parentNode.removeChild(screenNode);
  });

  teardown(function() {
    mocksHelper.teardown();
    cardsView.firstElementChild.innerHTML = '';
  });

  setup(function() {
    mocksHelper.setup();

    MockWindowManager.mRunningApps = {
      'http://sms.gaiamobile.org': {
        launchTime: 5,
        name: 'SMS',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'portrait-primary'
        },
        currentOrientation: 'portrait-primary'
      },
      'http://game.gaiamobile.org': {
        launchTime: 4,
        name: 'GAME',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape-primary'
        },
        currentOrientation: 'landscape-primary'
      },
      'http://game2.gaiamobile.org': {
        launchTime: 3,
        name: 'GAME2',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape-secondary'
        },
        currentOrientation: 'landscape-secondary'
      },
      'http://game3.gaiamobile.org': {
        launchTime: 2,
        name: 'GAME3',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape'
        },
        currentOrientation: 'landscape-primary'
      },
      'http://game4.gaiamobile.org': {
        launchTime: 1,
        name: 'GAME4',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'portrait-secondary'
        },
        currentOrientation: 'portrait-secondary'
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
                                        'landscape-primary'));
    });
    test('cardsview defines a landscape-secondary app', function() {
      assert.isTrue(testCardOrientation('http://game2.gaiamobile.org',
                                        'landscape-secondary'));
    });
    test('cardsview defines a landscape app in landscape-primary', function() {
      assert.isTrue(testCardOrientation('http://game3.gaiamobile.org',
                                        'landscape-primary'));
    });
    test('cardsview defines a portrait app in portrait-primary', function() {
      assert.isTrue(testCardOrientation('http://sms.gaiamobile.org',
                                        'portrait-primary'));
    });
    test('cardsview defines a portrait-secondary app', function() {
      assert.isTrue(testCardOrientation('http://game4.gaiamobile.org',
                                        'portrait-secondary'));
    });

  });
});

mocha.setup({ignoreLeaks: false});
