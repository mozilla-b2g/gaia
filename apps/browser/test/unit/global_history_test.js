requireApp('browser/js/global_history.js');

suite('Global History', function() {

  suite('db', function() {
    setup(function(done) {
      GlobalHistory.db.open(function() {
        GlobalHistory.db.clearPlaces(function() {
          GlobalHistory.db.clearVisits(function() {
            done();
          });
        });
      });
    });

    test('savePlace', function(done) {
      var place = {
        uri: 'http://mozilla.org/test1',
        title: 'Mozilla'
      };
      GlobalHistory.db.savePlace(place, function() {
        done();
      });
    });

    test('getPlace', function(done) {
      var place = {
        uri: 'http://mozilla.org/test2',
        title: 'Mozilla'
      };
      GlobalHistory.db.savePlace(place, function() {
        GlobalHistory.db.getPlace('http://mozilla.org/test2', function(place) {
          done(function() {
            assert.equal(place.title, 'Mozilla');
          });
        });
      });
    });

    test('getPlace - not found', function(done) {
      GlobalHistory.db.getPlace('http://mozilla.org/doesnotexist',
        function(place) {
        done(function() {
          assert.equal(place, undefined);
        });
      });
    });

    test('updatePlace', function(done) {
      var place = {
        uri: 'http://mozilla.org/test3',
        title: 'Mozilla'
      };
      GlobalHistory.db.savePlace(place, function() {
        place.title = 'Mozilla3';
        GlobalHistory.db.updatePlace(place, function() {
          GlobalHistory.db.getPlace('http://mozilla.org/test3',
            function(place) {
            done(function() {
              assert.equal(place.title, 'Mozilla3');
            });
          });
        });
      });

    });
  });

  suite('history', function() {
    setup(function(done) {
      GlobalHistory.db.open(function() {
        GlobalHistory.db.clearPlaces(function() {
          GlobalHistory.db.clearVisits(function() {
            done();
          });
        });
      });
    });

    test('addPlace', function(done) {
      GlobalHistory.addPlace('http://mozilla.org/test4', function() {
        done();
      });
    });

    test('setPageTitle', function(done) {
      GlobalHistory.addPlace('http://mozilla.org/test5', function() {
        GlobalHistory.setPageTitle('http://mozilla.org/test5',
          'Mozilla5', function() {
          GlobalHistory.db.getPlace('http://mozilla.org/test5',
            function(place) {
            done(function() {
              assert.equal(place.title, 'Mozilla5');
            });
          });
        });
      });
    });

    test('setPageIcon', function(done) {
      // Let's just use text, a blob is a blob.
      var blob = new Blob(['hello', ' world'], {type: 'text/plain'});
      // Set icon for new place
      GlobalHistory.setPageIcon('http://mozilla.org/test6', blob, function() {
        // Set icon for existing place
        GlobalHistory.setPageIcon('http://mozilla.org/test6', blob, function() {
          done();
        });
      });
    });

  });

});
