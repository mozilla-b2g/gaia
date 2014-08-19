/* global utils */

'use strict';

requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/js/utilities/normalizer.js');

suite('> Normalizer Utilities', function() {
  var realDateTimeFormat;
  suiteSetup(function(){
    realDateTimeFormat = navigator.mozL10n.DateTimeFormat;
    navigator.mozL10n.DateTimeFormat = function() {
      this.localeFormat = function(){};
    };
  });

  suiteTeardown(function(){
    navigator.mozL10n.DateTimeFormat = realDateTimeFormat;
  });

  test('Correctly identify if date is yesterday if less than 24 hours' +
                                                ' from yesterday.', function() {
    var fakeNow = 1406362980000; // July 26 2014, 10:23am.
    var testDate = 1406307060000; // July 25 2014, 6:51pm.
    var subject = utils.time.pretty(testDate, fakeNow);
    assert.isTrue(subject.indexOf('yesterday') >= 0);
  });
});
