'use strict';

/* Unit test of entry_sheet.js */
requireApp('system/js/entry_sheet.js');

suite('entry sheet class > ', function() {
  test('Simple entry sheet instance creation..', function() {
    var entrySheet =
      new EntrySheet(document.body, 'unit test', document.createElement('div'));
    assert.ok(entrySheet.hasOwnProperty('element'));
  });
});

