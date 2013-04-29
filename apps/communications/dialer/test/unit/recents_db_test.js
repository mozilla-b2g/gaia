requireApp('communications/dialer/js/recents_db.js');

suite('dialer/recents_db', function() {
  var numbers = ['123', '456', '789'];
  var now = Date.now();
  var days = [// Day 1
              now,
              now + 1,
              // Day 2
              now + 86400000,
              now + 86400000 + 1,
              // Day 3
              now + (2 * 86400000),
              now + (2 * 86400000) + 1];

  suite('Clean up', function() {
    test('delete_db', function(done) {
      RecentsDBManager.deleteDb(function() {
        assert.ok(true, 'Recents DB deleted');
        done();
      });
    });
  });

  suite('Single call', function() {
    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].date, days[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[0].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            done();
          });
        });
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Two calls, same group, different hour', function() {
    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].date, days[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[0].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            done();
          });
        });
      });
    });

    test('Add another call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[1]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].date, days[1]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].retryCount, 2);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 2);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[1].number, numbers[0]);
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[1].type, 'incoming');
            assert.equal(recents[0].date, days[1]);
            assert.equal(recents[1].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            assert.equal(recents[1].groupId, groups[0].id);
            done();
          }, null, true);
        }, null, true);
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Two calls, different group because of different number', function() {
    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].date, days[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[0].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add another call', function(done) {
      RecentsDBManager.add({
        number: numbers[1],
        type: 'incoming',
        date: days[1]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 2);
          assert.equal(groups[0].number, numbers[1]);
          assert.equal(groups[1].number, numbers[0]);
          assert.equal(groups[0].date, days[1]);
          assert.equal(groups[1].date, days[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[1].type, 'incoming');
          assert.equal(groups[0].retryCount, 1);
          assert.equal(groups[1].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 2);
            assert.equal(recents[0].number, numbers[1]);
            assert.equal(recents[1].number, numbers[0]);
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[1].type, 'incoming');
            assert.equal(recents[0].date, days[1]);
            assert.equal(recents[1].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            assert.equal(recents[1].groupId, groups[1].id);
            done();
          }, null, true);
        }, null, true);
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Two calls, different group because of different day', function() {
    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].date, days[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[0].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            done();
          });
        });
      });
    });

    test('Add another call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[2]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 2);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[1].number, numbers[0]);
          assert.equal(groups[0].date, days[2]);
          assert.equal(groups[1].date, days[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[1].type, 'incoming');
          assert.equal(groups[0].retryCount, 1);
          assert.equal(groups[1].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 2);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[1].number, numbers[0]);
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[1].type, 'incoming');
            assert.equal(recents[0].date, days[2]);
            assert.equal(recents[1].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            assert.equal(recents[1].groupId, groups[1].id);
            done();
          }, null, true);
        }, null, true);
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Two calls, same group, different type', function(done) {
    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].date, days[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[0].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            done();
          });
        });
      });
    });

    test('Add another call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'dialing',
        date: days[1]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].date, days[1]);
          assert.equal(groups[0].type, 'dialing');
          assert.equal(groups[0].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 2);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[1].number, numbers[0]);
            assert.equal(recents[0].type, 'dialing');
            assert.equal(recents[1].type, 'incoming');
            assert.equal(recents[0].date, days[1]);
            assert.equal(recents[1].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            done();
          }, null, true);
        }, null, true);
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Update group contact', function() {
    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].date, days[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[0].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            done();
          });
        });
      });
    });

    test('Update contact info', function(done) {
      RecentsDBManager.updateGroupContactInfo(numbers[0], 'contactName',
                                              function(count) {
        assert.equal(count, 1);
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].contact, 'contactName');
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].date, days[0]);
          done();
        });
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Update group contact of inexisting group', function() {
    test('Update contact info', function(done) {
      RecentsDBManager.updateGroupContactInfo('whatever', 'contactName',
                                              function(count) {
        assert.equal(count, 0);
        done();
      });
    });
  });

  suite('Update group number', function() {
    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        contact: 'contactName',
        type: 'incoming',
        date: days[0]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].number, numbers[0]);
          assert.equal(groups[0].contact, 'contactName');
          assert.equal(groups[0].date, days[0]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].retryCount, 1);
          RecentsDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            assert.equal(recents[0].number, numbers[0]);
            assert.equal(recents[0].contact, 'contactName');
            assert.equal(recents[0].type, 'incoming');
            assert.equal(recents[0].date, days[0]);
            assert.equal(recents[0].groupId, groups[0].id);
            done();
          });
        });
      });
    });

    test('Update contact info', function(done) {
      RecentsDBManager.updateGroupContactInfo(numbers[1], 'contactName',
                                              function(count) {
        assert.equal(count, 1);
        RecentsDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          assert.equal(groups[0].contact, 'contactName');
          assert.equal(groups[0].number, numbers[1]);
          assert.equal(groups[0].type, 'incoming');
          assert.equal(groups[0].date, days[0]);
          done();
        });
      }, true);
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Update group number of inexisting group', function() {
    test('Update contact info', function(done) {
      RecentsDBManager.updateGroupContactInfo(numbers[0], 'whatever',
                                              function(count) {
        assert.equal(count, 0);
        done();
      }, true);
    });
  });

  suite('Get last group', function() {
    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[1],
        type: 'incoming',
        date: days[0]
      }, function() {
        done();
      });
    });

    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[2],
        type: 'dialing',
        date: days[4]
      }, function() {
        done();
      });
    });

    test('Add another call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[2]
      }, function() {
        RecentsDBManager.getLastGroup(function(group) {
          assert.equal(group.date, days[4]);
          assert.equal(group.number, numbers[2]);
          assert.equal(group.type, 'dialing');
          done();
        });
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get last group sorted by date', function() {
    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[1],
        type: 'incoming',
        date: days[0]
      }, function() {
        done();
      });
    });

    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[2],
        type: 'dialing',
        date: days[4]
      }, function() {
        done();
      });
    });

    test('Add another call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[2]
      }, function() {
        RecentsDBManager.getGroupList(function(groups) {
          RecentsDBManager.getLastGroup(function(group) {
            assert.equal(group.date, days[4]);
            assert.equal(group.number, numbers[2]);
            assert.equal(group.type, 'dialing');
            done();
          });
        });
      });
    }, 'date');

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get groups requesting a cursor', function() {
     test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      }, function() {
        done();
      });
    });

    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[1],
        type: 'dialing',
        date: days[2]
      }, function() {
        done();
      });
    });

    test('Add another call', function(done) {
      RecentsDBManager.add({
        number: numbers[2],
        type: 'incoming',
        date: days[4]
      }, function() {
        RecentsDBManager.getGroupList(function(cursor) {
          assert.equal(cursor.value.number, numbers[0]);
          assert.equal(cursor.value.date, days[0]);
          assert.equal(cursor.value.type, 'incoming');
          done();
        }, null, null, true);
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get groups requesting a cursor sorted by date', function() {
     test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      }, function() {
        done();
      });
    });

    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[1],
        type: 'dialing',
        date: days[2]
      }, function() {
        done();
      });
    });

    test('Add another call', function(done) {
      RecentsDBManager.add({
        number: numbers[2],
        type: 'incoming',
        date: days[4]
      }, function() {
        RecentsDBManager.getGroupList(function(cursor) {
          assert.equal(cursor.value.number, numbers[0]);
          assert.equal(cursor.value.date, days[0]);
          assert.equal(cursor.value.type, 'incoming');
          done();
        }, 'date', null, true);
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get groups requesting a cursor sorted by date in reverse order',
        function() {
     test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      }, function() {
        done();
      });
    });

    test('Add a call', function(done) {
      RecentsDBManager.add({
        number: numbers[1],
        type: 'dialing',
        date: days[2]
      }, function() {
        done();
      });
    });

    test('Add another call', function(done) {
      RecentsDBManager.add({
        number: numbers[2],
        type: 'incoming',
        date: days[4]
      }, function() {
        RecentsDBManager.getGroupList(function(cursor) {
          assert.equal(cursor.value.number, numbers[2]);
          assert.equal(cursor.value.date, days[4]);
          assert.equal(cursor.value.type, 'incoming');
          done();
        }, 'date', true, true);
      });
    });

    suiteTeardown(function(done) {
      RecentsDBManager.deleteAll(function() {
        done();
      });
    });
  });

});
