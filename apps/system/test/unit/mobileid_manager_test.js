'use strict';

/* global MobileIdManager */

requireApp('system/js/mobileid_manager.js');

suite('MobileID Manager', function() {
  const CONTENT_EVENT = 'mozMobileIdContentEvent';
  const UNSOLICITED_EVENT = 'mozMobileIdUnsolContentEvent';
  
  var fakeParams = [1, 2, 3];
  
  test(' "onpermissionrequest" is opening a Dialog', function(done) {
    this.sinon.stub(MobileIdManager, 'openDialog', function(data) {
      assert.deepEqual(data, fakeParams);
      assert.ok(MobileIdManager.openDialog.calledOnce);
      done();
    });
   
    var chromeEvent = new CustomEvent(
      'mozMobileIdChromeEvent',
      {
        detail: {
          eventName: 'onpermissionrequest',
          data: fakeParams
        }
      }
    );

    window.dispatchEvent(chromeEvent);
  });

  test(' rest of events are sent to the Dialog', function(done) {
    MobileIdManager.dialog = {
      dispatchEvent: function(eventName, data) {
        assert.equal(eventName, testEvent);
        assert.deepEqual(data, fakeParams);
        MobileIdManager.dialog = null;
        done();
      }
    };

    assert.ok(true);
    var testEvent = 'onverificationcode';
    var chromeEvent = new CustomEvent(
      'mozMobileIdChromeEvent',
      {
        detail: {
          eventName: testEvent,
          data: fakeParams
        }
      }
    );

    window.dispatchEvent(chromeEvent);
  });

  suite(' when receiving info from dialog, is dispatched properly' ,function() {
    test(' sendMsisdn', function() {
      var testMSISDN = '+34123123123';
      this.sinon.stub(MobileIdManager, 'sendContentEvent',
        function(eventName, params) {
        assert.equal(eventName, CONTENT_EVENT);
        assert.equal(params.result, testMSISDN);
      });
      MobileIdManager.sendMsisdn(testMSISDN);
    });

    test(' sendVerificationCode', function() {
      var testCode = '1234';
      this.sinon.stub(MobileIdManager, 'sendContentEvent',
        function(eventName, params) {
        assert.equal(eventName, CONTENT_EVENT);
        assert.equal(params.result.verificationCode, testCode);
      });
      MobileIdManager.sendVerificationCode(testCode);
    });

    test(' requestNewCode', function() {
      var testCode = '1234';
      this.sinon.stub(MobileIdManager, 'sendContentEvent',
        function(eventName, params) {
        assert.equal(eventName, UNSOLICITED_EVENT);
        assert.equal(params.eventName, 'resendcode');
      });
      MobileIdManager.requestNewCode(testCode);
    });
  });
});