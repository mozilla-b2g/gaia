requireApp('communications/dialer/js/call_log_db.js');
requireApp('communications/dialer/js/utils.js');

suite('dialer/call_log_db', function() {
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

  function checkGroup(group, call, lastEntryDate, retryCount, result) {
    var id = Utils.getDayDate(call.date) + '-' + call.number + '-' + call.type;
    if (call.status) {
      id += '-' + call.status;
    }
    assert.equal(group.id, id);
    assert.equal(group.number, call.number);
    assert.equal(group.date, Utils.getDayDate(call.date));
    assert.equal(group.type, call.type);
    assert.equal(group.status, call.status);
    assert.equal(group.retryCount, retryCount);
    assert.equal(group.lastEntryDate, lastEntryDate);
    if (result) {
      assert.equal(group.number, result.number);
      assert.equal(group.date, result.date);
      assert.equal(group.type, result.type);
      assert.equal(group.status, result.status);
      assert.equal(group.retryCount, result.retryCount);
      assert.equal(group.lastEntryDate, result.lastEntryDate);
    }
  }

  function checkGroupId(groupId, expected) {
    assert.equal(groupId.length, expected.length);
    for (var i = 0, j = groupId.length; i < j; i++) {
      assert.equal(groupId[i], expected[i]);
    }
  }

  function checkCall(call, expected) {
    assert.equal(call.number, expected.number);
    assert.equal(call.type, expected.type);
    assert.equal(call.date, expected.date);
    assert.equal(call.status, expected.status);
    checkGroupId(call.groupId, CallLogDBManager._getGroupId(call));
  }

  suite('Clean up', function() {
    test('delete_db', function(done) {
      CallLogDBManager.deleteDb(function() {
        assert.ok(true, 'Recents DB deleted');
        done();
      });
    });
  });

  suite('Failed insert', function() {
    test('Fail adding a call', function(done) {
      CallLogDBManager.add('invalidcall', function(result) {
        assert.equal(result, 'INVALID_CALL');
        done();
      });
    });
  });

  suite('Single call', function() {
    test('Add a call', function(done) {
      var call = {
        number: numbers[0],
        type: 'incoming',
        date: days[0]
      };
      CallLogDBManager.add(call, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            checkCall(recents[0], call);
            done();
          });
        });
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Single call with status', function() {
    test('Add a call', function(done) {
      var call = {
        number: numbers[0],
        type: 'incoming',
        date: days[0],
        status: 'connected'
      };
      CallLogDBManager.add(call, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            checkCall(recents[0], call);
            done();
          });
        });
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Two calls, same group, different hour', function() {
    var call = {
      number: numbers[0],
      type: 'incoming',
      status: 'connected',
      date: days[0]
    };

    var call2 = {
      number: numbers[0],
      type: 'incoming',
      status: 'connected',
      date: days[1]
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          checkGroup(groups[0], call, call.date, 1, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            checkCall(recents[0], call);
            done();
          });
        });
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          checkGroup(groups[0], call2, call2.date, 2, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 2);
            checkCall(recents[0], call2);
            checkCall(recents[1], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Two calls, different group because of different number', function() {
    var result;
    var call = {
      number: numbers[0],
      type: 'incoming',
      status: 'connected',
      date: days[0]
    };

    var call2 = {
      number: numbers[1],
      type: 'incoming',
      status: 'connected',
      date: days[1]
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          checkGroup(groups[0], call, call.date, 1, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            checkCall(recents[0], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 2);
          checkGroup(groups[0], call2, call2.date, 1, res);
          checkGroup(groups[1], call, call.date, 1, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 2);
            checkCall(recents[0], call2);
            checkCall(recents[1], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Two calls, different group because of different day', function() {
    var result;
    var call = {
      number: numbers[0],
      type: 'incoming',
      status: 'connected',
      date: days[0]
    };

    var call2 = {
      number: numbers[0],
      type: 'incoming',
      status: 'connected',
      date: days[2]
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          checkGroup(groups[0], call, call.date, 1, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            checkCall(recents[0], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 2);
          checkGroup(groups[0], call2, call2.date, 1, res);
          checkGroup(groups[1], call, call.date, 1, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 2);
            checkCall(recents[0], call2);
            checkCall(recents[1], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Two calls, different group because of different type', function() {
    var result;
    var call = {
      number: numbers[0],
      type: 'incoming',
      status: 'connected',
      date: days[0]
    };

    var call2 = {
      number: numbers[0],
      type: 'dialing',
      date: days[1]
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          checkGroup(groups[0], call, call.date, 1, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            checkCall(recents[0], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 2);
          checkGroup(groups[0], call, call.date, 1, result);
          checkGroup(groups[1], call2, call2.date, 1, res);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 2);
            checkCall(recents[0], call2);
            checkCall(recents[1], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Two calls, different group because of different status', function() {
    var result;
    var call = {
      number: numbers[0],
      type: 'incoming',
      status: 'connected',
      date: days[0]
    };

    var call2 = {
      number: numbers[0],
      type: 'incoming',
      date: days[1]
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 1);
          checkGroup(groups[0], call, call.date, 1, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 1);
            checkCall(recents[0], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.length(groups, 2);
          checkGroup(groups[0], call, call.date, 1, result);
          checkGroup(groups[1], call2, call2.date, 1, res);
          CallLogDBManager.getRecentList(function(recents) {
            assert.length(recents, 2);
            checkCall(recents[0], call2);
            checkCall(recents[1], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get last group', function() {
    var call = {
      number: numbers[1],
      type: 'incoming',
      date: days[0]
    };
    var call2 = {
      number: numbers[2],
      type: 'dialing',
      date: days[4]
    };
    var call3 = {
      number: numbers[0],
      type: 'incoming',
      date: days[2]
    };
    test('Add a call', function(done) {
      CallLogDBManager.add(call, function() { done(); });
    });

    test('Add a call', function(done) {
      CallLogDBManager.add(call2, function() { done(); });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call3, function() {
        CallLogDBManager.getLastGroup(function(group) {
          checkGroup(group, call2, call2.date, 1);
          done();
        });
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get last group sorted by date', function() {
    var call = {
      number: numbers[1],
      type: 'incoming',
      date: days[0]
    };
    var call2 = {
      number: numbers[2],
      type: 'dialing',
      date: days[4]
    };
    var call3 = {
      number: numbers[0],
      type: 'incoming',
      date: days[2]
    };
    test('Add a call', function(done) {
      CallLogDBManager.add(call, function() { done(); });
    });

    test('Add a call', function(done) {
      CallLogDBManager.add(call2, function() { done(); });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call3, function() {
        CallLogDBManager.getGroupList(function(groups) {
          assert.equal(groups.length, 3);
          checkGroup(groups[2], call2, call2.date, 1);
          done();
        });
      });
    }, 'date');

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get groups requesting a cursor', function() {
    var call = {
      number: numbers[0],
      type: 'incoming',
      date: days[0]
    };
    var call2 = {
      number: numbers[1],
      type: 'dialing',
      date: days[2]
    };
    var call3 = {
      number: numbers[0],
      type: 'incoming',
      date: days[4]
    };
    test('Add a call', function(done) {
      CallLogDBManager.add(call, function() { done(); });
    });

    test('Add a call', function(done) {
      CallLogDBManager.add(call2, function() { done(); });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call3, function() {
        CallLogDBManager.getGroupList(function(cursor) {
          checkGroup(cursor.value, call, call.date, 1);
          done();
        }, null, null, true);
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get groups requesting a cursor sorted by date', function() {
    var call = {
      number: numbers[0],
      type: 'incoming',
      date: days[0]
    };
    var call2 = {
      number: numbers[1],
      type: 'dialing',
      date: days[2]
    };
    var call3 = {
      number: numbers[2],
      type: 'incoming',
      date: days[4]
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function() { done(); });
    });

    test('Add a call', function(done) {
      CallLogDBManager.add(call2, function() { done(); });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call3, function() {
        CallLogDBManager.getGroupList(function(cursor) {
          checkGroup(cursor.value, call, call.date, 1);
          done();
        }, 'lastEntryDate', null, true);
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get groups requesting a cursor sorted by date in reverse order',
        function() {
    var call = {
      number: numbers[0],
      type: 'incoming',
      date: days[0]
    };
    var call2 = {
      number: numbers[1],
      type: 'dialing',
      date: days[2]
    };
    var call3 = {
      number: numbers[2],
      type: 'incoming',
      date: days[4]
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function() { done(); });
    });

    test('Add a call', function(done) {
      CallLogDBManager.add(call2, function() { done(); });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call3, function() {
        CallLogDBManager.getGroupList(function(cursor) {
          checkGroup(cursor.value, call3, call3.date, 1);
          done();
        }, 'lastEntryDate', true, true);
      });
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Delete a group of calls', function() {
    var call = {
      number: numbers[0],
      type: 'incoming',
      date: days[0]
    };
    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(group) {
        checkGroup(group, call, call.date, 1);
        CallLogDBManager.deleteGroup(group, function(result) {
          assert.equal(result, 1);
          done();
        });
      });
    });
  });

  suite('Delete a group of calls with 2 calls', function() {
    var call = {
      number: numbers[0],
      type: 'incoming',
      date: days[0]
    };

    var call2 = {
      number: numbers[0],
      type: 'incoming',
      date: days[1]
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function() { done(); });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(group) {
        CallLogDBManager.deleteGroup(group, function(result) {
          assert.equal(result, 2);
          done();
        });
      });
    });
  });

});
