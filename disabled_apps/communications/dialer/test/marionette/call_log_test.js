'use strict';

var Dialer = require('./lib/dialer');
var CallLogEntriesManager = require('./fake/call_log_entries_manager.js');

marionette('Dialer > Call log', function() {

  var client = marionette.client(Dialer.config);
  var dialer;
  var callLog;

  setup(function() {
    dialer = new Dialer(client);
    dialer.launch();

    client.loader.getMockManager('dialer').inject('navigator_moz_icc_manager');
    var entriesManager = new CallLogEntriesManager(dialer);
    var partialEntries = [
      {},
      {'number': '123'},
      {'number': '456'}
    ];
    entriesManager.generateAndAdd(partialEntries);

    callLog = dialer.tabs.goToCallLog(partialEntries.length);
  });

  test('Entering the edit mode hides the filters', function() {
    callLog.enterEditMode(); // Hide verification is done there
  });

  suite('Edit mode should be hidden', function() {
    setup(function() {
      callLog.enterEditMode();
    });

    test('when exiting it with cancel', function() {
      callLog.exitEditMode(); // Hide verification is done there
    });

    test('when deleting some (but not all) call log entries', function() {
      callLog.deleteEntries([0, 1]); // Hide verification is done there
    });

    test('when deleting all call log entries', function() {
      callLog.deleteAllEntries(); // Hide verification is done there
    });
  });

});
