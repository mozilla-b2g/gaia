'use strict';

requireApp('costcontrol/test/unit/mock_date.js');
requireApp('costcontrol/test/unit/mock_moz_l10n.js');
requireApp('costcontrol/js/utils/toolkit.js');
requireApp('costcontrol/js/utils/formatting.js');
requireApp('costcontrol/js/views/BalanceView.js');

var realDate,
    realMozL10n;

if (!this.navigator.mozL10n) {
  this.navigator.mozL10n = null;
}

suite(
  'Balance view (remaining balance and time since last update) >',
  function() {

    var MINUTE = 60 * 1000,
        HOUR = 60 * MINUTE,
        DAY = 24 * HOUR,
        MINIMUM_DELAY = 3 * HOUR;

    var now;
    var balanceLabel, timestampLabel, balanceView, balanceResult;

    suiteSetup(function() {
      realMozL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = window.MockMozL10n;

      realDate = window.Date;
      now = new window.MockDateFactory.realDate(2013, 0, 3, 18);
      window.Date = new window.MockDateFactory(now);
    });

    suiteTeardown(function() {
      window.navigator.mozL10n = realMozL10n;
      window.Date = realDate;
    });

    setup(function() {
      balanceResult = {
        balance: 60,
        currency: '$'
      };
      balanceLabel = document.createElement('p');
      timestampLabel = document.createElement('p');
      balanceView = new BalanceView(
        balanceLabel, timestampLabel, MINIMUM_DELAY);
    });

    function setBalanceAgeUpTo(age) {
      age = Math.floor(age);
      balanceResult.timestamp = new Date(now.getTime() - age + MINUTE);
    }

    function removeMinimumDelay() {
      balanceView = new BalanceView(balanceLabel, timestampLabel, 0);
    }

    function assertTimeElement() {
      var timeElement = timestampLabel.children[0];
      assert.equal(timeElement.tagName, 'TIME');
      assert.equal(timeElement.childElementCount, 0);
    }

    function assertTimeElementContains(content) {
      var timeElement = timestampLabel.children[0];
      assert.equal(timeElement.textContent, content);
    }

    function assertTimestampHighlight(colorClass) {
      var timeElement = timestampLabel.children[0];
      assert.equal(timeElement.classList.length, 1);
      assert.isTrue(timeElement.classList.contains(colorClass));
    }

    test(
      'Updating mode',
      function() {
        var isUpdating = true;
        balanceResult.timestamp = now;
        balanceView.update(balanceResult, isUpdating);
        assert.equal(timestampLabel.textContent, 'updating-ellipsis');
      }
    );

    test(
      'Balance not available',
      function() {
        balanceView.update(undefined);
        assert.equal(balanceLabel.textContent, 'not-available');
        assert.equal(timestampLabel.innerHTML, '');
      }
    );

    test('MINIMUM_DELAY disabled', function() {
      removeMinimumDelay();

      setBalanceAgeUpTo(MINIMUM_DELAY / 3);
      balanceView.update(balanceResult);
      assertTimeElement();
      assertTimestampHighlight('first-third');

      setBalanceAgeUpTo(2 * MINIMUM_DELAY / 3);
      balanceView.update(balanceResult);
      assertTimeElement();
      assertTimestampHighlight('first-third');

      setBalanceAgeUpTo(MINIMUM_DELAY);
      balanceView.update(balanceResult);
      assertTimeElement();
      assertTimestampHighlight('first-third');
    });

    test('Balance age in the first third of MINIMUM_DELAY', function() {
      setBalanceAgeUpTo(MINIMUM_DELAY / 3);

      balanceView.update(balanceResult);

      assertTimeElement();
      assertTimestampHighlight('first-third');
    });

    test('Balance age in the second third of MINIMUM_DELAY', function() {
      setBalanceAgeUpTo(2 * MINIMUM_DELAY / 3);

      balanceView.update(balanceResult);

      assertTimeElement();
      assertTimestampHighlight('second-third');
    });

    test('Balance age in the third third of MINIMUM_DELAY', function() {
      setBalanceAgeUpTo(MINIMUM_DELAY);

      balanceView.update(balanceResult);

      assertTimeElement();
      assertTimestampHighlight('third-third');
    });

    test('Balance age is yesterday', function() {
      setBalanceAgeUpTo(DAY);

      balanceView.update(balanceResult);

      assertTimeElement();
      assertTimestampHighlight('yesterday');
    });

    test('Balance age is before yesterday', function() {
      setBalanceAgeUpTo(2 * DAY);

      balanceView.update(balanceResult);

      assertTimeElement();
      assertTimestampHighlight('before');
    });
  }
);
