'use strict';

requireApp('system/js/places.js');

suite('Places', function() {

  var url = 'http://google.com';
  var places;

  suiteSetup(function(done) {
    places = new Places(done);
  });

  setup(function(done) {
    places.clear(done);
  });

  test('Storing and fetching a simple url', function(done) {
    places.addVisit(url, function() {
      assert.ok(true, 'Added url');
      places.getPlace(url, function(err, data) {
        assert.ok(data.url, 'Place has url');
        assert.ok(data.title, 'Place has title');
        assert.ok(data.frecency, 'Place has frecency');
        done();
      });
    });
  });

  test('Visit twice', function(done) {
    places.addVisit(url, function() {
      places.addVisit(url, function() {
        assert.ok(true, 'Added url');
        places.getPlace(url, function(err, data) {
          assert.equal(data.frecency, 2, 'Visited twice');
          done();
        });
      });
    });
  });

  test('Update a place', function(done) {
    places.addVisit(url, function(err, place) {
      var newPlace = {
        url: url,
        title: 'A Url',
        frecency: 2
      };
      places.updatePlace(url, newPlace, function() {
        places.getPlace(url, function(err, theNewPlace) {
          assert.equal(theNewPlace.frecency, 2);
          done();
        });
      });
    });
  });

  test('Update title', function(done) {
    places.addVisit(url, function() {
      places.setPlaceTitle(url, 'A New Title', function() {
        places.getPlace(url, function(err, data) {
          assert.equal(data.title, 'A New Title');
          done();
        });
      });
    });
  });

});
