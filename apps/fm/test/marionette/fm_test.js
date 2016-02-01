/* global marionette, require, setup, suite, test */
'use strict';

var assert = require('assert');
var Fm = require('./lib/fm.js');


marionette('FM Radio test', function() {

  var client = marionette.client({
    profile: {},
    desiredCapabilities: { raisesAccessibilityExceptions: false }
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
    test('Test favouriting', function() {
      try {
        fm.seekUp();

        var isFav = fm.isFav();
        assert.ok(!isFav, 'Frequency shouldn\'t have been favourited');

        fm.fav();
        isFav = fm.isFav();
        assert.ok(isFav, 'Frequency should be favourited');

        fm.close();

        fm.launch();
        fm.waitForLoaded();

        isFav = fm.isFav();
        assert.ok(isFav, 'Frequency should be favourited after reboot.');

        // checking we have a selected favourite.
        var elem = fm.selectedFavItem();
        assert.ok(elem, 'Can\'t find selected favourite');

        var freq = fm.getCurrentFrequency();

        // checking the text content of the favourite.
        var favFreq = fm.selectedFavItemText();
        assert.equal(favFreq, freq,
                     'Current frequency and selected favourite do not match');

        // checking the id of the favourite.
        var id = elem.getAttribute('id');
        favFreq = id.substring(id.indexOf('-') + 1);
        assert.equal(
          parseFloat(favFreq), parseFloat(freq),
          'Current frequency and selected favourite ID do not match');

        fm.seekUp();
        var newFreq = fm.getCurrentFrequency();

        assert.notEqual(freq, newFreq);

        fm.fav();
        assert.ok(fm.isFav());

        // count number of favs. Should be 2.
        var elems = client.findElement(Fm.Selector.favList).
            findElements(Fm.Selector.favItem);
        assert.equal(elems.length, 2);

        favFreq = fm.selectedFavItemText();
        assert.equal(favFreq, newFreq);

        elem.tap();
        assert.ok(fm.isFav());

        favFreq = fm.selectedFavItemText();
        assert.notEqual(favFreq, newFreq);

        // remove the favourite.
        fm.fav();
        assert.ok(!fm.isFav());

        // count number of favs. Should be 1.
        elems = client.findElement(Fm.Selector.favList).
            findElements(Fm.Selector.favItem);
        assert.equal(elems.length, 1);
      } catch(e) {
        assert.ok(false, e.stack);
      }
    });
  });
});
