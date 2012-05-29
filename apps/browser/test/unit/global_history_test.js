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
        title: 'Mozilla',
      };
      GlobalHistory.db.savePlace(place, function() {
        done();
      });
    });

    test('getPlace', function(done) {
      var place = {
        uri: 'http://mozilla.org/test2',
        title: 'Mozilla',
      };
      GlobalHistory.db.savePlace(place, function() {
        GlobalHistory.db.getPlace('http://mozilla.org/test2', function(place) {
          done(function() {
            assert.equal(place.title, 'Mozilla');
          });
        });
      });
    });

  });
});
