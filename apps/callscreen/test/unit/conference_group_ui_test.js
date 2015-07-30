/* globals ConferenceGroupUI, LazyLoader, MockCallScreen,
           MockNavigatorMozTelephony, MocksHelper */
/*jshint unused:false*/
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/test/unit/mock_call_screen.js');

var mocksHelperForCallsHandler = new MocksHelper([
  'CallScreen',
  'LazyLoader'
]).init();

suite('conference group ui', function() {
  var realMozTelephony,
      container;

  mocksHelperForCallsHandler.attachTestHelpers();

  suiteSetup(function(done) {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    loadBodyHTML('/elements/conference_group_details.html');
    var conferenceGroupDetailsTemplate =
      document.body.querySelector('template');

    loadBodyHTML('/test/unit/mock_group_call.html');

    var groupCallDetails = document.getElementById('group-call-details');
    groupCallDetails.innerHTML = '';
    groupCallDetails.appendChild(
      conferenceGroupDetailsTemplate.content.cloneNode(true));

    require('/js/conference_group_ui.js', done);
  });

  suiteTeardown(function() {
    navigator.mozTelephony = realMozTelephony;
  });

  suite('group details button listeners', function() {
    test('showing the group details overlay', function() {
      assert.isFalse(
        document.getElementById('group-call-details').classList.
          contains('display'));
      document.getElementById('group-show').click();
      assert.isTrue(
        document.getElementById('group-call-details').classList.
          contains('display'));
    });

    test('hiding the group details overlay', function() {
      this.sinon.useFakeTimers();
      // Force the ConferenceGroupUI initialization code to run adding a call
      //  to the group details overlay.
      var fakeNode = document.createElement('section');
      ConferenceGroupUI.addCall(fakeNode);
      ConferenceGroupUI.showGroupDetails();
      assert.isTrue(
        document.getElementById('group-call-details').classList.
          contains('display'));
      document.getElementById('group-hide').click();
      this.sinon.clock.tick();
      assert.isFalse(
        document.getElementById('group-call-details').classList.
          contains('display'));
    });
  });

  suite('addCall', function() {
    test('should insert the node in the group calls article', function() {
      var fakeNode = document.createElement('section');
      ConferenceGroupUI.addCall(fakeNode);
      assert.equal(fakeNode.parentNode.id, 'group-call-details-list');
    });
  });

  suite('removeCall', function() {
    var fakeNode = document.createElement('section');
    test('should remove the node in the groupList', function() {
      ConferenceGroupUI.addCall(fakeNode);
      ConferenceGroupUI.removeCall(fakeNode);
      assert.equal(fakeNode.parentNode, null);
    });
  });

  suite('showGroupDetails', function() {
    test('should show group details', function() {
      ConferenceGroupUI.showGroupDetails();
      assert.isTrue(
        document.getElementById('group-call-details').classList.
          contains('display'));
    });
  });

  suite('hideGroupDetails', function() {
    test('should hide group details', function() {
      this.sinon.useFakeTimers();
      ConferenceGroupUI.showGroupDetails();
      assert.isTrue(
        document.getElementById('group-call-details').classList.
          contains('display'));
      ConferenceGroupUI.hideGroupDetails();
      this.sinon.clock.tick(MockCallScreen.callEndPromptTime);
      assert.isFalse(
        document.getElementById('group-call-details').classList.
          contains('display'));
    });
  });

  suite('set end conference call', function() {
    var fakeNode1 = document.createElement('section');
    var fakeNode2 = document.createElement('section');
    var fakeNode3 = document.createElement('section');

    setup(function() {
      ConferenceGroupUI.addCall(fakeNode1);
      ConferenceGroupUI.addCall(fakeNode2);
      ConferenceGroupUI.addCall(fakeNode3);
    });

    test('should set groupHangup to all nodes in group detail lists',
    function() {
      ConferenceGroupUI.markCallsAsEnded();
      assert.equal(fakeNode1.dataset.groupHangup, 'groupHangup');
      assert.equal(fakeNode2.dataset.groupHangup, 'groupHangup');
      assert.equal(fakeNode3.dataset.groupHangup, 'groupHangup');
    });
  });
});
