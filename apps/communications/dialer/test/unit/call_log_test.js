'use strict';

/* global CallHandler, CallLog, CallLogDBManager, Contacts, KeypadManager,
          MockL10n, MockNavigatorMozIccManager,
          MocksHelper, MockSimSettingsHelper, Notification,
          CallGroupMenu, Utils, MockMozContacts */

require('/shared/js/dialer/utils.js');

require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_accessibility_helper.js');
require('/shared/test/unit/mocks/mock_image.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_sim_settings_helper.js');
require('/shared/test/unit/mocks/mock_sticky_header.js');

require('/dialer/test/unit/mock_call_group_menu.js');
require('/dialer/test/unit/mock_call_handler.js');
require('/dialer/test/unit/mock_call_log_db_manager.js');
require('/dialer/test/unit/mock_keypad.js');
require('/dialer/test/unit/mock_phone_number_action_menu.js');

var mocksHelperForCallLog = new MocksHelper([
  'asyncStorage',
  'CallLogDBManager',
  'Contacts',
  'AccessibilityHelper',
  'CallGroupMenu',
  'LazyLoader',
  'Notification',
  'StickyHeader',
  'CallHandler',
  'KeypadManager',
  'SimSettingsHelper'
]).init();

suite('dialer/call_log', function() {
  var realL10n;
  var realMozIccManager;
  var realMozContacts;

  mocksHelperForCallLog.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;

    require('/dialer/js/call_log.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozIccManager = realMozIccManager;
    navigator.mozContacts = realMozContacts;
  });

  var noResult;
  setup(function() {
    var mainNodes = [
      'all-filter',
      'call-log-container',
      'call-log-edit-mode',
      'call-log-filter',
      'edit-mode-header',
      'call-log-icon-edit',
      'call-log-view',
      'deselect-all-threads',
      'delete-button',
      'header-edit-mode-text',
      'missed-filter',
      'select-all-threads',
      'call-log-upgrading',
      'call-log-upgrade-progress',
      'call-log-upgrade-percent',
      'sticky'
    ];

    mainNodes.forEach(function(prop) {
      var fakeNode = document.createElement('div');
      fakeNode.id = prop;
      document.body.appendChild(fakeNode);
    });

    noResult = document.createElement('div');
    noResult.id = 'no-result-container';
    var msgs = ['no-result-msg1', 'no-result-msg2', 'no-result-msg3'];
    msgs.forEach(function(name) {
      var node = document.createElement('div');
      node.id = name;
      noResult.appendChild(node);
    });
    document.body.appendChild(noResult);
    document.body.classList.remove('recents-edit');

    this.sinon.stub(MockL10n.DateTimeFormat.prototype, 'localeFormat',
      function(date, format) { return date; });

    /* Assume that the contact cache is valid during the tests and make the
     * promise used to validaate it return synchronously. */
    this.sinon.stub(CallLog, '_validateContactsCache', function() {
      this._contactCache = true;
      return { then: function(callback) { callback(); } };
    });
    CallLog.init();
    window.location.hash = '#call-log-view';
  });

  teardown(function() {
    CallLogDBManager.deleteAll(CallLog.render.bind(CallLog));
    noResult.parentNode.removeChild(noResult);
    CallLog._initialized = false;
    MockNavigatorMozIccManager.mTeardown();
  });

  var incomingGroup = {
    id: '123',
    lastEntryDate: Date.now(),
    date: 1,
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

  var firstSimGroup = {
    id: '1222',
    lastEntryDate: Date.now(),
    date: 1,
    number: '3345321',
    serviceId: '0',
    type: 'incoming',
    status: 'connected'
  };

  var outgoingGroup = {
    id: '123',
    lastEntryDate: Date.now(),
    date: 2,
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

  var secondSimGroup = {
    id: '1244',
    lastEntryDate: Date.now(),
    date: 1,
    number: '424242',
    serviceId: '1',
    type: 'dialing',
    status: 'connected'
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

  var noNumberGroup = {
    id: '123',
    lastEntryDate: Date.now(),
    type: 'incoming',
    status: '',
    retryCount: 0
  };

  var voicemailGroup = {
    id: '123',
    lastEntryDate: Date.now(),
    number: '123',
    type: 'dialing',
    status: 'connected',
    retryCount: 3,
    voicemail: true
  };

  var emergencyGroup = {
    id: '123',
    lastEntryDate: Date.now(),
    number: '112',
    type: 'dialing',
    status: 'connected',
    retryCount: 1,
    emergency: true
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

  function appendAndCheckGroupDOM(count, date, callback) {
    var groups = [];
    for (var i = 1; i <= count; i++) {
      var grp = JSON.parse(JSON.stringify(incomingGroup));
      grp.id = i;
      grp.date = date ? date : i;
      groups.push(grp);
      CallLogDBManager.add(grp);
    }
    CallLog.render();
    setTimeout(function() {
      var sections = CallLog.callLogContainer.getElementsByTagName('section');
      var i, groupDOM, doms;
      if (date) {
        assert.equal(sections.length, 1);
        groupDOM = sections[0].getElementsByTagName('ol')[0];
        doms = groupDOM.getElementsByTagName('li');
        for (i = 0; i < count; i++) {
          checkGroupDOM(doms[i], groups[i], null);
        }
      } else {
        assert.equal(sections.length, count);
        for (i = 0; i < count; i++) {
          groupDOM = sections[i].getElementsByTagName('ol')[0];
          doms = groupDOM.getElementsByTagName('li');
          checkGroupDOM(doms[0], groups[i], null);
        }
      }
      callback();
    });
  }

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

    // DSDS SIM display.
    if (group.serviceId === '0') {
      assert.ok(groupDOM.querySelector('.icon.call-type-icon.first-sim'),
                'First sim call');
    } else if (group.serviceId === '1') {
      assert.ok(groupDOM.querySelector('.icon.call-type-icon.second-sim'),
                'Second sim call');
    }

    // Primary info.
    var primaryInfo = groupDOM.querySelector('.primary-info');
    assert.ok(primaryInfo, 'Primary info ok');
    var primaryInfoMain = primaryInfo.querySelector('.primary-info-main');
    assert.ok(primaryInfoMain, 'Primary info main ok');
    if (group.contact) {
      assert.equal(primaryInfoMain.querySelector('bdi').innerHTML,
                   group.contact.primaryInfo);
    } else {
      // Labels checking
      if (group.voicemail || group.emergency) {
        var expected =
          group.voicemail ? 'voiceMail' :
            (group.emergency ? 'emergencyNumber' : '');
        assert.equal(primaryInfoMain.getAttribute('data-l10n-id'), expected);
        assert.isNull(primaryInfoMain.querySelector('bdi'));
      } else if (group.number) {
        assert.equal(
          primaryInfoMain.querySelector('bdi').innerHTML, group.number);
      } else {
        assert.equal(
          primaryInfoMain.querySelector('bdi').getAttribute('data-l10n-id'),
          'withheld-number'
        );
      }
    }

    // Additional info.
    var addInfo = groupDOM.querySelector('.additional-info');
    var typeCarrier = addInfo.querySelector('.type-carrier');
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
      assert.equal(typeCarrier.innerHTML, expAddInfo);
    } else if (group.voicemail || group.emergency) {
      assert.equal(typeCarrier.innerHTML, group.number);
    } else {
      assert.equal(typeCarrier.getAttribute('data-l10n-id'), 'unknown',
                   'No additional info');
    }

    // Call time.
    var callTime = groupDOM.querySelector('.call-time');
    assert.ok(callTime, 'Call time ok');
    assert.equal(new Date(Date.parse(callTime.innerHTML)).getSeconds() -
                 new Date(group.lastEntryDate).getSeconds(), 0);

    // Retry count.
    var retryCount = groupDOM.querySelector('.retry-count');
    if (group.retryCount > 1) {
      assert.isNotNull(retryCount);
      assert.equal(
        retryCount.innerHTML,
        '(' + group.retryCount + ')');
    } else {
      assert.isNull(retryCount);
    }
    if (callback) {
      callback();
    }
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
      assert.equal(primaryInfoMain.querySelector('bdi').innerHTML,
                   contact.name);
    } else if (contact && contact.org) {
      assert.equal(primaryInfoMain.querySelector('bdi').innerHTML, contact.org);
    } else if (number) {
      assert.equal(primaryInfoMain.querySelector('bdi').innerHTML, number);
    }

    // Additional info.
    var addInfo = groupDOM.querySelector('.additional-info');
    var typeCarrier = addInfo.querySelector('.type-carrier');
    if (contact && contact.matchingTel && contact.matchingTel.value) {
      assert.ok(addInfo, 'Additional info ok');
      var expTypeCarrier;
      if (contact.matchingTel.type) {
        expTypeCarrier = contact.matchingTel.type;
      } else {
        expTypeCarrier = 'mobile';
      }
      if (contact.matchingTel.carrier) {
        expTypeCarrier += ', ' + contact.matchingTel.carrier;
      } else {
        expTypeCarrier += ', ' + contact.matchingTel.value;
      }
      assert.equal(typeCarrier.innerHTML, expTypeCarrier);
    } else {
      assert.equal(typeCarrier.innerHTML, '', 'No additional info');
    }

    if (callback) {
      callback();
    }
  }

  suite('timeformatchange', function() {

    test('update times to new 12/24 timeformat', function(done) {
      this.sinon.spy(Utils, 'prettyDate');
      var numEntries = 2;
      var fakeClockTime12 = '12:02 <span>PM</span>';
      var fakeClockTime24 = '13:14';
      window.navigator.mozHour12 = false;

      var self = this;
      // This calls checkGroupDOM which validates the time is there.
      appendAndCheckGroupDOM(numEntries, null, function() {
        self.sinon.stub(MockL10n, 'DateTimeFormat', function() {
          this.localeFormat = function(date, format) {
            if (format === 'shortTimeFormat12') {
              return fakeClockTime12;
            } else if (format === 'shortTimeFormat24') {
              return fakeClockTime24;
            }
            return '';
          };
        });

        sinon.assert.callCount(Utils.prettyDate, numEntries);
        Utils.prettyDate.reset();

        window.navigator.mozHour12 = true;
        window.dispatchEvent(new CustomEvent('timeformatchange'));
        sinon.assert.calledWith(Utils.prettyDate, incomingGroup.lastEntryDate);
        sinon.assert.callCount(Utils.prettyDate, numEntries);

        // Test that when we set it to 12 hr and update, items are updated.
        var logItems = CallLog.callLogContainer.querySelectorAll('.log-item');
        for (var i = 0; i < logItems.length; i++) {
          var logItemElt = logItems[i];
          var callTime = logItemElt.querySelector('.call-time');
          assert.equal(callTime.textContent, fakeClockTime12 + ' ');
        }

        done();
      });
    });
  });

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

    test('No number group', function(done) {
      checkGroupDOM(CallLog.createGroup(noNumberGroup), noNumberGroup, done);
    });

    test('Voicemail group', function(done) {
      checkGroupDOM(CallLog.createGroup(voicemailGroup), voicemailGroup, done);
    });

    test('Emergency group', function(done) {
      checkGroupDOM(CallLog.createGroup(emergencyGroup), emergencyGroup, done);
    });

    test('Group on first sim', function(done) {
      checkGroupDOM(CallLog.createGroup(firstSimGroup), firstSimGroup, done);
    });

    test('Group on second sim', function(done) {
      checkGroupDOM(CallLog.createGroup(secondSimGroup), secondSimGroup, done);
    });
  });

  suite('render', function() {
    var renderSeveralDaysSpy;

    setup(function() {
      renderSeveralDaysSpy = this.sinon.spy(CallLog, 'renderSeveralDays');
    });

    test('Below first render threshold same day', function(done) {
      appendAndCheckGroupDOM(5, 1, function() {
        sinon.assert.callCount(renderSeveralDaysSpy, 1);
        done();
      });
    });

    test('Above first render threshold same day', function(done) {
      appendAndCheckGroupDOM(10, 1, function() {
        sinon.assert.callCount(renderSeveralDaysSpy, 1);
        done();
      });
    });

    test('Below first render threshold different days', function(done) {
      appendAndCheckGroupDOM(5, null, function() {
        sinon.assert.callCount(renderSeveralDaysSpy, 1);
        done();
      });
    });

    test('Above first render threshold different days', function(done) {
      appendAndCheckGroupDOM(10, null, function() {
        sinon.assert.callCount(renderSeveralDaysSpy, 2);
        done();
      });
    });

    test('Below batch render threshold', function(done) {
      appendAndCheckGroupDOM(80, null, function() {
        sinon.assert.callCount(renderSeveralDaysSpy, 2);
        done();
      });
    });

    test('Above batch render threshold', function(done) {
      appendAndCheckGroupDOM(120, null, function() {
        sinon.assert.callCount(renderSeveralDaysSpy, 3);
        done();
      });
    });

    test('Multiple batch renders', function(done) {
      appendAndCheckGroupDOM(500, null, function() {
        sinon.assert.callCount(renderSeveralDaysSpy, 6);
        done();
      });
    });

    test('First render batch crossed in middle of a day', function(done) {
      // Day 1 - 1 group
      var grp = JSON.parse(JSON.stringify(incomingGroup));
      grp.id = 1;
      grp.date = 1;
      CallLogDBManager.add(grp);
      // Day 2 - 100 groups
      var i;
      for (i = 2; i < 102; i++) {
        grp = JSON.parse(JSON.stringify(incomingGroup));
        grp.id = i;
        grp.date = 2;
        CallLogDBManager.add(grp);
      }
      // Day 3 - 10 group
      for (i = 102; i < 112; i++) {
        grp = JSON.parse(JSON.stringify(incomingGroup));
        grp.id = i;
        grp.date = 3;
        CallLogDBManager.add(grp);
      }

      CallLog.render();
      setTimeout(function() {
        sinon.assert.callCount(renderSeveralDaysSpy, 2);
        done();
      });
    });
  });

  suite('StickyHeader', function() {
    test('Updated on render', function(done) {
      this.sinon.spy(CallLog.sticky, 'refresh');
      appendAndCheckGroupDOM(10, 1, function() {
        sinon.assert.called(CallLog.sticky.refresh);
        done();
      });
    });

    test('Updated on appendGroup', function() {
      this.sinon.spy(CallLog.sticky, 'refresh');
      CallLog.appendGroup(noContactGroup);
      sinon.assert.called(CallLog.sticky.refresh);
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

  suite('notifications', function() {

    setup(function() {
      var notificationGetStub = function notificationGet() {
        var options = {};
        options.body = 'Notification body';
        return {
          then: function(onSuccess, onError, onProgress) {
            onSuccess([
              new Notification('0', options),
              new Notification('1', options)
            ]);
          }
        };
      };
      this.sinon.stub(Notification, 'get', notificationGetStub);
      this.sinon.spy(Notification.prototype, 'close');
    });

    test('notifications are closed when opening the call log', function() {
      CallLog._initialized = false;
      CallLog.init();
      sinon.assert.callCount(Notification.prototype.close, 2);
    });

    test('notifications should not be closed when keypad becomes visible',
         function() {
      window.location.hash = '#keyboard-view';
      var visibilityEvent = new CustomEvent('visibilitychange');
      document.dispatchEvent(visibilityEvent);
      sinon.assert.notCalled(Notification.prototype.close);
    });
  });

  suite('Edit mode >', function() {
    suite('Entering edit mode', function() {
      setup(function() {
        CallLog.callLogIconEdit.removeAttribute('disabled');
        CallLog.showEditMode();
      });

      teardown(function() {
        CallLog.hideEditMode();
      });

      test('should fill the header', function() {
        assert.equal(CallLog.headerEditModeText.getAttribute('data-l10n-id'),
                     'edit');
      });

      test('should disable the delete button at first', function() {
        assert.equal(CallLog.deleteButton.getAttribute('disabled'),
                     'disabled');
      });

      test('should disable the deselect button at first', function() {
        assert.equal(CallLog.deselectAllThreads.getAttribute('disabled'),
                     'disabled');
      });

      test('should fill the select all button', function() {
        assert.equal(CallLog.selectAllThreads.getAttribute('data-l10n-id'),
                     'selectAll');
      });

      test('should enable the select all button', function() {
        CallLog.selectAllThreads.setAttribute('disabled', 'disabled');
        CallLog.showEditMode();
        assert.isNull(CallLog.selectAllThreads.getAttribute('disabled'));
      });

      test('should put the body in recents-edit mode', function() {
        assert.isTrue(document.body.classList.contains('recents-edit'));
      });
    });

    suite('Exiting edit mode', function() {
      setup(function() {
        CallLog.callLogContainer.innerHTML = '' +
         '<input type="checkbox" checked>' +
         '<input type="checkbox" checked>' +
         '<input type="checkbox" checked>';
        CallLog.callLogIconEdit.removeAttribute('disabled');
        CallLog.showEditMode();
        CallLog.hideEditMode();
      });

      test('should put the body out of recents-edit mode', function() {
        assert.isFalse(document.body.classList.contains('recents-edit'));
      });

      test('should uncheck the items', function() {
        var container = CallLog.callLogContainer;
        var checkboxes = container.querySelectorAll('input[type="checkbox"]');
        for (var i = 0; i < checkboxes.length; i++) {
          var checkbox = checkboxes[i];
          assert.isFalse(checkbox.checked);
        }
      });
    });
  });

  suite('Filter', function() {
    setup(function() {
      var yesterdayGroup = outgoingGroup;
      yesterdayGroup.id = 456;
      CallLog.appendGroup(incomingGroup);
      CallLog.appendGroup(yesterdayGroup);
    });

    test('filtering should mark all missedgroups', function() {
      CallLog.filter();
      assert.equal(document.getElementsByClassName('groupFiltered').length, 2);
    });

    test('unfiltering should remove all classes', function() {
      CallLog.filter();
      CallLog.unfilter();
      assert.equal(document.getElementsByClassName('groupFiltered').length, 0);
    });
  });

  suite('Opening contact details', function() {
    var groupDOM;
    var callGroupMenuSpy;

    setup(function() {
      callGroupMenuSpy = this.sinon.spy(CallGroupMenu, 'show');
    });

    test('regular number', function() {
      groupDOM = CallLog.createGroup(incomingGroup);
      CallLog.handleEvent({target: groupDOM, preventDefault: function() {}});

      sinon.assert.calledWith(
        callGroupMenuSpy,
        incomingGroup.contact.primaryInfo,
        incomingGroup.contact.matchingTel.value,
        incomingGroup.lastEntryDate.toString(),
        incomingGroup.type
      );
    });

    test('missed number', function() {
      groupDOM = CallLog.createGroup(missedGroup);
      CallLog.handleEvent({target: groupDOM, preventDefault: function() {}});

      sinon.assert.calledWith(
        callGroupMenuSpy,
        missedGroup.contact.primaryInfo,
        missedGroup.contact.matchingTel.value,
        missedGroup.lastEntryDate.toString(),
        missedGroup.type
      );
    });
  });

  suite('DSDS support', function() {
    setup(function() {
      CallLog._initialized = false;
    });

    var simulateClick = function(button) {
      var ev = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      button.dispatchEvent(ev);
    };

    var simulateContextMenu = function(button) {
      var ev = document.createEvent('MouseEvents');
      ev.initMouseEvent('contextmenu', true, false, window, 0, 0, 0, 0, 0,
                        false, false, false, false, 2, null);
      button.dispatchEvent(ev);
    };

    var longPressShouldShowActionMenu = function() {
      var showSpy = this.sinon.spy(CallGroupMenu, 'show');
      simulateContextMenu(CallLog.appendGroup(missedGroup));
      sinon.assert.calledWith(
        showSpy, missedGroup.contact.primaryInfo, missedGroup.number);
    };

    [0, 1].forEach(function(cardIndex) {
      suite('One SIM in slot ' + cardIndex, function() {
        setup(function() {
          MockNavigatorMozIccManager.addIcc('12345', {'cardState': 'ready'});
          MockSimSettingsHelper._defaultCards.outgoingCall = cardIndex;
          CallLog.init();
        });

        test('should not put the dual sim class on the container', function() {
          assert.isFalse(
            CallLog.callLogContainer.classList.contains('dual-sim'));
        });

        test('tapping the entry should place call immediately', function() {
          var callSpy = this.sinon.spy(CallHandler, 'call');
          simulateClick(CallLog.appendGroup(missedGroup));
          sinon.assert.calledWith(callSpy, missedGroup.number,
            MockSimSettingsHelper._defaultCards.outgoingCall);
        });

        test('long pressing the entry should show action menu',
             longPressShouldShowActionMenu);
      });
    });

    suite('Dual SIM', function() {
      setup(function() {
        MockNavigatorMozIccManager.addIcc('12345', {'cardState': 'ready'});
        MockNavigatorMozIccManager.addIcc('3232', {'cardState': 'ready'});
        CallLog.init();
      });

      test('should put the dual sim class on the container', function() {
        assert.isTrue(CallLog.callLogContainer.classList.contains('dual-sim'));
      });

      test('tapping the entry should switch to keypad view', function() {
        var updateSpy = this.sinon.spy(KeypadManager, 'updatePhoneNumber');
        assert.notEqual(window.location.hash, '#keyboard-view');
        assert.notEqual(KeypadManager.phoneNumber(), missedGroup.number);
        simulateClick(CallLog.appendGroup(missedGroup));
        assert.equal(window.location.hash, '#keyboard-view');
        assert.equal(KeypadManager.phoneNumber(), missedGroup.number);
        sinon.assert.calledWith(updateSpy, missedGroup.number);
      });

      test('long pressing the entry should show action menu',
           longPressShouldShowActionMenu);
    });
  });

  suite('oncontactchange', function() {
    suite('contact removed', function() {
      var allLogs;

      setup(function() {
        // Insert two groups with same contact
        var grp = JSON.parse(JSON.stringify(incomingGroup));
        grp.id = 1;
        grp.date = 1;
        CallLogDBManager.add(grp);

        grp = JSON.parse(JSON.stringify(incomingGroup));
        grp.id = 2;
        grp.date = 2;
        CallLogDBManager.add(grp);

        CallLog.render();

        this.sinon.stub(Contacts, 'findByNumber');

        var contactEvent = {
          reason: 'remove',
          contactID: incomingGroup.contact.id
        };
        navigator.mozContacts.oncontactchange(contactEvent);

        allLogs = document.body.getElementsByClassName('log-item');
      });

      suite('no new matching contact', function() {
        setup(function() {
          Contacts.findByNumber.yield();
        });

        test('all groups have no contact-id', function() {
          for (var log of allLogs) {
            assert.isUndefined(log.dataset.contactId);
          }
        });

        test('all groups display the number', function() {
          for (var log of allLogs) {
            var primaryInfo = log.querySelector('.primary-info');
            var primaryInfoMain =
              primaryInfo.querySelector('.primary-info-main');
            assert.equal(primaryInfoMain.textContent, incomingGroup.number);
          }
        });

        test('all groups display "Unknown" type', function() {
          for (var log of allLogs) {
            var type = log.querySelector('.additional-info .type-carrier');
            assert.equal(type.getAttribute('data-l10n-id'), 'unknown');
          }
        });
      });

      suite('find new matching contacts', function() {
        var newContact;
        var matchingTel;

        setup(function() {
          matchingTel = {
            value: '111222333',
            type: 'Mobile',
            carrier: 'Telefonica'
          };
          newContact = {
            id: '2131245135413',
            name: 'other contact',
            matchingTel: matchingTel
          };
          Contacts.findByNumber.yield(newContact, matchingTel);
        });

        test('all groups have the new contact-id', function() {
          for (var log of allLogs) {
            assert.equal(log.dataset.contactId, newContact.id);
          }
        });

        test('all groups have the new contact name', function() {
          for (var log of allLogs) {
            var primaryInfo = log.querySelector('.primary-info');
            var primaryInfoMain =
              primaryInfo.querySelector('.primary-info-main');
            assert.equal(primaryInfoMain.textContent, newContact.name);
          }
        });
      });
    });
  });
});
