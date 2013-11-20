/* -*- Mode: js2; js2-basic-offset: 2; indent-tabs-mode: nil -*- */
/* vim: set ft=javascript sw=2 ts=2 autoindent cindent expandtab: */

'use strict';

// Mock public payment provider JWT
const mockJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIxMjM0NTY3ODkiLCJhdWQiOiJNb2NrIFBheW1lbnQgUHJvdmlkZXIiLCJ0eXAiOiJtb2NrXC9wYXltZW50c1wvaW5hcHBcL3YxIiwiZXhwIjoxMzQ1MjU5ODgyLCJpYXQiOjEzNDUyNTYyODIsInJlcXVlc3QiOnsibmFtZSI6IlBpZWNlIG9mIENha2UiLCJkZXNjcmlwdGlvbiI6IlZpcnR1YWwgY2hvY29sYXRlIGNha2UgdG8gZmlsbCB5b3VyIHZpcnR1YWwgdHVtbXkiLCJwcmljZSI6W3siY291bnRyeSI6IlVTIiwiYW1vdW50IjoiNS41MCIsImN1cnJlbmN5IjoiVVNEIn0seyJjb3VudHJ5IjoiQlIiLCJhbW91bnQiOiI4LjUwIiwiY3VycmVuY3kiOiJCUkwifV19fQ.EaXnlL7LUlmYXUTty5ZkUQ7VZeCBa_edi2YXKPnjSl4';

// Invalid typ JWT
const invalidJWT = 'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.IntcImF1ZFwiOiBcImNvbm5lY3QucWEtb3BlbnRlbC0wNC5oaS5pbmV0XCIsIFwiaXNzXCI6IFwiMzRYVjM3QkRSQkJGNEtaQ1M5UVVcIiwgXCJyZXF1ZXN0XCI6IHtcIm5hbWVcIjogXCJQaWNlIG9mIENha2VcIiwgXCJwcmljZVwiOiAxMC41LCBcInByaWNlVGllclwiOiAxLCBcInByb2R1Y3RkYXRhXCI6IFwidHJhbnNhY3Rpb25faWQ9MTJcIiwgXCJjdXJyZW5jeUNvZGVcIjogXCJVU0RcIiwgXCJkZXNjcmlwdGlvblwiOiBcIlZpcnR1YWwgY2hvY29sYXRlIGNha2UgdG8gZmlsbCB5b3VyIHZpcnR1YWwgdHVtbXlcIn0sIFwiZXhwXCI6IDEzNDIwMDMwNzA1MTMsIFwiaWF0XCI6IDEzNDIwMDMwNzQxMTMsIFwidHlwXCI6IFwicGF5bWVudHMvaW5hcHAvdjFcIn0i.I5rFwoBtgyTltMJ_11rHOgcto-HdFbYlIOgVOVSlJe0';

var PayTests = {

  testPmpp: document.getElementById('test-pmpp'),

  testInvalid: document.getElementById('tests-invalid'),

  testNojwt: document.getElementById('test-nojwt'),

  testRepeated: document.getElementById('test-repeated'),

  init: function pt_init() {
    var self = this;
    window.addEventListener('DOMContentLoaded', function() {
      console.log('DOMContentLoaded');
      self.testPmpp.addEventListener('click', function onclick() {
        console.log('click');
        self.pay([mockJWT]);
      });
      self.testInvalid.addEventListener('click', function onclick() {
        self.pay([invalidJWT]);
      });
      self.testNojwt.addEventListener('click', function onclick() {
        self.pay();
      });
      self.testRepeated.addEventListener('click', function onclick() {
        self.pay([mockJWT, mockJWT]);
      });
    });
  },

  pay: function pt_pay(JWTs) {
    var request = navigator.mozPay(JWTs);
    request.onsuccess = function onsuccess() {
      document.getElementById('result').innerHTML = 'Payment success';
    };
    request.onerror = function onerror() {
      document.getElementById('result').innerHTML = 'Payment error ' +
                                                     request.error.name;
    };
  }
};

PayTests.init();
