// Card Views Test

'use strict';
// Ignore leak, otherwise an error would occur when using MockMozActivity.
mocha.setup({ignoreLeaks: true});

requireApp('system/test/unit/mock_gesture_detector.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mocks_helper.js');

var mocksForCardsView = ['GestureDetector',
                         'TrustedUIManager',
                         'UtilityTray',
                         'WindowManager'];

mocksForCardsView.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

suite('cards view > ', function() {
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

    screenNode.appendChild(cardsView);
    document.body.appendChild(screenNode);

    requireApp('system/js/cards_view.js', done);
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    screenNode.parentNode.removeChild(screenNode);
  });

  setup(function() {
    mocksHelper.setup();
  });

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
});

mocha.setup({ignoreLeaks: false});