/* -*- Mode: js2; js2-basic-offset: 2; indent-tabs-mode: nil -*- */
/* vim: set ft=javascript sw=2 ts=2 autoindent cindent expandtab: */

'use strict';

/**
  Mock payment provider JWT

  { "iss": "323d34dc-b5cf-4822-8e47-6a4515dc74db",
    "request": {
      "description": "The forbidden fruit",
      "id": "af1f960a-3f90-4e2d-a20f-d5170aee49f2",
      "postbackURL": "https://inapp-pay-test.paas.allizom.org/mozpay/postback",
      "productData": "localTransID=6fc8f207-da3f-440f-9977-eb613aae0a00",
      "chargebackURL": "https://inapp-pay-test.paas.allizom.org/mozpay/chargeback",
      "name": "Virtual Kiwi"
    },
    "typ": "tests/payments/pay/v1",
    "aud": "ferjm.github.io/gaia-mock-payment-provider"
  }

*/
const mockJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIzMjNkMzRkYy1iNWNmLTQ4MjItOGU0Ny02YTQ1MTVkYzc0ZGIiLCJhdWQiOiJmZXJqbS5naXRodWIuaW8vZ2FpYS1tb2NrLXBheW1lbnQtcHJvdmlkZXIiLCJ0eXAiOiJ0ZXN0cy9wYXltZW50cy9wYXkvdjEiLCJyZXF1ZXN0Ijp7ImlkIjoiYWYxZjk2MGEtM2Y5MC00ZTJkLWEyMGYtZDUxNzBhZWU0OWYyIiwibmFtZSI6IlZpcnR1YWwgS2l3aSIsImRlc2NyaXB0aW9uIjoiVGhlIGZvcmJpZGRlbiBmcnVpdCIsInByb2R1Y3REYXRhIjoibG9jYWxUcmFuc0lEPTZmYzhmMjA3LWRhM2YtNDQwZi05OTc3LWViNjEzYWFlMGEwMCIsInBvc3RiYWNrVVJMIjoiaHR0cHM6Ly9pbmFwcC1wYXktdGVzdC5wYWFzLmFsbGl6b20ub3JnL21venBheS9wb3N0YmFjayIsImNoYXJnZWJhY2tVUkwiOiJodHRwczovL2luYXBwLXBheS10ZXN0LnBhYXMuYWxsaXpvbS5vcmcvbW96cGF5L2NoYXJnZWJhY2sifX0.DlHejmKRlVPLYO-HVAYDzqOcv5eXMsVlpnozcADpnh4';

// Invalid typ JWT
const invalidJWT = 'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.IntcImF1ZFwiOiBcImNvbm5lY3QucWEtb3BlbnRlbC0wNC5oaS5pbmV0XCIsIFwiaXNzXCI6IFwiMzRYVjM3QkRSQkJGNEtaQ1M5UVVcIiwgXCJyZXF1ZXN0XCI6IHtcIm5hbWVcIjogXCJQaWNlIG9mIENha2VcIiwgXCJwcmljZVwiOiAxMC41LCBcInByaWNlVGllclwiOiAxLCBcInByb2R1Y3RkYXRhXCI6IFwidHJhbnNhY3Rpb25faWQ9MTJcIiwgXCJjdXJyZW5jeUNvZGVcIjogXCJVU0RcIiwgXCJkZXNjcmlwdGlvblwiOiBcIlZpcnR1YWwgY2hvY29sYXRlIGNha2UgdG8gZmlsbCB5b3VyIHZpcnR1YWwgdHVtbXlcIn0sIFwiZXhwXCI6IDEzNDIwMDMwNzA1MTMsIFwiaWF0XCI6IDEzNDIwMDMwNzQxMTMsIFwidHlwXCI6IFwicGF5bWVudHMvaW5hcHAvdjFcIn0i.I5rFwoBtgyTltMJ_11rHOgcto-HdFbYlIOgVOVSlJe0';

var PayTests = {

  init: function pt_init() {
    window.addEventListener('DOMContentLoaded', function() {
      var jwts = {
        'test-pmpp': [mockJWT],
        'test-invalid': [invalidJWT],
        'test-nojwt': undefined,
        'test-repeated': [mockJWT, mockJWT]
      };

      ['test-pmpp',
       'test-invalid',
       'test-nojwt',
       'test-repeated'].forEach(function(id) {
        document.getElementById(id).addEventListener('click', function() {
          PayTests.pay(jwts[id]);
        });
      });
    });
  },

  pay: function pt_pay(JWTs) {
    var request = navigator.mozPay(JWTs);
    request.onsuccess = function onsuccess() {
      document.getElementById('result').innerHTML = 'Payment success';
    };
    request.onerror = function onerror() {
      console.log("Error " + request.error.name);
      document.getElementById('result').innerHTML = 'Payment error ' +
                                                     request.error.name;
    };
  }
};

PayTests.init();
