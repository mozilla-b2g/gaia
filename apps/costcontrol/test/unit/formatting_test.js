/* global smartRound, getPositions */

'use strict';

requireApp('costcontrol/test/unit/mock_moz_l10n.js');
requireApp('costcontrol/js/utils/toolkit.js');
requireApp('costcontrol/js/utils/formatting.js');

var realMozL10n;

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

suite('Formatting Test Suite >', function() {

  suiteSetup(function() {
    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;
  });

  function assertSmartRound(roundedValue, value, unit) {
    assert.equal(roundedValue[0], value);
    assert.equal(roundedValue[1], unit);
  }

  test(
    'Get decimal positions test behaviour without delta argument.',
    function() {
       assert.isTrue(getPositions(1.345) === 2);
       assert.isTrue(getPositions(1.3) === 2);
       assert.isTrue(getPositions(1) === 0);
       assert.isTrue(getPositions(97) === 0);
       assert.isTrue(getPositions(99.34) === 1);
       assert.isTrue(getPositions(103.39) === 0);
       assert.isTrue(getPositions(1021.3) === 0);
    }
  );

  test(
    'Get decimal positions test behaviour with delta argument.',
    function() {
      // Positive
      assert.isTrue(getPositions(1.345, 1) === 3);
      assert.isTrue(getPositions(1.3, 1) === 3);
      assert.isTrue(getPositions(1, 1) === 0);
      assert.isTrue(getPositions(99.34, 1) === 2);
      assert.isTrue(getPositions(103.39, 1) === 0);
      // Negative
      assert.isTrue(getPositions(1.345, -1) === 1);
      assert.isTrue(getPositions(1.3, -1) === 1);
      assert.isTrue(getPositions(1, -1) === 0);
      assert.isTrue(getPositions(99.34, -1) === 0);
      assert.isTrue(getPositions(103.39, -1) === 0);
    }
  );

  test(
    'SmartRound() test behaviour without delta argument.',
    function() {
       assert.equal(assertSmartRound(smartRound(1.345), 1.34, 'B'));
       assert.equal(assertSmartRound(smartRound(1.3), 1.30, 'B'));
       assert.equal(assertSmartRound(smartRound(1), 1, 'B'));
       assert.equal(assertSmartRound(smartRound(97), 97, 'B'));
       assert.equal(assertSmartRound(smartRound(99.34), 99.3, 'B'));
       assert.equal(assertSmartRound(smartRound(103.39), 103, 'B'));
       assert.equal(assertSmartRound(smartRound(1021.8), 1.02, 'KB'));
       assert.equal(assertSmartRound(smartRound(3431021.8), 3.43, 'MB'));
    }
  );

  test(
    'SmartRound() test behaviour with delta argument.',
    function() {
      // Positive
      assert.equal(assertSmartRound(smartRound(1.345, 1), 1.345, 'B'));
      assert.equal(assertSmartRound(smartRound(1.3, 1), 1.300, 'B'));
      assert.equal(assertSmartRound(smartRound(1, 1), 1, 'B'));
      assert.equal(assertSmartRound(smartRound(99.34, 1), 99.34, 'B'));
      assert.equal(assertSmartRound(smartRound(103.39, 1), 103, 'B'));
      // Negative
      assert.equal(assertSmartRound(smartRound(1.345, -1), 1.3, 'B'));
      assert.equal(assertSmartRound(smartRound(1, -1), 1, 'B'));
      assert.equal(assertSmartRound(smartRound(99.34, -1), 99, 'B'));
      assert.equal(assertSmartRound(smartRound(103.39, -1), 103, 'B'));
    }
  );
});
