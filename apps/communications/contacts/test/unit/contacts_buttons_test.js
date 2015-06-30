/* globals MocksHelper, ContactsButtons, MockL10n, MockContactAllFields,
           MockContactsButtonsDom, LazyLoader, TelephonyHelper,
           MultiSimActionButton, ActivityHandler, MockActivityHandler */

'use strict';

require('/shared/js/contacts/contacts_buttons.js');

require('/shared/js/text_normalizer.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/utilities/templates.js');

require('/shared/test/unit/mocks/mock_multi_sim_action_button.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/test/unit/mocks/dialer/mock_telephony_helper.js');
require('/contacts/test/unit/mock_navigation.js');
require('/contacts/test/unit/mock_contacts.js');
require('/contacts/test/unit/mock_contacts_buttons_dom.js.html');
require('/contacts/test/unit/mock_utils.js');
require('/contacts/test/unit/mock_activities.js');

var mocksHelperForContactsButtons = new MocksHelper([
  'LazyLoader',
  'ActivityHandler',
  'Contacts',
  'MultiSimActionButton',
  'TelephonyHelper'
]).init();

suite('Render contact', function() {
  var subject;

  var realL10n;

  var mockContact;

  var container;
  var listDetails;

  var getSpy;

  var assertCarrierWrapperVisibility = function(visibility) {
    var carrierWrapperElt = listDetails.querySelector('.carrier-wrapper');
    assert.equal(carrierWrapperElt.hidden, !visibility);
  };

  mocksHelperForContactsButtons.attachTestHelpers();

  suiteSetup(function() {
    subject = ContactsButtons;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  setup(function() {
    getSpy = this.sinon.spy(MockL10n, 'get');

    mockContact = new MockContactAllFields(true);

    document.body.innerHTML = MockContactsButtonsDom;

    container = document.getElementById('contact-detail');
    listDetails = document.getElementById('list-details');
    subject.init(listDetails, container, MockActivityHandler);
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('Render phones', function() {
    test('with 1 phone', function() {
      subject.renderPhones(mockContact);
      assert.include(container.innerHTML, 'phone-details-template-0');
      assert.include(container.innerHTML, mockContact.tel[0].value);
      assert.include(container.innerHTML, mockContact.tel[0].carrier);
      assert.include(container.innerHTML, mockContact.tel[0].type);
      assert.include(
        listDetails.querySelector('h2').innerHTML,
        mockContact.tel[0].carrier
      );
      assertCarrierWrapperVisibility(true);
    });

    test('with 1 phone and carrier undefined', function() {

      var contactNoCarrier = new MockContactAllFields(true);
      contactNoCarrier.tel = [
        {
          value: '+34678987123',
          type: ['Personal']
        }
      ];
      subject.renderPhones(contactNoCarrier);
      var phoneButton = container.querySelector('#call-or-pick-0');
      assert.equal(phoneButton.querySelector('b').textContent,
                    contactNoCarrier.tel[0].value);
      var carrierContent = listDetails.querySelector('.carrier').textContent;
      assert.lengthOf(carrierContent, 0);
      assertCarrierWrapperVisibility(false);

    });

    test('with no phones', function() {
      var contactWoTel = new MockContactAllFields(true);
      contactWoTel.tel = [];
      subject.renderPhones(contactWoTel);
      assert.equal(-1, listDetails.innerHTML.indexOf('phone-details-template'));
    });

    test('with null phones', function() {
      var contactWoTel = new MockContactAllFields(true);
      contactWoTel.tel = null;
      subject.renderPhones(contactWoTel);
      assert.equal(-1, listDetails.innerHTML.indexOf('phone-details-template'));
    });

    test('with more than 1 phone', function() {
      var contactMultTel = new MockContactAllFields(true);
      contactMultTel.tel[1] = contactMultTel.tel[0];
      for (var elem in contactMultTel.tel[1]) {
        var currentElem = contactMultTel.tel[1][elem] + 'dup';
        contactMultTel.tel[1][elem] = currentElem;
      }
      contactMultTel.tel[1].type = '';
      subject.renderPhones(contactMultTel);
      assert.include(listDetails.innerHTML, 'phone-details-template-0');
      assert.include(listDetails.innerHTML, 'phone-details-template-1');
      assert.include(listDetails.innerHTML, contactMultTel.tel[0].value);
      assert.include(listDetails.innerHTML, contactMultTel.tel[0].carrier);
      assert.include(listDetails.innerHTML, contactMultTel.tel[0].type);
      assert.include(listDetails.innerHTML, contactMultTel.tel[1].value);
      assert.include(listDetails.innerHTML, contactMultTel.tel[1].carrier);
      assert.include(listDetails.innerHTML, subject.DEFAULT_TEL_TYPE);
      assert.equal(
        -1, listDetails.innerHTML.indexOf('phone-details-template-2'));
      assertCarrierWrapperVisibility(true);
    });
  });

  suite('Render emails', function() {
    test('with 1 email', function() {
      subject.renderEmails(mockContact);
      assert.include(listDetails.innerHTML, 'email-details-template-0');
      assert.include(listDetails.innerHTML, mockContact.email[0].value);
      assert.include(listDetails.innerHTML, mockContact.email[0].type);
    });

    test('with no emails', function() {
      var contactWoEmail = new MockContactAllFields(true);
      contactWoEmail.email = [];
      subject.renderEmails(contactWoEmail);
      assert.equal(-1, listDetails.innerHTML.indexOf('email-details-template'));
    });

    test('with null emails', function() {
      var contactWoEmail = new MockContactAllFields(true);
      contactWoEmail.email = null;
      subject.renderEmails(contactWoEmail);
      assert.equal(-1, listDetails.innerHTML.indexOf('email-details-template'));
    });

    test('with more than 1 email', function() {
      var contactMultEmail = new MockContactAllFields(true);
      contactMultEmail.email[1] = contactMultEmail.email[0];
      for (var elem in contactMultEmail.email[1]) {
        var currentElem = contactMultEmail.email[1][elem] + 'dup';
        contactMultEmail.email[1][elem] = currentElem;
      }
      subject.renderEmails(contactMultEmail);
      assert.include(container.innerHTML, 'email-details-template-0');
      assert.include(container.innerHTML, 'email-details-template-1');
      var email0 = contactMultEmail.email[0];
      var email1 = contactMultEmail.email[1];
      assert.include(listDetails.innerHTML, email0.value);
      assert.include(listDetails.innerHTML, email0.type);
      assert.include(listDetails.innerHTML, email1.value);
      assert.include(listDetails.innerHTML, email1.type);
      assert.equal(
        -1, listDetails.innerHTML.indexOf('email-details-template-2'));
    });
  });

  suite('> User actions', function() {
    var realMozTelephony;
    var realMozMobileConnections;
    suiteSetup(function() {
      realMozTelephony = navigator.mozTelephony;
      realMozMobileConnections = navigator.mozMobileConnections;
      navigator.mozTelephony = true;
      navigator.mozMobileConnections = [true];
      sinon.spy(window, 'MultiSimActionButton');
    });

    suiteTeardown(function() {
      navigator.mozTelephony = realMozTelephony;
      navigator.mozMobileConnections = realMozMobileConnections;
    });

    setup(function() {
      this.sinon.spy(LazyLoader, 'load');
    });

    teardown(function() {
      LazyLoader.load.reset();
    });

    function makeCall(cb) {
      var theContact = new MockContactAllFields(true);
      subject.renderPhones(theContact);

      var stubCall = sinon.stub(TelephonyHelper, 'call', cb);
      MultiSimActionButton.args[0][1]();
      stubCall.restore();
    }

    test('> Not loading MultiSimActionButton when we are on an activity',
         function() {
      ActivityHandler.currentlyHandling = true;
      subject.renderPhones(mockContact);

      sinon.assert.neverCalledWith(LazyLoader.load,
       ['/shared/js/multi_sim_action_button.js']);
      ActivityHandler.currentlyHandling = false;
    });

    test('> Not loading MultiSimActionButton if we have a MMI code',
         function() {
      this.sinon.stub(subject, '_isMMI').returns(true);

      subject.renderPhones(mockContact);

      sinon.assert.neverCalledWith(LazyLoader.load,
       ['/shared/js/multi_sim_action_button.js']);
    });

    test('> Load call button', function() {
      subject.renderPhones(mockContact);

      // We have two buttons, one call per button created plus webrtc
      // client call
      // XXX: Should we include webrtc?
      //assert.equal(LazyLoader.load.callCount, 5);
      assert.equal(LazyLoader.load.callCount, 2);
      var spyCall = LazyLoader.load.getCall(1);
      assert.deepEqual(
        ['/shared/js/multi_sim_action_button.js'], spyCall.args[0]);
    });

    test('> Multiple MultiSimActionButtons initialized with correct values',
         function() {
      var theContact = new MockContactAllFields(true);
      subject.renderPhones(theContact);

      var phone1 = container.querySelector('#call-or-pick-0');
      var phone2 = container.querySelector('#call-or-pick-1');
      var phoneNumber1 = theContact.tel[0].value;
      var phoneNumber2 = theContact.tel[1].value;

      sinon.assert.calledWith(MultiSimActionButton, phone1,
           sinon.match.func, 'ril.telephony.defaultServiceId',
           sinon.match.func);
      // Check the getter contains the correct phone number
      var getterResult = MultiSimActionButton.args[0][3]();
      assert.equal(phoneNumber1, getterResult);

      sinon.assert.calledWith(MultiSimActionButton, phone2,
           sinon.match.func, 'ril.telephony.defaultServiceId',
           sinon.match.func);
      // Second call getter result
      getterResult = MultiSimActionButton.args[1][3]();
      assert.equal(phoneNumber2, getterResult);

    });

    test('> Calling and oncall ', function() {
      makeCall(function(num, cIndex, oncall, connected, disconnected, error) {
        assert.isTrue(container.classList.contains('calls-disabled'));
        oncall();
        assert.isFalse(container.classList.contains('calls-disabled'));
      });
    });

    test('> Calling and connected ', function() {
      makeCall(function(num, cIndex, oncall, connected, disconnected, error) {
        assert.isTrue(container.classList.contains('calls-disabled'));
        connected();
        assert.isFalse(container.classList.contains('calls-disabled'));
      });
    });

    test('> Calling and disconnected ', function() {
      makeCall(function(num, cIndex, oncall, connected, disconnected, error) {
        assert.isTrue(container.classList.contains('calls-disabled'));
        disconnected();
        assert.isFalse(container.classList.contains('calls-disabled'));
      });
    });

    test('> Calling and error ', function() {
      makeCall(function(num, cIndex, oncall, connected, disconnected, error) {
        assert.isTrue(container.classList.contains('calls-disabled'));
        error();
        assert.isFalse(container.classList.contains('calls-disabled'));
      });
    });
  });
});
