'use strict';
/* global Dedupe */

requireApp('search/js/dedupe.js');

mocha.globals(['Dedupe']);

suite('search/dedupe', function() {

  var subject;

  setup(function() {
    subject = Dedupe;
  });

  suite('reset', function() {
    test('resets data', function() {
      assert.equal(subject.data.length, 0);
      subject.data = [123];
      subject.reset();
      assert.equal(subject.data.length, 0);
    });
  });

  suite('add', function() {
    test('adds to the working set', function() {
      assert.equal(subject.data.length, 0);
      subject.add({
        key: 'test',
        objects: []
      });
      assert.equal(subject.data.length, 1);
      subject.reset();
    });
  });

  suite('reduce', function() {
    test('reduces duplicate apps', function() {
      var firstDataset = {
        key: 't',
        objects: [
          {t: 'cat'},
          {t: 'dog'},
          {t: 'sheep'}
        ]
      };

      var secondDataset = {
        key: 't',
        objects: [
          {t: 'cat'},
          {t: 'dog'},
          {t: 'dinosaur'},
          {t: 'cow'}
        ]
      };

      subject.add(firstDataset);
      subject.add(secondDataset);

      var results = subject.reduce();
      assert.equal(results.length, 2);
    });
  });
});
