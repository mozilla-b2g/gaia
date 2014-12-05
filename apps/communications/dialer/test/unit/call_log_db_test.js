/* globals CallLogDBManager, MockContacts, MocksHelper, Utils */

'use strict';

requireApp('communications/dialer/js/call_log_db.js');
require('/shared/js/dialer/utils.js');

require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksHelperForCallLogDB = new MocksHelper([
  'LazyLoader',
  'ContactPhotoHelper'
]).init();

suite('dialer/call_log_db', function() {
  mocksHelperForCallLogDB.attachTestHelpers();

  var realContacts;

  // According to mock_contacts.js, 123 will have an associated test contact
  // 111 will have no contact associated and 222 will have more than 1 contact
  // for that number.
  var numbers = ['123', '111', '222', '333'];
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
  var duration = 12;

  function checkGroup(group, call, lastEntryDate, retryCount, contact, result) {
    var id = Utils.getDayDate(call.date) + '-' +
             (call.number || '') + '-' + call.type;
    if (call.status) {
      id += '-' + call.status;
    }
    assert.equal(group.id, id);
    assert.equal(group.number, call.number || '');
    assert.equal(group.serviceId, call.serviceId);
    assert.equal(group.date, Utils.getDayDate(call.date));
    assert.equal(group.type, call.type);
    assert.equal(group.status, call.status);
    assert.equal(group.retryCount, retryCount);
    assert.equal(group.lastEntryDate, lastEntryDate);
    assert.deepEqual(group.calls[0], {
      date: lastEntryDate,
      duration: duration
    });
    if (contact) {
      assert.equal(typeof group.contact, 'object');
      assert.equal(group.contact.id, MockContacts.mId);
      assert.equal(group.contact.primaryInfo, MockContacts.mName);
      assert.equal(group.contact.matchingTel.number, group.number);
      assert.equal(group.contact.matchingTel.carrier, MockContacts.mCarrier);
      assert.equal(group.contact.matchingTel.type, MockContacts.mType);
      assert.equal(group.contact.photo, MockContacts.mPhoto);
    }
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

  setup(function() {
    realContacts = window.Contacts;
    window.Contacts = MockContacts;
  });

  teardown(function() {
    window.Contacts = realContacts;
  });

  suite('Clean up', function() {
    test('delete_db', function(done) {
      CallLogDBManager.deleteDb(function(error) {
        assert.isUndefined(error);
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
        serviceId: 1,
        type: 'incoming',
        date: days[0],
        duration: duration
      };
      CallLogDBManager.add(call, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
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

  suite('Single withheld number call with null number', function() {
    test('Add a call', function(done) {
      var call = {
        number: null,
        type: 'incoming',
        date: days[0],
        duration: duration
      };
      CallLogDBManager.add(call, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
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
        status: 'connected',
        duration: duration
      };
      CallLogDBManager.add(call, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
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

  suite('Single call from hidden number', function() {
    test('Add a call', function(done) {
      var call = {
        number: '',
        type: 'incoming',
        date: days[0],
        duration: duration
      };
      CallLogDBManager.add(call, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
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
      serviceId: 1,
      type: 'incoming',
      status: 'connected',
      date: days[0],
      duration: duration
    };

    var call2 = {
      number: numbers[0],
      serviceId: 0,
      type: 'incoming',
      status: 'connected',
      date: days[1],
      duration: duration
    };

    // Same as call1 just 3s longer duration.
    var call3 = {
      number: numbers[0],
      serviceId: 1,
      type: 'incoming',
      status: 'connected',
      date: days[0],
      duration: duration + 3
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
            checkCall(recents[0], call);
            done();
          });
        });
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 1);
          checkGroup(groups[0], call2, call2.date, 2, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 2);
            checkCall(recents[0], call2);
            checkCall(recents[1], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Call durations are stored with last call first', function(done) {
      CallLogDBManager.add(call3, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          done(function() {
            assert.lengthOf(groups[0].calls, 3);
            assert.equal(groups[0].calls[0].date, call3.date);
            assert.equal(groups[0].calls[0].duration, call3.duration);
            assert.equal(groups[0].calls[1].date, call2.date);
            assert.equal(groups[0].calls[2].date, call.date);
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

  suite('Two calls, different group because of different number', function() {
    var result;
    var call = {
      number: numbers[0],
      type: 'incoming',
      status: 'connected',
      date: days[0],
      duration: duration
    };

    var call2 = {
      number: numbers[1],
      type: 'incoming',
      status: 'connected',
      date: days[1],
      duration: duration
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
            checkCall(recents[0], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 2);
          checkGroup(groups[0], call, call.date, 1, false, result);
          checkGroup(groups[1], call2, call2.date, 1, false, res);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 2);
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
      date: days[0],
      duration: duration
    };

    var call2 = {
      number: numbers[0],
      type: 'incoming',
      status: 'connected',
      date: days[2],
      duration: duration
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
            checkCall(recents[0], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 2);
          checkGroup(groups[0], call2, call2.date, 1, true, res);
          checkGroup(groups[1], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 2);
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
      date: days[0],
      duration: duration
    };

    var call2 = {
      number: numbers[0],
      type: 'dialing',
      date: days[1],
      duration: duration
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
            checkCall(recents[0], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 2);
          checkGroup(groups[0], call, call.date, 1, true, result);
          checkGroup(groups[1], call2, call2.date, 1, true, res);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 2);
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
      date: days[0],
      duration: duration
    };

    var call2 = {
      number: numbers[0],
      type: 'incoming',
      date: days[1],
      duration: duration
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
            checkCall(recents[0], call);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 2);
          checkGroup(groups[0], call, call.date, 1, true, result);
          checkGroup(groups[1], call2, call2.date, 1, true, res);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 2);
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

  suite('Calling Voicemail and Emergency', function() {
    var result;
    var voicemailCall = {
      number: '123',
      type: 'dialing',
      date: days[0],
      voicemail: true,
      emergency: false,
      duration: duration
    };

    var emergencyCall = {
      number: '112',
      type: 'dialing',
      date: days[1],
      voicemail: false,
      emergency: true,
      duration: duration
    };

    test('Add a voicemail call', function(done) {
      CallLogDBManager.add(voicemailCall, function(res) {
        result = res;
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 1);
          checkGroup(
            groups[0], voicemailCall, voicemailCall.date, 1, true, result);
          assert.isTrue(groups[0].voicemail);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 1);
            checkCall(recents[0], voicemailCall);
            assert.isTrue(recents[0].voicemail);
            done();
          }, null, true);
        }, null, true);
      });
    });

    test('Add an emergency call', function(done) {
      CallLogDBManager.add(emergencyCall, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 2);
          checkGroup(
            groups[0], voicemailCall, voicemailCall.date, 1, true, result);
          assert.isTrue(groups[0].voicemail);
          checkGroup(
            groups[1], emergencyCall, emergencyCall.date, 1, true, res);
          assert.isTrue(groups[1].emergency);
          CallLogDBManager.getRecentList(function(recents) {
            assert.lengthOf(recents, 2);
            checkCall(recents[0], emergencyCall);
            assert.isTrue(recents[0].emergency);
            checkCall(recents[1], voicemailCall);
            assert.isTrue(recents[1].voicemail);
            done();
          }, null, true);
        }, null, true);
      });
    });

    // bug 1078663
    test('Add a voicemail call with no number', function(done) {
      var oldVoicemailCallNumber = voicemailCall.number;
      voicemailCall.number = '';

      CallLogDBManager.add(voicemailCall, function(res) {
        CallLogDBManager.getGroupList(function(groups) {
          assert.isFalse(groups[2].voicemail);
          done();
        }, null, true);
      });

      voicemailCall.number = oldVoicemailCallNumber;
    });

    suiteTeardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });
  });

  suite('Get last outgoing group', function() {
    var call = {
      number: numbers[1],
      type: 'incoming',
      date: days[0],
      duration: duration
    };
    var call2 = {
      number: numbers[2],
      type: 'dialing',
      date: days[2],
      duration: duration
    };
    var call3 = {
      number: numbers[0],
      type: 'incoming',
      date: days[4],
      duration: duration
    };
    test('Add a call', function(done) {
      CallLogDBManager.add(call, function() { done(); });
    });

    test('Add a call', function(done) {
      CallLogDBManager.add(call2, function() { done(); });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call3, function() {
        CallLogDBManager.getGroupAtPosition(1, 'lastEntryDate', true, 'dialing',
          function(group) {
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

  suite('Get last call', function() {
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
        CallLogDBManager.getLastCall(function(lastCall) {
          checkCall(lastCall, call3);
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

  suite('Get a recent group at position', function() {
    var call = {
      number: numbers[1],
      type: 'incoming',
      date: days[0],
      duration: duration
    };
    var call2 = {
      number: numbers[2],
      type: 'dialing',
      date: days[2],
      duration: duration
    };
    var call3 = {
      number: numbers[0],
      type: 'incoming',
      date: days[4],
      duration: duration
    };
    test('Add a call', function(done) {
      CallLogDBManager.add(call, function() { done(); });
    });

    test('Add a call', function(done) {
      CallLogDBManager.add(call2, function() { done(); });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call3, function() {
        CallLogDBManager.getGroupAtPosition(3, 'lastEntryDate', true, null,
          function(group) {
            checkGroup(group, call, call.date, 1);
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
      date: days[0],
      duration: duration
    };
    var call2 = {
      number: numbers[2],
      type: 'dialing',
      date: days[4],
      duration: duration
    };
    var call3 = {
      number: numbers[0],
      type: 'incoming',
      date: days[2],
      duration: duration
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
          checkGroup(groups[2], call2, call2.date, 1, true);
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
      date: days[0],
      duration: duration
    };
    var call2 = {
      number: numbers[1],
      type: 'dialing',
      date: days[2],
      duration: duration
    };
    var call3 = {
      number: numbers[0],
      type: 'incoming',
      date: days[4],
      duration: duration
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
          checkGroup(cursor.value, call, call.date, 1, true);
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
      date: days[0],
      duration: duration
    };
    var call2 = {
      number: numbers[1],
      type: 'dialing',
      date: days[2],
      duration: duration
    };
    var call3 = {
      number: numbers[2],
      type: 'incoming',
      date: days[4],
      duration: duration
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
          checkGroup(cursor.value, call, call.date, 1, true);
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
      date: days[0],
      duration: duration
    };
    var call2 = {
      number: numbers[1],
      type: 'dialing',
      date: days[2],
      duration: duration
    };
    var call3 = {
      number: numbers[2],
      type: 'incoming',
      date: days[4],
      duration: duration
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
          checkGroup(cursor.value, call3, call3.date, 1, true);
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
      date: days[0],
      duration: duration
    };
    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(group) {
        checkGroup(group, call, call.date, 1);
        CallLogDBManager.deleteGroup(group, null, function(result) {
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
      date: days[0],
      duration: duration
    };

    var call2 = {
      number: numbers[0],
      type: 'incoming',
      date: days[1],
      duration: duration
    };

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function() { done(); });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(group) {
        CallLogDBManager.deleteGroup(group, null, function(result) {
          assert.equal(result, 2);
          done();
        });
      });
    });
  });

  suite('Delete a list of groups of calls', function() {
    var call = {
      number: numbers[0],
      type: 'incoming',
      date: days[0]
    };

    var call2 = {
      number: numbers[0],
      type: 'incoming',
      date: days[2]
    };

    var groupList = [];

    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(group) {
        groupList.push(group);
        done();
      });
    });

    test('Add another call', function(done) {
      CallLogDBManager.add(call2, function(group) {
        groupList.push(group);
        CallLogDBManager.deleteGroupList(groupList, function(result) {
          assert.equal(result, 2);
            CallLogDBManager.getGroupList(function(groups) {
              assert.lengthOf(groups, 0);
              done();
            });
        });
      });
    });
  });

  suite('deleteGroupList INVALID_GROUP_IN_LIST', function() {
    test('deleteGroupList error', function(done) {
      CallLogDBManager.deleteGroupList([11], function(result) {
        assert.equal(typeof result, 'string');
        assert.equal(result, 'INVALID_GROUP_IN_LIST');
        done();
      });
    });
  });

  suite('Delete a group of hidden calls', function() {
    var call = {
      number: '',
      type: 'incoming',
      date: days[0],
      duration: duration
    };
    test('Add a call', function(done) {
      CallLogDBManager.add(call, function(group) {
        checkGroup(group, call, call.date, 1);
        CallLogDBManager.deleteGroup(group, null, function(result) {
          assert.equal(result, 1);
          done();
        });
      });
    });
  });

  suite('Keep DB fit', function() {
    var call = {
      number: numbers[0],
      type: 'incoming',
      date: days[0]
    };

    var call2 = {
      number: numbers[1],
      type: 'incoming',
      date: days[1]
    };

    var call3 = {
      number: numbers[2],
      type: 'incoming',
      date: days[2]
    };

    var call4 = {
      number: numbers[3],
      type: 'incoming',
      date: days[2]
    };

    var _maxNumberOfGroups;
    var _numberOfGroupsToDelete;

    suiteSetup(function() {
      _maxNumberOfGroups = CallLogDBManager._maxNumberOfGroups;
      _numberOfGroupsToDelete = CallLogDBManager._numberOfGroupsToDelete;
      CallLogDBManager._maxNumberOfGroups = 3;
      CallLogDBManager._numberOfGroupsToDelete = 2;
    });

    test('Add all calls', function(done) {
      CallLogDBManager.add(call, function() {
        CallLogDBManager.add(call2, function() {
          CallLogDBManager.add(call3, function() {
            CallLogDBManager.add(call4, function() {
              done();
            });
          });
        });
      });
    });

    test('Get count of groups', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        assert.lengthOf(groups, 1);
        done();
      });
    });

    suiteTeardown(function() {
      CallLogDBManager._maxNumberOfGroups = _maxNumberOfGroups;
      CallLogDBManager._numberOfGroupsToDelete = _numberOfGroupsToDelete;
    });
  });

  suite('getGroupList with invalid sortedBy', function() {
    test('getGroupList should fail', function(done) {
      CallLogDBManager.getGroupList(function(error) {
        assert.ok(error);
        assert.equal(typeof error, 'string');
        assert.equal(error, 'INVALID_SORTED_BY_KEY');
        done();
      }, 'notvalidindex');
    });
  });

  suite('getRecentList with invalid sortedBy', function() {
    test('getRecentList should fail', function(done) {
      CallLogDBManager.getRecentList(function(error) {
        assert.ok(error);
        assert.equal(typeof error, 'string');
        assert.equal(error, 'INVALID_SORTED_BY_KEY');
        done();
      }, 'notvalidindex');
    });
  });

  suite('getGroup', function() {
    var call = {
      number: numbers[0],
      serviceId: 1,
      type: 'incoming',
      date: days[0],
      duration: duration,
      status: 'connected'
    };

    setup(function(done) {
      CallLogDBManager.add(call, function(result) {
        done();
      });
    });

    teardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });

    test('returns a known group', function(done) {
      CallLogDBManager.getGroup(call.number, call.date, call.type, call.status)
      .then(function(group) {
        assert.equal(group.number, call.number);
      }).then(done, done);
    });

    test('rejects when there is no known group', function(done) {
      CallLogDBManager.getGroup(
        call.number, call.date, call.type, 'wrongStatus')
      .then(function() {
        // We shouldn't reach this
        assert.ok(false);
      }, function() {
        assert.ok(true);
      }).then(done, done);
    });
  });

  suite('notifies new additions', function() {
    var call = {
      number: numbers[0],
      serviceId: 1,
      type: 'incoming',
      status: 'connected',
      date: days[0],
      duration: duration
    };

    var call2 = {
      number: numbers[0],
      serviceId: 0,
      type: 'incoming',
      status: 'connected',
      date: days[1],
      duration: duration
    };

    var contact = {
      id: 'test'
    };

    teardown(function(done) {
      CallLogDBManager.deleteAll(function() {
        done();
      });
    });

    test('when creating a group', function(done) {
      window.addEventListener('CallLogDbNewCall', function checkEvt(evt) {
        window.removeEventListener('CallLogDbNewCall', checkEvt);
        assert.equal(evt.detail.group.lastEntryDate, call.date);
        done();
      });
      CallLogDBManager.add(call);
    });

    test('when updating a group', function(done) {
      CallLogDBManager.add(call, function() {
        window.addEventListener('CallLogDbNewCall', function checkEvt(evt) {
          window.removeEventListener('CallLogDbNewCall', checkEvt);
          assert.equal(evt.detail.group.lastEntryDate, call2.date);
          done();
        });
        CallLogDBManager.add(call2);
      });
    });

    test('when updating contact information', function(done) {
      CallLogDBManager.add(call, function() {
        window.addEventListener('CallLogDbNewCall', function checkEvt(evt) {
          window.removeEventListener('CallLogDbNewCall', checkEvt);
          assert.equal(evt.detail.group.contact.id, contact.id);
          assert.equal(evt.detail.group.contact.primaryInfo, numbers[0]);
          done();
        });
        CallLogDBManager.updateGroupContactInfo(contact, { value: numbers[0] });
      });
    });

    test('when removing contact information', function(done) {
      CallLogDBManager.add(call, function() {
        CallLogDBManager.updateGroupContactInfo(contact, { value: numbers[0] },
        function() {
          window.addEventListener('CallLogDbNewCall', function checkEvt(evt) {
            window.removeEventListener('CallLogDbNewCall', checkEvt);
            assert.isUndefined(evt.detail.group.contact);
            done();
          });
        });
        CallLogDBManager.removeGroupContactInfo(contact.id, null);
      });
    });
  });
});
