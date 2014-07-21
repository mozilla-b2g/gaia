/* global MocksHelper */
/* global MockMozActivity */
/* global MockPromise */
/* global MockMozL10n */
/* global WebrtcClient */
'use strict';

requireApp('communications/contacts/js/webrtc-client/webrtc_client.js');
requireApp('communications/contacts/test/unit/webrtc-client/mock_promises.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_mozActivity.js');

suite('WebRTC Client integration', function() {
  // Mock of a contact with the info we need to render. In this case
  // just a phone number
  var mockContact = {
    tel: [{
      value: '612123123',
      type: ['work']
    }]
  };
  // Keep in memory the DOM element we need for the tests
  var detailsList;
  // Keep the real l10n in a var to restore it later
  var realMozL10n;
  // Use the mock of MozActivity
  var mocksHelperWebrtcClient = new MocksHelper([
    'MozActivity',
    'Promise'
  ]).init();

  suiteSetup(function() {
    // Keep l10n
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    mocksHelperWebrtcClient.suiteSetup();

    // Create the basic structure for this test
    detailsList = document.createElement('ul');
    detailsList.id = 'details-list';
    document.body.appendChild(detailsList);
  });

  suiteTeardown(function() {
    // Restore l10n
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;

    mocksHelperWebrtcClient.suiteTeardown();

    // Clean the whole html
    document.body.innerHTML = '';
  });

  setup(function() {
    mocksHelperWebrtcClient.setup();

    // Rebuild the structure
    detailsList.innerHTML =
      '<li data-phone>' +
      '</li>';
  });

  teardown(function() {
    mocksHelperWebrtcClient.teardown();

    // Stop WebrtcClient as when tapping on 'back' in Contacts detail
    WebrtcClient.stop();

    // Clean the structure
    detailsList.innerHTML = '';
  });

  function assertWebRtcSectionPresent() {
     // Is the section there?
    var webrtcClientSection = document.getElementById('webrtc-client-actions');
    assert.isTrue(webrtcClientSection !== null);

    var buttons = webrtcClientSection.querySelectorAll('button');
    for (var i = 0, l = buttons.length; i < l; i++) {
      assert.isFalse(buttons[i].disabled);
    }
  }

  function assertWebRtcSectionAbsent() {
    // Is the section there?
    var webrtcClientSection = document.getElementById('webrtc-client-actions');
    assert.isTrue(webrtcClientSection === null);
  }

  test('If WebrtcClient & no email/phone, buttons are not present ',
    function() {
      // Execute the onsuccess
      MockMozActivity.setResult([{},{}]);
      WebrtcClient.start({}, true);
      // Execute promise on demand
      MockPromise.then(MockPromise.resolve, MockPromise.reject);
      // Execute activity on demand
      MockMozActivity.currentActivity.onsuccess();

      assertWebRtcSectionAbsent();
  });

  test('If WebrtcClient & only phone, buttons are present ', function() {
    // Execute the onsuccess
    MockMozActivity.setResult([{},{}]);
    WebrtcClient.start(mockContact, true);
    // Execute promise on demand
    MockPromise.then(MockPromise.resolve, MockPromise.reject);
    // Execute activity on demand
    MockMozActivity.currentActivity.onsuccess();

    assertWebRtcSectionPresent();
  });

  test('If WebrtcClient & email and phone, buttons are correctly positioned',
    function() {
      var mockContact2 = {
        tel: [{
          value: '612123123',
          type: ['work']
        }],
        email: [{
          value: 'jj@jj.com',
          type: ['home']
        }]
      };
       // Rebuild the structure
      detailsList.innerHTML = '<li data-phone></li>' + '<li data-mail></li>';
      // Execute the onsuccess
      MockMozActivity.setResult([{},{}]);
      WebrtcClient.start(mockContact2, true);
      // Execute promise on demand
      MockPromise.then(MockPromise.resolve, MockPromise.reject);
      // Execute activity on demand
      MockMozActivity.currentActivity.onsuccess();

      assertWebRtcSectionPresent();

      var webRtcSection =  document.getElementById('webrtc-client-actions');
      var previousEle = webRtcSection.previousElementSibling;
      assert.isTrue(previousEle.dataset.phone !== null);

      var nextEle = webRtcSection.nextElementSibling;
      assert.isTrue(nextEle.dataset.mail !== null);
  });

  test('If WebrtcClient only email defined, buttons are correctly positioned',
    function() {
      var mockContact2 = {
        email: [{
          value: 'jj@jj.com',
          type: ['home']
        }]
      };
       // Rebuild the structure
      detailsList.innerHTML = '<li data-mail></li>';

      // Execute the onsuccess
      MockMozActivity.setResult([{},{}]);
      WebrtcClient.start(mockContact2, true);
      // Execute promise on demand
      MockPromise.then(MockPromise.resolve, MockPromise.reject);
      // Execute activity on demand
      MockMozActivity.currentActivity.onsuccess();

      assertWebRtcSectionPresent();

      var webRtcSection =  document.getElementById('webrtc-client-actions');
      var nextEle = webRtcSection.nextElementSibling;
      assert.isTrue(nextEle.dataset.mail !== null);
  });

  test('If no WebrtcClient, buttons are not present ', function() {
    // Execute the onsuccess
    MockMozActivity.setResult([]);
    WebrtcClient.start(mockContact, true);
    // Execute promise on demand
    MockPromise.then(MockPromise.resolve, MockPromise.reject);
    // Execute activity on demand
    MockMozActivity.currentActivity.onsuccess();

    assertWebRtcSectionAbsent();
  });

  test('If no WebrtcClient, and installed after, added Buttons', function() {
    // Execute the onsuccess
    MockMozActivity.setResult([]);
    WebrtcClient.start(mockContact, true);
    // Execute promise on demand
    MockPromise.then(MockPromise.resolve, MockPromise.reject);
    // Execute activity on demand
    MockMozActivity.currentActivity.onsuccess();
    // Is the section there?
    var webrtcClientSection = document.getElementById('webrtc-client-actions');
    assert.isTrue(!webrtcClientSection);
    // We emulate the visibility event
    var visibilityEvent = new CustomEvent({
      type: 'visibilitychange'
    });
    document.dispatchEvent(visibilityEvent);
    MockMozActivity.setResult([{}, {}]);
     // Execute promise on demand
    MockPromise.then(MockPromise.resolve, MockPromise.reject);
    // Execute activity on demand
    MockMozActivity.currentActivity.onsuccess();

    assertWebRtcSectionPresent();
  });

  test('If WebrtcClient, and uninstalled after, removed Buttons', function() {
    // Execute the onsuccess
    MockMozActivity.setResult([{}]);
    WebrtcClient.start(mockContact, true);
    // Execute promise on demand
    MockPromise.then(MockPromise.resolve, MockPromise.reject);
    // Execute activity on demand
    MockMozActivity.currentActivity.onsuccess();
    // Is the section there?
    var webrtcClientSection = document.getElementById('webrtc-client-actions');
    assert.isTrue(!!webrtcClientSection);
    // We emulate the visibility event
    var visibilityEvent = new CustomEvent({
      type: 'visibilitychange'
    });
    document.dispatchEvent(visibilityEvent);
    MockMozActivity.setResult([]);
     // Execute promise on demand
    MockPromise.then(MockPromise.resolve, MockPromise.reject);
    // Execute activity on demand
    MockMozActivity.currentActivity.onsuccess();

    assertWebRtcSectionAbsent();
  });
});
