requireApp('browser/js/global_history.js');

const ICON_URI = 'data:image/x-icon;base64,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';


suite('Global History', function() {

  suite('db', function() {
    setup(function(done) {
      GlobalHistory.db.open(function() {
        GlobalHistory.db.clearPlaces(function() {
          GlobalHistory.db.clearVisits(function() {
            GlobalHistory.db.clearIcons(function() {
              done();
            });
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

    test('saveIcon', function(done) {
      // Let's just use text, a blob is a blob.
      var blob = new Blob(['hello', ' world'], {type: 'text/plain'});
      var iconEntry = {
        uri: 'http://mozilla.org/favicon.ico',
        data: blob,
        expiration: new Date().valueOf()
      };
      GlobalHistory.db.saveIcon(iconEntry, function() {
        done();
      });
    });

    test('getIcon', function(done) {
      // Let's just use text, a blob is a blob.
      var blob = new Blob(['hello', ' world'], {type: 'text/plain'});
      var iconEntry = {
        uri: 'http://mozilla.org/favicon.ico',
        data: blob,
        expiration: new Date().valueOf()
      };
      GlobalHistory.db.saveIcon(iconEntry, function() {
        GlobalHistory.db.getIcon('http://mozilla.org/favicon.ico', function() {
          done();
        });
      });
    });
  });

  suite('history', function() {
    setup(function(done) {
      GlobalHistory.db.open(function() {
        GlobalHistory.db.clearPlaces(function() {
          GlobalHistory.db.clearVisits(function() {
            GlobalHistory.db.clearIcons(function() {
              done();
            });
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

    test('setAndLoadIconForPage', function(done) {
      GlobalHistory.setAndLoadIconForPage('http://mozilla.org/test6',
        ICON_URI, function() {
        GlobalHistory.db.getIcon(ICON_URI, function(iconEntry) {
          done(function() {
            assert.equal(true, iconEntry.expiration > new Date().valueOf());
            var twoDaysAway = new Date().valueOf() + 172800000;
            assert.equal(true, iconEntry.expiration < twoDaysAway);
            assert.equal(2550, iconEntry.data.size);
            assert.equal('image/x-icon', iconEntry.data.type);
          });
        });
      });
    });

    test('isFailedIcon - true', function(done) {
      var now = new Date().valueOf();
      var iconEntryFailed = {
        uri: 'http://mozilla.org/favicon1.ico',
        data: null,
        expiration: now + 86400000,
        failed: true
      };
      GlobalHistory.db.saveIcon(iconEntryFailed, function() {
        GlobalHistory.isFailedIcon(iconEntryFailed.uri, function(failed) {
          done(function() {
            assert.equal(true, failed);
          });
        });
      });
    });

    test('isFailedIcon - false', function(done) {
      var now = new Date().valueOf();
      var iconEntrySuccessful = {
        uri: 'http://mozilla.org/favicon2.ico',
        data: null,
        expiration: now + 86400000,
        failed: null
      };
      GlobalHistory.db.saveIcon(iconEntrySuccessful, function() {
        GlobalHistory.isFailedIcon(iconEntrySuccessful.uri, function(failed) {
          done(function() {
            assert.equal(true, (failed != true));
          });
        });
      });
    });

    test('isFailedIcon - expired', function(done) {
      var now = new Date().valueOf();
      var iconEntryExpired = {
        uri: 'http://mozilla.org/favicon3.ico',
        data: null,
        expiration: now - 86400000,
        failed: true
      };
      GlobalHistory.db.saveIcon(iconEntryExpired, function() {
        GlobalHistory.isFailedIcon(iconEntryExpired.uri, function(failed) {
          done(function() {
            assert.equal(true, (failed != true));
          });
        });
      });
    });

  });

});
