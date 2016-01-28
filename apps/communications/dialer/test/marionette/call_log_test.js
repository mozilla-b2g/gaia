'use strict';

var Dialer = require('./lib/dialer');
var ReflowHelper =
  require('../../../../../tests/jsmarionette/plugins/reflow_helper.js');

marionette('Dialer > Keypad', function() {
  var assert = require('assert');

  var client = marionette.client({ profile: Dialer.config });
  var subject;
  var selectors;
  var actions;

  var reflowHelper;

  setup(function() {
    actions = client.loader.getActions();
    subject = new Dialer(client);
    subject.launch();

    selectors = Dialer.Selectors;

    var tabItem = subject.client.findElement(selectors.callLogTabItem);
    actions.tap(tabItem).perform();

    subject.client.helper.waitForElement(selectors.callLogTabs);

    subject.client.helper.waitForElement(selectors.callLogNoResultsContainer);

    reflowHelper = new ReflowHelper(client);
  });

  /* Currently the starting of the Call Log 'sub-app' inside the Communications
      app throws an error due to navigator.mozIccManager being undefined when
      run in the B2G Desktop. This avoids running integration tests for the
      Call Log. I'll skip this test for the time being until a way to run
      integration tests in the Call Log is available. Please see:
      https://bugzilla.mozilla.org/show_bug.cgi?id=991062#c13 */
  test.skip('Entering the edit mode hides the filters', function() {
    reflowHelper.startTracking(Dialer.URL + '/manifest.webapp');

    var addEntryToCallLog = function() {
      window.wrappedJSObject.CallLog.sticky = {
        refresh: function() {}
      };
      var entry = {
        'date': Date.now(),
        'type': 'incoming',
        'number': '63030212029795',
        'serviceId': 0,
        'emergency': false,
        'voicemail': false,
        'status': 'connected'
      };
      window.wrappedJSObject.postMessage(
        {
          type: 'recent',
          entry: entry
        },
        'app://communications.gaiamobile.org'
      );
    };
    subject.client.executeScript(addEntryToCallLog);
    subject.client.helper.waitForElement(selectors.callLogItem);

    subject.client.findElement(selectors.callLogEditButton).tap();

    subject.client.helper.waitForElement(selectors.callLogEditForm);

    var filters = subject.client.findElement(selectors.callLogTabs);
    assert.isFalse(filters.displayed());

    var reflowCount = reflowHelper.getCount();
    assert.equal(reflowCount, 16, 'you need more than 16 reflows for that?');
    reflowHelper.stopTracking();
  });
});
