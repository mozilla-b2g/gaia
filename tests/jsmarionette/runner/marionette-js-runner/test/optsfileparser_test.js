/* global assert */
'use strict';
suite('optsfile', function() {
  var optsfile = require('../lib/optsfileparser');

  /**
   * @param {String} file to load with optsfile relative to fixtures.
   */
  function load(file) {
    return optsfile(__dirname + '/fixtures/' + file);
  }

  test('parsing valid optsfile', function() {
    assert.deepEqual(
      load('testops.opts'),
      ['--magicfoobar', '--dodad']
    );
  });

  test('optsfile with newlines', function() {
    assert.deepEqual(
      load('testopsnewline.opts'),
      ['--one', '--two']
    );
  });
});
