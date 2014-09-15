'use strict';

/* globals CallInfo, CallLogDBManager, MockL10n, MocksHelper, Utils, LazyLoader,
           MockContactsButtons */

require('/dialer/test/unit/mock_call_log_db_manager.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/contacts/mock_contacts_buttons.js');

require('/dialer/js/call_info.js');

var mocksHelperForCallInfoView = new MocksHelper([
  'CallLogDBManager',
  'LazyLoader',
  'MozActivity',
  'Utils',
  'ContactsButtons',
  'Contacts'
]).init();

suite('Call Info', function(argument) {
  var realL10n;

  mocksHelperForCallInfoView.attachTestHelpers();

  var contactsIframe;
  var phoneDetailsHTML;
  var emailDetailsHTML;

  var groupReturn = {
    number: '12345',
    date: 1,
    type: 'incoming',
  };

  var fakeNumber = '12345';
  var fakeDate = '1';
  var fakeType = 'incoming';
  var fakeStatus = 'connected';

  var injectFragmentAsSection = function(name) {
    var section = document.createElement('section');
    section = document.createElement('section');
    section.setAttribute('role', 'region');
    section.id = name;
    section.hidden = true;
    var html = section.innerHTML =
      document.body.querySelector(
        'element[name="' + name + '"] template').innerHTML;
    document.body.appendChild(section);
    return html;
  };

  var initCallInfo = function() {
    document.body.innerHTML = '';

    loadBodyHTML('/contacts/elements/phone_details.html');
    var phoneDetailsTemplate = document.body.innerHTML;
    loadBodyHTML('/contacts/elements/email_details.html');
    var emailDetailsTemplate = document.body.innerHTML;
    loadBodyHTML('/dialer/elements/call-info-view.html');
    document.body.innerHTML += phoneDetailsTemplate + emailDetailsTemplate;

    phoneDetailsHTML = injectFragmentAsSection('phone-details');
    emailDetailsHTML = injectFragmentAsSection('email-details');
    injectFragmentAsSection('call-info-view');

    contactsIframe = document.createElement('iframe');
    contactsIframe.id = 'iframe-contacts';
    document.body.appendChild(contactsIframe);

    CallInfo._initialised = false;
    CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
  };

  var dispatchCloseViewEvent = function() {
    var evt = new CustomEvent('action', {
      detail: {
        type: 'back'
      }
    });
    document.getElementById('call-info-gaia-header').dispatchEvent(evt);
  };

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    this.sinon.stub(CallLogDBManager, 'getGroup').returns({
      then: function(callback) {
        callback(groupReturn);
      }
    });

    initCallInfo();
  });

  suite('fragment injection', function() {
    var callInfoView;

    setup(function() {
      callInfoView = document.getElementById('call-info-view');

      this.sinon.spy(LazyLoader, 'load');
      initCallInfo();
    });

    test('lazy-loads styles', function() {
      assert.include(LazyLoader.load.args[0][0],
                     '/shared/style/contacts/contacts_buttons.css');
      assert.include(LazyLoader.load.args[0][0],
                     '/shared/style/contacts.css');
      assert.include(LazyLoader.load.args[0][0],
                     '/dialer/style/buttons.css');
    });

    test('lazy-loads fragments', function() {
      var phoneDetailsElt = document.getElementById('phone-details');
      var emailDetailsElt = document.getElementById('email-details');
      sinon.assert.calledWith(LazyLoader.load,
                              [phoneDetailsElt, emailDetailsElt]);
    });

    test('injects phone-details', function() {
      var phoneDetailsElt = callInfoView.querySelector('#phone-details');
      assert.equal(phoneDetailsElt.innerHTML, phoneDetailsHTML);
      assert.isNull(document.getElementById('phone-details-stub'));
    });

    test('injects email-details', function() {
      var emailDetailsElt = callInfoView.querySelector('#email-details');
      assert.equal(emailDetailsElt.innerHTML, emailDetailsHTML);
      assert.isNull(document.getElementById('email-details-stub'));
    });
  });

  suite('ContactsButtons', function() {
    test('initialized after loading fragments', function() {
      this.sinon.spy(MockContactsButtons, 'init');

      initCallInfo();

      var listDetailsElt = document.getElementById('call-info-list-details');
      var contactDetailsElt = document.getElementById('contact-detail');

      sinon.assert.calledWith(MockContactsButtons.init,
                              listDetailsElt, contactDetailsElt);
    });

    test('without contact, renders phones', function() {
      this.sinon.spy(MockContactsButtons, 'renderPhones');

      initCallInfo();

      var contact = {
        tel: [
          {
            value: fakeNumber,
            type: 'mobile'
          }
        ]
      };
      sinon.assert.calledWith(MockContactsButtons.renderPhones, contact);
    });

    test('with contact, renders phones and emails', function() {
      this.sinon.spy(MockContactsButtons, 'renderPhones');
      this.sinon.spy(MockContactsButtons, 'renderEmails');

      var contact = {
        matchingTel: {
          number: '54321'
        }
      };
      var expectedContact = {
        id: 'id',
        name: ['test name'],
        tel: [{
          value: '54321',
          carrier: 'carrier',
          type: 'type'
        }],
        photo: ['test']
      };
      var oldContact = groupReturn.contact;
      groupReturn.contact = contact;
      initCallInfo();
      groupReturn.contact = oldContact;

      sinon.assert.calledWith(MockContactsButtons.renderPhones,
                              expectedContact);
      sinon.assert.calledWith(MockContactsButtons.renderEmails,
                              expectedContact);
    });

    test('clears buttons before each render', function(done) {
      initCallInfo();

      var listDetailsElt = document.getElementById('call-info-list-details');
      listDetailsElt.innerHTML = 'test<span>tset</span>';

      function checkIsListDetailsClear() {
        assert.equal(listDetailsElt.innerHTML, '');
        done();
      }

      this.sinon.stub(MockContactsButtons, 'renderPhones',
                      checkIsListDetailsClear);
      this.sinon.stub(MockContactsButtons, 'renderEmails',
                      checkIsListDetailsClear);

      CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
    });

    test('should highlight selected number as not missed', function() {
      this.sinon.spy(MockContactsButtons, 'reMark');

      var oldType = groupReturn.type;
      groupReturn.type = 'not-incoming';
      initCallInfo();
      groupReturn.type = oldType;

      sinon.assert.calledWith(MockContactsButtons.reMark,
                              'tel', fakeNumber, 'remark');
    });

    test('should highlight selected and incoming number as not missed',
    function() {
      this.sinon.spy(MockContactsButtons, 'reMark');

      var oldType = groupReturn.type;
      var oldStatus = groupReturn.status;
      groupReturn.type = 'incoming';
      groupReturn.status = 'connected';
      initCallInfo();
      groupReturn.type = oldType;
      groupReturn.status = oldStatus;

      sinon.assert.calledWith(MockContactsButtons.reMark,
                              'tel', fakeNumber, 'remark');
    });

    test('should highlight selected and missed number as missed', function() {
      this.sinon.spy(MockContactsButtons, 'reMark');

      var oldType = groupReturn.type;
      var oldStatus = groupReturn.status;
      groupReturn.type = 'incoming';
      groupReturn.status = 'not-connected';
      initCallInfo();
      groupReturn.type = oldType;
      groupReturn.status = oldStatus;

      sinon.assert.calledWith(MockContactsButtons.reMark,
                              'tel', fakeNumber, 'remark-missed');
    });
  });

  suite('common', function() {
    setup(function() {
      this.sinon.stub(Utils, 'headerDate').returns('TADA !');
      CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
    });

    test('displays the view', function() {
      assert.isFalse(document.getElementById('call-info-view').hidden);
    });

    test('looks up the right group', function() {
      sinon.assert.calledWith(CallLogDBManager.getGroup,
        fakeNumber, parseInt(fakeDate, 10), fakeType, fakeStatus);
    });

    test('tapping the close button closes the view', function() {
      dispatchCloseViewEvent();
      assert.isTrue(document.getElementById('call-info-view').hidden);
    });

    test('sets day for call list', function() {
      assert.equal(document.getElementById('call-info-day').textContent,
                   'TADA !');
    });

    test('view title is set', function() {
      var callInfoTitle = document.getElementById('call-info-title');
      assert.equal(callInfoTitle.textContent, fakeNumber);
    });

    suite('Number is voicemail', function() {
      setup(function() {
        groupReturn.voicemail = true;
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
      });

      teardown(function() {
        groupReturn.voicemail = false;
      });

      test('view title is set', function() {
        var callInfoTitle = document.getElementById('call-info-title');
        assert.equal(callInfoTitle.getAttribute('data-l10n-id'), 'voiceMail');
      });
    });

    suite('Number is emergency', function() {
      setup(function() {
        groupReturn.emergency = true;
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
      });

      teardown(function() {
        groupReturn.emergency = false;
      });

      test('view title is set', function() {
        var callInfoTitle = document.getElementById('call-info-title');
        assert.equal(callInfoTitle.getAttribute('data-l10n-id'),
                     'emergencyNumber');
      });
    });

    suite('Call direction', function() {
      var previousType;
      var previousStatus;
      var classList;

      setup(function() {
        previousType = groupReturn.type;
        previousStatus = groupReturn.status;
        classList = document.getElementById('call-info-direction').classList;
      });

      teardown(function() {
        groupReturn.type = previousType;
        groupReturn.status = previousStatus;
      });

      ['dialing', 'alerting'].forEach(function(type) {
        test('outgoing ' + type, function() {
          groupReturn.type = type;
          CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);

          assert.isTrue(classList.contains('icon-outgoing'));
          assert.isFalse(classList.contains('icon-incoming'));
          assert.isFalse(classList.contains('icon-missed'));
        });
      });

      test('incoming', function() {
        groupReturn.type = 'incoming';
        groupReturn.status = 'connected';
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);

        assert.isFalse(classList.contains('icon-outgoing'));
        assert.isTrue(classList.contains('icon-incoming'));
        assert.isFalse(classList.contains('icon-missed'));
      });

      test('missed', function() {
        groupReturn.type = 'incoming';
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);

        assert.isFalse(classList.contains('icon-outgoing'));
        assert.isFalse(classList.contains('icon-incoming'));
        assert.isTrue(classList.contains('icon-missed'));
      });
    });
  });

  suite('displaying calls', function() {
    setup(function() {
      groupReturn.calls = [
        {date: 123, duration: 0},
        {date: 456, duration: 12},
        {date: 789, duration: 9001}
      ];

      this.sinon.stub(Utils, 'prettyDate').returns('wesh');
      this.sinon.stub(Utils, 'prettyDuration').returnsArg(0);

      this.sinon.useFakeTimers();
      CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
      this.sinon.clock.tick();
    });

    teardown(function() {
      delete groupReturn.calls;
    });

    test('creates three rows', function() {
      var rows = document.getElementsByClassName('call-duration');
      assert.equal(rows.length, 3);
    });

    test('displays a friendly start date', function() {
      sinon.assert.calledWith(Utils.prettyDate, groupReturn.calls[0].date);
      sinon.assert.calledWith(Utils.prettyDate, groupReturn.calls[1].date);
      var startTimes = document.getElementsByClassName('cd__start-time');
      for (var startTime of startTimes) {
        assert.equal(startTime.textContent, 'wesh');
      }
    });

    test('displays calls in the proper order', function() {
      var durations = document.getElementsByClassName('cd__duration');
      for (var i=1; i < durations.length; i++) {
        sinon.assert.calledWith(Utils.prettyDuration, durations[i],
          groupReturn.calls[i].duration, 'callDurationTextFormat');
      }
    });

    suite('calls with 0 duration', function() {
      var previousType;

      setup(function() {
        previousType = groupReturn.type;
      });

      teardown(function() {
        groupReturn.type = previousType;
      });

      test('canceled calls', function() {
        groupReturn.type = 'dialing';
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
        this.sinon.clock.tick();

        var durations = document.getElementsByClassName('cd__duration');
        assert.equal(durations[0].getAttribute('data-l10n-id'), 'canceled');
      });

      test('missed calls', function() {
        groupReturn.type = 'incoming';
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
        this.sinon.clock.tick();

        var durations = document.getElementsByClassName('cd__duration');
        assert.equal(durations[0].getAttribute('data-l10n-id'), 'info-missed');
      });
    });

    test('adapts to timeformat changes', function() {
      Utils.prettyDate.returns('wesh24!');

      window.dispatchEvent(new CustomEvent('timeformatchange'));
      var startTimeElts = document.querySelectorAll('.js-ci-start-times');
      for (var i=0, il=startTimeElts.length; i<il; i++) {
        sinon.assert.calledWith(Utils.prettyDate,
                                parseInt(startTimeElts[i].dataset.date, 10));
        assert.equal(startTimeElts[i].textContent, 'wesh24!');
      }
    });

  });

  suite('action buttons', function() {
    var detailsButton;
    var addToContactButton;
    var createContactButton;

    setup(function() {
      detailsButton = document.getElementById('call-info-details');
      addToContactButton = document.getElementById('call-info-add');
      createContactButton = document.getElementById('call-info-create');

      this.sinon.spy(window, 'MozActivity');
    });

    suite('no contact', function() {
      test('only contact creation ones are displayed', function() {
        assert.isTrue(detailsButton.hidden);
        assert.isFalse(addToContactButton.hidden);
        assert.isFalse(createContactButton.hidden);
      });

      test('add a contact launches an activity', function() {
        addToContactButton.click();
        sinon.assert.calledWith(window.MozActivity, {
          name: 'update',
          data: {
            type: 'webcontacts/contact',
            params: {
              'tel': fakeNumber
            }
          }
        });
      });

      test('create a contact launches an activity', function() {
        createContactButton.click();
        sinon.assert.calledWith(window.MozActivity, {
          name: 'new',
          data: {
            type: 'webcontacts/contact',
            params: {
              'tel': fakeNumber
            }
          }
        });
      });
    });

    suite('with a contact', function() {
      setup(function() {
        groupReturn.contact = {
          primaryInfo: 'WESH',
          matchingTel: {}
        };
        CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
        this.sinon.useFakeTimers();
      });

      teardown(function() {
        delete groupReturn.contact;
      });

      test('only contact details is displayed', function() {
        assert.isFalse(detailsButton.hidden);
        assert.isTrue(addToContactButton.hidden);
        assert.isTrue(createContactButton.hidden);
      });

      test('viewing contact details work', function() {
        detailsButton.click();
        assert.equal(window.location.hash, '#contacts-view');
        this.sinon.clock.tick();
        var url = 'index.html#view-contact-details?id=' +
        groupReturn.contact.id + '&tel=' + groupReturn.number +
        '&back_to_previous_tab=1&isMissedCall=true';
        assert.include(contactsIframe.src, url);
      });
    });
  });

  suite('Displaying a contact', function() {
    setup(function() {
      groupReturn.contact = {
        primaryInfo: 'WESH',
        matchingTel: {}
      };
      CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
    });

    teardown(function() {
      delete groupReturn.contact;
    });

    test('view title is set', function() {
      var callInfoTitle = document.getElementById('call-info-title');
      assert.equal(callInfoTitle.textContent, groupReturn.contact.primaryInfo);
    });
  });

  suite('Updates after call log db updates', function() {
    teardown(function() {
      groupReturn.calls = [];
    });

    test('adds a new call', function() {
      groupReturn.calls = [
        {date: 123, duration: 0}
      ];
      var createOrUpdateEvt = new CustomEvent('CallLogDbNewCall',
        {detail: {group: groupReturn}});

      var rows = document.getElementsByClassName('call-duration');
      assert.equal(rows.length, 0);

      window.dispatchEvent(createOrUpdateEvt);
      assert.equal(rows.length, 1);
    });

    test('does not listen when the view is closed', function() {
      dispatchCloseViewEvent();

      groupReturn.calls = [
        {date: 123, duration: 0},
        {date: 123, duration: 0}
      ];

      var createOrUpdateEvt = new CustomEvent('CallLogDbNewCall',
        {detail: {group: groupReturn}});

      var rows = document.getElementsByClassName('call-duration');
      assert.equal(rows.length, 0);

      window.dispatchEvent(createOrUpdateEvt);
      assert.equal(rows.length, 0);
    });
  });
});
