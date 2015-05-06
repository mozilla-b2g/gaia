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

  setup(function() {
    realContacts = window.Contacts;
    window.Contacts = MockContacts;
  });

  teardown(function(done) {
    CallLogDBManager.deleteAll(function() {
      done();
    });
    window.Contacts = realContacts;
  });

  suite('Clean up', function() {
    test('Check that emptying the database works', function(done) {
      CallLogDBManager.deleteDb(function(error) {
        done(function checks() {
          assert.isUndefined(error);
          assert.ok(true, 'Recents DB deleted');
        });
      });
    });
  });

  suite('Failed insert', function() {
    test('Check for failure when adding an invalid call', function(done) {
      CallLogDBManager.add('invalidcall', function(result) {
        done(function checks() {
          assert.equal(result, 'INVALID_CALL');
        });
      });
    });
  });

  suite('Single call', function() {
    var result = null;
    var call = {
      number: numbers[0],
      serviceId: 1,
      type: 'incoming',
      date: days[0],
      duration: duration
    };

    setup(function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        done();
      });
    });

    test('Check that a group is created for the call', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
        });
      });
    });
  });

  suite('Single withheld number call with null number', function() {
    var result = null;
    var call = {
      number: null,
      type: 'incoming',
      date: days[0],
      duration: duration
    };

    setup(function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        done();
      });
    });

    test('Check that one group is created', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
        });
      });
    });
  });

  suite('Single call with status', function() {
    var result = null;
    var call = {
      number: numbers[0],
      type: 'incoming',
      date: days[0],
      status: 'connected',
      duration: duration
    };

    setup(function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        done();
      });
    });

    test('Check that one group is created', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
        });
      });
    });
  });

  suite('Single call from hidden number', function() {
    var result = null;
    var call = {
      number: '',
      type: 'incoming',
      date: days[0],
      duration: duration
    };

    setup(function(done) {
      CallLogDBManager.add(call, function(res) {
        result = res;
        done();
      });
    });

    test('Check that one group is created', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.equal(groups.length, 1);
          checkGroup(groups[0], call, call.date, 1, true, result);
        });
      });
    });
  });

  suite('Two calls, same group, different hour', function() {
    var result = null;
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

    setup(function(done) {
      CallLogDBManager.add(call, function(res) {
        CallLogDBManager.add(call2, function(res) {
          result = res;
          done();
        });
      });
    });

    test('Check that one group is created', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function() {
          assert.lengthOf(groups, 1);
          checkGroup(groups[0], call2, call2.date, 2, true, result);
        });
      }, null, true);
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
  });

  suite('Two calls, different group because of different number', function() {
    var results = [];
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

    setup(function(done) {
      CallLogDBManager.add(call, function(result) {
        results[0] = result;
        CallLogDBManager.add(call2, function(result) {
          results[1] = result;
          done();
        });
      });
    });

    test('Check that two groups are created', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.lengthOf(groups, 2);
          checkGroup(groups[0], call, call.date, 1, false, results[0]);
          checkGroup(groups[1], call2, call2.date, 1, false, results[1]);
        });
      }, null, true);
    });
  });

  suite('Two calls, different group because of different day', function() {
    var results = [];
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

    setup(function(done) {
      CallLogDBManager.add(call, function(res) {
        results[0] = res;
        CallLogDBManager.add(call2, function(res) {
          results[1] = res;
          done();
        });
      });
    });

    test('Check that two groups are created', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.lengthOf(groups, 2);
          checkGroup(groups[0], call2, call2.date, 1, true, results[1]);
          checkGroup(groups[1], call, call.date, 1, true, results[0]);
        });
      }, null, true);
    });
  });

  suite('Two calls, different group because of different type', function() {
    var results = [];
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

    setup(function(done) {
      CallLogDBManager.add(call, function(res) {
        results[0] = res;
        CallLogDBManager.add(call2, function(res) {
          results[1] = res;
          done();
        });
      });
    });

    test('Check that two groups are created', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.lengthOf(groups, 2);
          checkGroup(groups[0], call, call.date, 1, true, results[0]);
          checkGroup(groups[1], call2, call2.date, 1, true, results[1]);
        });
      }, null, true);
    });
  });

  suite('Two calls, different group because of different status', function() {
    var results = [];
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

    setup(function(done) {
      CallLogDBManager.add(call, function(res) {
        results[0] = res;
        CallLogDBManager.add(call2, function(res) {
          results[1] = res;
          done();
        });
      });
    });

    test('Check that two groups are created', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.lengthOf(groups, 2);
          checkGroup(groups[0], call, call.date, 1, true, results[0]);
          checkGroup(groups[1], call2, call2.date, 1, true, results[1]);
        });
      }, null, true);
    });
  });

  suite('Calling Voicemail and Emergency', function() {
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

    test('Check that a group is created for the voicemail call',
    function(done) {
      CallLogDBManager.add(voicemailCall, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          done(function checks() {
            assert.lengthOf(groups, 1);
            checkGroup(
              groups[0], voicemailCall, voicemailCall.date, 1, true, result);
            assert.isTrue(groups[0].voicemail);
          });
        }, null, true);
      });
    });

    test('Check that a group is created for the emergency call',
    function(done) {
      CallLogDBManager.add(emergencyCall, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          done(function checks() {
            assert.lengthOf(groups, 1);
            checkGroup(
              groups[0], emergencyCall, emergencyCall.date, 1, true, result);
            assert.isTrue(groups[0].emergency);
          });
        }, null, true);
      });
    });

    // bug 1078663
    test('Check that a group is created for the voicemail call with no number',
    function(done) {
      var oldVoicemailCallNumber = voicemailCall.number;
      voicemailCall.number = '';

      CallLogDBManager.add(voicemailCall, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          done(function checks() {
            assert.isFalse(groups[0].voicemail);
          });
        }, null, true);
      });

      voicemailCall.number = oldVoicemailCallNumber;
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

    setup(function(done) {
      CallLogDBManager.add(call, function() {
        CallLogDBManager.add(call2, function() {
          CallLogDBManager.add(call3, function() {
            done();
          });
        });
      });
    });

    test('Check the last group of outgoing calls', function(done) {
      CallLogDBManager.getGroupAtPosition(1, 'lastEntryDate', true, 'dialing',
      function(group) {
        done(function checks() {
          checkGroup(group, call2, call2.date, 1);
        });
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

    setup(function(done) {
      CallLogDBManager.add(call, function() {
        CallLogDBManager.add(call2, function() {
          CallLogDBManager.add(call3, function() {
            done();
          });
        });
      });
    });

    test('Check the group at position 3', function(done) {
      CallLogDBManager.getGroupAtPosition(3, 'lastEntryDate', true, null,
      function(group) {
        done(function checks() {
          checkGroup(group, call, call.date, 1);
        });
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

    setup(function(done) {
      CallLogDBManager.add(call, function() {
        CallLogDBManager.add(call2, function() {
          CallLogDBManager.add(call3, function() {
            done();
          });
        });
      });
    });

    test('Check the group for the last of three calls', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.equal(groups.length, 3);
          checkGroup(groups[2], call2, call2.date, 1, true);
        });
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

    setup(function(done) {
      CallLogDBManager.add(call, function() {
        CallLogDBManager.add(call2, function() {
          CallLogDBManager.add(call3, function() {
            done();
          });
        });
      });
    });

    test('Check the group for the last of three calls', function(done) {
      CallLogDBManager.getGroupList(function(cursor) {
        done(function checks() {
          checkGroup(cursor.value, call, call.date, 1, true);
        });
      }, null, null, true);
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

    setup(function(done) {
      CallLogDBManager.add(call, function() {
        CallLogDBManager.add(call2, function() {
          CallLogDBManager.add(call3, function() {
            done();
          });
        });
      });
    });

    test('Check the group for the last of three calls', function(done) {
      CallLogDBManager.getGroupList(function(cursor) {
        done(function checks() {
          checkGroup(cursor.value, call, call.date, 1, true);
        });
      }, 'lastEntryDate', null, true);
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

    setup(function(done) {
      CallLogDBManager.add(call, function() {
        CallLogDBManager.add(call2, function() {
          CallLogDBManager.add(call3, function() {
            done();
          });
        });
      });
    });

    test('Check the group for the last of three calls', function(done) {
      CallLogDBManager.getGroupList(function(cursor) {
        done(function checks() {
          checkGroup(cursor.value, call3, call3.date, 1, true);
        });
      }, 'lastEntryDate', true, true);
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

    setup(function(done) {
      CallLogDBManager.add(call, function(group1) {
        groupList.push(group1);
        CallLogDBManager.add(call2, function(group2) {
          groupList.push(group2);
          done();
        });
      });
    });

    test('Check that we delete one group per date', function(done) {
      CallLogDBManager.deleteGroupList(groupList, function(result) {
        CallLogDBManager.getGroupList(function(groups) {
          done(function checks() {
            assert.lengthOf(groups, 0);
          });
        });
      });
    });
  });

  suite('deleteGroupList INVALID_GROUP_IN_LIST', function() {
    test('deleteGroupList error', function(done) {
      CallLogDBManager.deleteGroupList([11], function(result) {
        done(function checks() {
          assert.equal(typeof result, 'string');
          assert.equal(result, 'INVALID_GROUP_IN_LIST');
        });
      });
    });
  });

  suite('Delete a group of hidden calls', function() {
    var result = null;
    var call = {
      number: '',
      type: 'incoming',
      date: days[0],
      duration: duration
    };

    setup(function(done) {
      CallLogDBManager.add(call, function(group) {
        result = group;
        done();
      });
    });

    test('Check that the group has been deleted', function(done) {
      CallLogDBManager.deleteGroup(result, null, function() {
        CallLogDBManager.getGroupList(function(groups) {
          assert.lengthOf(groups, 0);
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

    setup(function(done) {
      _maxNumberOfGroups = CallLogDBManager._maxNumberOfGroups;
      _numberOfGroupsToDelete = CallLogDBManager._numberOfGroupsToDelete;
      CallLogDBManager._maxNumberOfGroups = 3;
      CallLogDBManager._numberOfGroupsToDelete = 2;

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

    teardown(function() {
      CallLogDBManager._maxNumberOfGroups = _maxNumberOfGroups;
      CallLogDBManager._numberOfGroupsToDelete = _numberOfGroupsToDelete;
    });

    test('Get count of groups', function(done) {
      CallLogDBManager.getGroupList(function(groups) {
        done(function checks() {
          assert.lengthOf(groups, 1);
        });
      });
    });
  });

  suite('getGroupList with invalid sortedBy', function() {
    test('getGroupList should fail', function(done) {
      CallLogDBManager.getGroupList(function(error) {
        done(function checks() {
          assert.ok(error);
          assert.equal(typeof error, 'string');
          assert.equal(error, 'INVALID_SORTED_BY_KEY');
        });
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

    test('when creating a group', function(done) {
      window.addEventListener('CallLogDbNewCall', function checkEvt(evt) {
        done(function checks() {
          window.removeEventListener('CallLogDbNewCall', checkEvt);
          assert.equal(evt.detail.group.lastEntryDate, call.date);
        });
      });
      CallLogDBManager.add(call);
    });

    test('when updating a group', function(done) {
      CallLogDBManager.add(call, function() {
        window.addEventListener('CallLogDbNewCall', function checkEvt(evt) {
          done(function checks() {
            window.removeEventListener('CallLogDbNewCall', checkEvt);
            assert.equal(evt.detail.group.lastEntryDate, call2.date);
          });
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
        });
        CallLogDBManager.updateGroupContactInfo(contact, { value: numbers[0] },
                                                function() { done(); });
      });
    });

    test('when removing contact information', function(done) {
      CallLogDBManager.add(call, function() {
        CallLogDBManager.updateGroupContactInfo(contact, { value: numbers[0] },
        function() {
          window.addEventListener('CallLogDbNewCall', function checkEvt(evt) {
            window.removeEventListener('CallLogDbNewCall', checkEvt);
            assert.isUndefined(evt.detail.group.contact);
          });
        });
        CallLogDBManager.removeGroupContactInfo(contact.id, null,
                                                function() { done(); });
      });
    });
  });
});
