/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var CostControl = require('./lib/costcontrol.js');

marionette('First Time Experience View', function() {
  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      }
    }
  });

  var costControlApp;

  function assertIsNotDisplayed(element) {
    assert.isFalse(element.displayed(), 'Element should not be displayed');
  }

  setup(function() {
    costControlApp = CostControl.create(client);

    client.contentScript.inject(
      __dirname + '/mocks/navigator_moz_icc_manager.js'
    );
    client.contentScript.inject(
      __dirname + '/mocks/navigator_moz_mobile_connections.js'
    );
    client.contentScript.inject(
      __dirname + '/mocks/navigator_moz_network_stats.js'
    );
  });

  suite('Non-configured SIM flow', function() {
    setup(function() {
      costControlApp.launch();
    });

    test('Should lead to DataUsage Tab', function() {
      var fte = costControlApp.FirstTimeExperience;

      fte.switchTo();
      client.helper.waitForElement(fte.Welcome.main);

      // Go next to Data Report view
      fte.next();
      client.helper.waitForElement(fte.DataReport.main);

      // Go next to Data Alert view
      fte.next();
      client.helper.waitForElement(fte.DataAlert.main);

      // Go next to DataUsageTab
      fte.finish();
      costControlApp.switchTo();

      // Verify that DataUsage tab is active
      client.helper.waitForElement(costControlApp.DataUsageTab.main);
      assertIsNotDisplayed(fte.frame);
    });
  });

  suite('Pre-configured SIM flow', function() {
    setup(function() {
      // Make current SIM as pre-configured
      client.contentScript.inject(__dirname + '/mocks/configure_icc.js');
      costControlApp.launch();
    });

    test('Should lead to Balance Tab for Prepaid plan', function() {
      var fte = costControlApp.FirstTimeExperience;

      fte.switchTo();
      client.helper.waitForElement(fte.Welcome.main);

      // Go next to plan selection
      fte.next();
      client.helper.waitForElement(fte.TypeOfContract.main);
      fte.TypeOfContract.prepaidPlanOption.click();

      // Go next to Prepaid low balance alert
      fte.next();
      client.helper.waitForElement(fte.PrepaidLowBalanceAlert.main);

      // Go next to Data Report and Alert
      fte.next();
      client.helper.waitForElement(fte.PrepaidDataReportAndAlert.main);

      // Go to Balance Tab
      fte.finish();
      costControlApp.switchTo();

      // Verify that Balance tab is active
      client.helper.waitForElement(costControlApp.BalanceTab.main);
      assertIsNotDisplayed(fte.frame);
    });

    test('Should lead to Telephony Tab for Postpaid plan', function() {
      var fte = costControlApp.FirstTimeExperience;

      fte.switchTo();
      client.helper.waitForElement(fte.Welcome.main);

      // Go next to plan selection
      fte.next();
      client.helper.waitForElement(fte.TypeOfContract.main);
      fte.TypeOfContract.postpaidPlanOption.click();

      // Go next to Postpaid Phone and Data Report
      fte.next();
      client.helper.waitForElement(fte.PostPaidPhoneAndDataReport.main);

      // Go next to Data Alert
      fte.next();
      client.helper.waitForElement(fte.PostPaidDataAlert.main);

      // Go to Balance Tab
      fte.finish();
      costControlApp.switchTo();

      // Verify that Telephony tab is active
      client.helper.waitForElement(costControlApp.TelephonyTab.main);
      assertIsNotDisplayed(fte.frame);
    });
  });
});
