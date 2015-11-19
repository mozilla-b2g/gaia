/* global marionette, require, setup, suite, test */
'use strict';

var assert = require('assert');
var Fm = require('./lib/fm.js');


marionette('FM Radio test', function() {

  var client = marionette.client({
    profile: {

    }
  });


  var fm;

  setup(function() {
    fm = new Fm(client);

    fm.launch();
    fm.waitForLoaded();

  });


  suite('FM Radio UI', function() {
    test('Test basic UI', function() {
      try {
        var freq = fm.getCurrentFrequency();
        assert.equal(freq, '87.5');

        var dialFreq = fm.getDialFreq();
        assert.equal(dialFreq, '87.5');

        assert.equal(freq, dialFreq);

        // test seek up and down
        var startFreq = freq;

        fm.seekUp();

        freq = fm.getCurrentFrequency();
        assert.notEqual(freq, startFreq);

        dialFreq = fm.getDialFreq();
        assert.equal(parseFloat(dialFreq), parseFloat(freq));

        fm.seekDown();

        freq = fm.getCurrentFrequency();
        assert.equal(freq, startFreq);

        dialFreq = fm.getDialFreq();
        assert.equal(parseFloat(dialFreq), parseFloat(freq));

        // see about the frequency being saved.
        fm.seekUp();
        startFreq = fm.getCurrentFrequency();
        fm.close();

        fm.launch();
        fm.waitForLoaded();
        freq = fm.getCurrentFrequency();
        assert.equal(parseFloat(freq), parseFloat(startFreq));

      } catch(e) {
        assert.ok(false, e.stack);
      }
    });
  });

  suite('FM Radio favourites', function() {

  });
});
