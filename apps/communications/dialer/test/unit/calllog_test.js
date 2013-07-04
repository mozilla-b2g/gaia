requireApp('communications/dialer/js/call_log.js');
requireApp('communications/dialer/js/utils.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');

if (!this.LazyL10n) {
  this.LazyL10n = null;
}

suite('dialer/call_log', function() {
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  var incomingGroup = {
    id: '123',
    lastEntryDate: Date.now(),
    number: '111222333',
    type: 'incoming',
    status: 'connected',
    retryCount: 2,
    contact: {
      id: '456',
      primaryInfo: 'AA BB',
      matchingTel: {
        value: '111222333',
        type: 'Mobile',
        carrier: 'Telefonica'
      },
      photo: null
    }
  };

  var outgoingGroup = {
    id: '123',
    lastEntryDate: Date.now(),
    number: '111222333',
    type: 'dialing',
    status: 'connected',
    retryCount: 0,
    contact: {
      id: '456',
      primaryInfo: 'CC DD',
      matchingTel: {
        value: '111222333',
        type: 'Home',
        carrier: 'Vodafone'
      },
      photo: null
    }
  };

  var missedGroup = {
    id: '123',
    lastEntryDate: Date.now(),
    number: '111222333',
    type: 'incoming',
    status: '',
    retryCount: 0,
    contact: {
      id: '456',
      primaryInfo: 'EE FF',
      matchingTel: {
        value: '111222333',
        type: 'Mobile',
        carrier: 'Telefonica'
      },
      photo: null
    }
  };

  var noContactGroup = {
    id: '123',
    lastEntryDate: Date.now(),
    number: '111222333',
    type: 'incoming',
    status: '',
    retryCount: 0
  };

  var dummyContactWithName = {
    name: 'XX',
    org: 'Mozilla',
    matchingTel: {
      value: '222222',
      type: 'Mobile',
      carrier: 'Orange'
    }
  };

  var dummyContactNoName = {
    org: 'Mozilla',
    matchingTel: {
      value: '222222',
      type: 'Mobile',
      carrier: 'Orange'
    }
  };

  function checkGroupDOM(groupDOM, group, callback) {
    assert.ok(groupDOM, 'groupDOM exists');
    assert.ok(groupDOM instanceof Object, 'groupDOM is an object');
    // Label.
    var label = groupDOM.querySelector('.call-log-selection.danger');
    assert.ok(label, 'Label ok');
    assert.equal(label.className, 'pack-checkbox call-log-selection danger');

    // Input.
    var input = label.getElementsByTagName('input');
    assert.ok(input[0], 'Input ok');
    assert.equal(input[0].getAttribute('value'), group.id);

    // Contact photo.
    var contactPhotoElement = groupDOM.querySelector('.call-log-contact-photo');
    assert.ok(contactPhotoElement, 'Contact photo element');
    assert.equal(contactPhotoElement.className, 'call-log-contact-photo');

    // Call type.
    if (group.type === 'dialing' || group.type === 'alerting') {
      assert.ok(groupDOM.querySelector('.icon.call-type-icon.icon-outgoing'),
                'Outgoing call');
    } else if (group.type === 'incoming') {
      if (group.status === 'connected') {
        assert.ok(groupDOM.querySelector('.icon.call-type-icon.icon-incoming'),
                  'Incoming call');
      } else {
        assert.ok(groupDOM.querySelector('.icon.call-type-icon.icon-missed'),
                  'Missed call');
      }
    } else {
      assert.ok(false, 'Invalid group to test');
      return;
    }

    // Primary info.
    var primaryInfo = groupDOM.querySelector('.primary-info');
    assert.ok(primaryInfo, 'Primary info ok');
    var primaryInfoMain = primaryInfo.querySelector('.primary-info-main');
    assert.ok(primaryInfoMain, 'Primary info main ok');
    if (group.contact) {
      assert.equal(primaryInfoMain.innerHTML, group.contact.primaryInfo);
    } else {
      assert.equal(primaryInfoMain.innerHTML, group.number);
    }

    // Additional info.
    var addInfo = groupDOM.querySelector('.call-additional-info');
    var matchingTel;
    if (group.contact &&
        (matchingTel = group.contact.matchingTel) && matchingTel.value) {
      assert.ok(addInfo, 'Additional info ok');
      var expAddInfo;
      if (matchingTel.type) {
        expAddInfo = matchingTel.type;
      } else {
        expAddInfo = 'mobile';
      }
      if (matchingTel.carrier) {
        expAddInfo += ', ' + matchingTel.carrier;
      } else {
        expAddInfo += ', ' + matchingTel.value;
      }
      assert.equal(addInfo.innerHTML, expAddInfo);
    } else {
      assert.equal(addInfo, null, 'No additional info');
    }

    // Call time.
    var callTime = groupDOM.querySelector('.call-time');
    assert.ok(callTime, 'Call time ok');
    assert.equal(new Date(Date.parse(callTime.innerHTML)).getSeconds() -
                 new Date(group.lastEntryDate).getSeconds(), 0);

    // Retry count.
    var retryCount = groupDOM.querySelector('.retry-count');
    assert.ok(retryCount, 'Retry count ok');
    if (group.retryCount > 1) {
      assert.equal(retryCount.innerHTML, '(' + group.retryCount + ')');
    }
    callback();
  }

  function checkGroupDOMContactUpdated(groupDOM, contact, number, callback) {
    assert.ok(groupDOM, 'groupDOM exists');
    assert.ok(groupDOM instanceof Object, 'groupDOM is an object');

    // Primary info.
    var primaryInfo = groupDOM.querySelector('.primary-info');
    assert.ok(primaryInfo, 'Primary info ok');
    var primaryInfoMain = primaryInfo.querySelector('.primary-info-main');
    assert.ok(primaryInfoMain, 'Primary info main ok');
    if (contact && contact.name) {
      assert.equal(primaryInfoMain.innerHTML, contact.name);
    } else if (contact && contact.org) {
      assert.equal(primaryInfoMain.innerHTML, contact.org);
    } else if (number) {
      assert.equal(primaryInfoMain.innerHTML, number);
    }

    // Additional info.
    var addInfo = groupDOM.querySelector('.call-additional-info');
    if (contact && contact.matchingTel && contact.matchingTel.value) {
      assert.ok(addInfo, 'Additional info ok');
      var expAddInfo;
      if (contact.matchingTel.type) {
        expAddInfo = contact.matchingTel.type;
      } else {
        expAddInfo = 'mobile';
      }
      if (contact.matchingTel.carrier) {
        expAddInfo += ', ' + contact.matchingTel.carrier;
      } else {
        expAddInfo += ', ' + contact.matchingTel.value;
      }
      assert.equal(addInfo.innerHTML, expAddInfo);
    } else {
      assert.equal(addInfo.innerHTML, '', 'No additional info');
    }

    if (callback) {
      callback();
    }
  }

  suite('createGroup', function() {
    test('Incoming call', function(done) {
      checkGroupDOM(CallLog.createGroup(incomingGroup), incomingGroup, done);
    });

    test('Outgoing call', function(done) {
      checkGroupDOM(CallLog.createGroup(outgoingGroup), outgoingGroup, done);
    });

    test('Missed call', function(done) {
      checkGroupDOM(CallLog.createGroup(missedGroup), missedGroup, done);
    });

    test('No contact group', function(done) {
      checkGroupDOM(CallLog.createGroup(noContactGroup), noContactGroup, done);
    });
  });

  suite('updateContactInfo', function() {
    var groupDOM;
    setup(function() {
      groupDOM = CallLog.createGroup(incomingGroup);
    });

    test('Group successfully created', function(done) {
      checkGroupDOM(groupDOM, incomingGroup, done);
    });

    test('Update group with contact with name', function(done) {
      CallLog.updateContactInfo(groupDOM, dummyContactWithName,
                                dummyContactWithName.matchingTel);
      checkGroupDOMContactUpdated(groupDOM, dummyContactWithName,
                                  dummyContactWithName.matchingTel, done);
    });

    test('Update group with contact without name', function(done) {
      CallLog.updateContactInfo(groupDOM, dummyContactNoName,
                                dummyContactNoName.matchingTel);
      checkGroupDOMContactUpdated(groupDOM, dummyContactNoName,
                                  dummyContactNoName.matchingTel, done);
    });

    test('Update group no contact', function(done) {
      CallLog.updateContactInfo(groupDOM);
      checkGroupDOMContactUpdated(groupDOM, null, incomingGroup.number, done);
    });

  });
});
