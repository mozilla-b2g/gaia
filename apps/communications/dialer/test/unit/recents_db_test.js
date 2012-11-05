requireApp('communications/dialer/js/recents_db.js');
requireApp('communications/dialer/test/unit/mock_recent.js');

suite('dialer/recents_db', function() {
  var subject;
  var callList = [];
  var singleCall = null;

  suiteSetup(function() {
    subject = RecentsDBManager;

    callList.push(new MockRecent('11111', 'incoming-connected'));
    callList.push(new MockRecent('11111', 'incoming-connected'));
    callList.push(new MockRecent('11111', 'incoming-connected'));
    callList.push(new MockRecent('11111', 'incoming-refused'));
    callList.push(new MockRecent('11111', 'incoming-refused'));

    singleCall = new MockRecent('22222', 'outgoing-connected');
  });

  suite('#initialization', function() {
    test('#open_db', function(done) {
      subject.init(function(recentsManager) {
        assert.ok(true, 'Recents DB initialized propertly');
        done();
      });
    });

    test('#delete_all', function(done) {
      subject.deleteAll(function() {
        subject.get(function(entries) {
          assert.length(entries, 0, 'All entries erased');
          done();
        });
      });
    });
  });

  suite('#usage', function() {
    test('#adding', function(done) {
      var numAdditions = 0;
      callList.forEach(function(call) {
        subject.add(call, function() {
          numAdditions++;
        });
      });

      var self = this;
      subject.add(singleCall, function() {
        self.timeout(1000);
        numAdditions++;
        done(function() {
          assert.equal(numAdditions, callList.length + 1,
            'Number of entries added ' + numAdditions);
        });
      });
    });

    test('#getLast', function(done) {
      subject.getLast(function(lastEntry) {
        assert.equal('22222', lastEntry.number);
        done();
      });
    });

    test('#delete_single', function(done) {
      subject.delete(singleCall.date, function() {
        subject.get(function(entries) {
          assert.length(entries, callList.length);
          entries.forEach(function(entry) {
            assert.notEqual(entry.number, singleCall.number);
          });
          done();
        });
      });
    });

    test('#delete_list', function(done) {
      var itemsToDelete = [];
      for (var j = 0; j < callList.length; j++) {
        itemsToDelete.push(callList[j].date);
      }
      subject.deleteList(itemsToDelete, function() {
        subject.get(function(entries) {
          assert.length(entries, 0);
          done();
        });
      });
    });

  });

});
