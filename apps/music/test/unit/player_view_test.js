/* global PlayerView, loadBodyHTML, MockL10n */

'use strict';

require('/js/ui/views/player_view.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('Player View Test', function() {
  var pv, ratings;
  var realL10n = navigator.mozL10n;
  function testRatingsAriaChecked(checkedIndex) {
    pv.setRatings(checkedIndex);
    Array.prototype.forEach.call(ratings, function(rating, index) {
      assert.equal(checkedIndex - 1 === index ? 'true' : 'false',
        rating.getAttribute('aria-checked'));
    });
  }

  suiteSetup(function() {
    navigator.mozL10n = MockL10n;
    //Insert the star-rating bar into the dom
    loadBodyHTML('/index.html');

    //Initialize the Player View
    pv = PlayerView;

    //Override #setSeekBar with stub to avoid excess work in init()
    sinon.stub(pv, 'setSeekBar');
    pv.init();
    ratings = pv.ratings;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('#setRating accessibility', function() {
    test('aria-checked="true" when star matches star-rating. false otherwise',
      function() {
        [0, 1, 2, 3, 4, 5].forEach(testRatingsAriaChecked);
      });
  });
});
