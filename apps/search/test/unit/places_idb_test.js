/* globals MocksHelper */
/* globals asyncStorage */
/* globals PlacesIdbStore */

'use strict';

require('/shared/test/unit/mocks/mock_async_storage.js');

requireApp('search/js/places_idb.js');

var mocksHelper = new MocksHelper([
  'asyncStorage'
]).init();

suite('search/places_idb', function() {

  var subject;

  var mozilla = 'http://mozilla.org';
  var google = 'http://google.com';
  var yahoo = 'http://yahoo.com';

  function place(url, frecency, visited, visits) {
    frecency = frecency || 1;
    visited = visited || 0;
    visits = visits || [visited];
    return {
      url: url,
      frecency: frecency,
      visited: visited,
      visits: visits
    };
  }

  mocksHelper.attachTestHelpers();

  setup(done => {
    asyncStorage.getItem = function(key, callback) {
      callback(null);
    };

    subject = new PlacesIdbStore();

    subject.init().then(function() {
      subject.clear().then(function() {
        done();
      });
    });
  });

  test('Test frecency', function(done) {
    Promise.all([
      subject.add('url', place(mozilla, 1, 0)),
      subject.add('url', place(google, 3, 1)),
      subject.add('url', place(yahoo, 2, 2)),
      subject.add('url', place(mozilla, 4, 3))
    ]).then(function() {
      subject.read('frecency', 5, function(results) {
        assert.equal(results.length, 3);
        assert.equal(results[0].url, mozilla);
        assert.equal(results[1].url, google);
        assert.equal(results[2].url, yahoo);
        done();
      });
    });
  });

  test('Test history', function(done) {
    Promise.all([
      subject.add('url', place(mozilla, 1, 0)),
      subject.add('url', place(google, 3, 1)),
      subject.add('url', place(yahoo, 2, 2)),
      subject.add('url', place(mozilla, 4, 3))
    ]).then(function() {
      subject.read('visited', 5, function(results) {
        assert.equal(results.length, 3);
        assert.equal(results[0].url, mozilla);
        assert.equal(results[1].url, yahoo);
        assert.equal(results[2].url, google);
        done();
      });
    });
  });

  test('Test frecency filter', function(done) {
    Promise.all([
      subject.add('url', place(google, -1, 0)),
      subject.add('url', place(yahoo, -2, 2)),
      subject.add('url', place(mozilla, 1, 3))
    ]).then(function() {
      subject.read('frecency', 5, function(results) {
        assert.equal(results.length, 1);
        assert.equal(results[0].url, mozilla);
        done();
      }, function(place) {
        return place.frecency > 0;
      });
    });
  });

  test('Test filter', function(done) {
    Promise.all([
      subject.add('url', place(mozilla, 1, 0)),
      subject.add('url', place(google, 3, 1)),
      subject.add('url', place(yahoo, 2, 2)),
      subject.add('url', place(mozilla, 4, 3))
    ]).then(function() {
      subject.read('visited', 5, function(results) {
        assert.equal(results.length, 1);
        assert.equal(results[0].url, mozilla);
        done();
      }, function(place) {
        return place.url === mozilla;
      });
    });
  });

  test('Test visits', function(done) {
    Promise.all([
      subject.add('url', place(mozilla, 1, 0, [0])),
      subject.add('url', place(google, 3, 0, [4, 2])),
      subject.add('url', place(yahoo, 2, 0, [7, 3])),
      subject.add('url', place(mozilla, 4, 0, [6, 5, 1, 0]))
    ]).then(function() {
      subject.readVisits(7, function(results) {
        assert.equal(results.length, 7);
        assert.equal(results[0].url, yahoo);
        assert.equal(results[1].url, mozilla);
        assert.equal(results[2].url, mozilla);
        assert.equal(results[3].url, google);
        assert.equal(results[4].url, yahoo);
        assert.equal(results[5].url, google);
        assert.equal(results[6].url, mozilla);
        done();
      });
    });
  });

  test('Adding empty visits should delete the record', function(done) {
    Promise.all([
      subject.add(mozilla, place(mozilla, 1, 1, [1])),
      subject.add(mozilla, place(mozilla, 1, 2, []))
    ]).then(() => {
      subject.read('visited', 5, results => {
        assert.equal(results.length, 0);
        subject.readVisits(5, results => {
          assert.equal(results.length, 0);
          done();
        });
      });
    });
  });

  test('Adding empty visits should delete the record', function(done) {
    Promise.all([
      subject.add(mozilla, place(mozilla, 1, 1, [1])),
      subject.remove(mozilla)
    ]).then(() => {
      subject.read('visited', 5, results => {
        assert.equal(results.length, 0);
        subject.readVisits(5, results => {
          assert.equal(results.length, 0);
          done();
        });
      });
    });
  });

});
