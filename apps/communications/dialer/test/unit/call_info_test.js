'use strict';

/* globals CallInfo, CallLogDBManager, MocksHelper */

require('/dialer/test/unit/mock_call_log_db_manager.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');

require('/dialer/js/call_info.js');

var mocksHelperForCallInfoView = new MocksHelper([
  'CallLogDBManager',
  'LazyLoader',
  'Utils'
]).init();

suite('Call Info', function(argument) {

  mocksHelperForCallInfoView.attachTestHelpers();

  suiteSetup(function() {
    loadBodyHTML('/dialer/elements/call-info-view.html');
    var section = document.createElement('section');
    section.setAttribute('is', 'call-info-view');
    section.setAttribute('role', 'region');
    section.id = 'call-info-view';
    section.hidden = true;
    section.innerHTML = document.body.querySelector('template').innerHTML;

    document.body.appendChild(section);
  });

  var groupWithoutContact = {
    number: '12345',
    date: 1,
    type: 'incoming',
    // status
    calls: [

    ]
  };

  var groupPromise;
  var fakeNumber = '12345';
  var fakeDate = '1';
  var fakeType = 'incoming';
  var fakeStatus = 'connected';
  setup(function(done) {
    groupPromise = Promise.resolve(groupWithoutContact);
    this.sinon.stub(CallLogDBManager, 'getGroup', function() {
      return groupPromise;
    });
    CallInfo.show(fakeNumber, fakeDate, fakeType, fakeStatus);
    groupPromise.then(function() {
      done();
    });
  });

  test('displays the view', function() {
    assert.isFalse(document.getElementById('call-info-view').hidden);
  });

  test('looks up the right group', function() {
    sinon.assert.calledWith(CallLogDBManager.getGroup,
      fakeNumber, parseInt(fakeDate, 10), fakeType, fakeStatus);
  });

  suite('Displaying a contact', function() {

  });

  suite('Displaying an unknown number', function() {

  });
});
