'use strict';

/*
  Generated using following settings
  Use jwt-simple (for nodeJS) if you want to generate other JWTs
  iss/secret are obtained from http://marketplace-dev.allizom.org

  var header = {
    typ: 'JWT',
    alg: 'HS256'
  };
  var payload = {
    iss: 'ce8bd650-fd98-4660-88bd-4f6fd461bb89',
    aud: 'marketplace-dev.allizom.org',
    typ: 'mozilla-dev/payments/pay/v1',
    iat: 9999999999, // long enough so it will never expire
    exp: 9999999999, // long enough so it will never expire
    request: {
      id: '00000',
      pricePoint: 1,
      name: 'testing item',
      description: 'this is a testing item',
      postbackURL: 'http://yourapp.com',
      chargebackURL: 'http://yourapp.com',
      simulate: {
        result: 'postback'
      }
    }
  };
    
  var secret = 'f7654c7de476318be7afced16b16ab6cb69f3dea3ea4f55' +
               'ecf735aa575c248c537e2d50ca4f75e723b38c500d5ada4a1';
*/

function payTest() {
  var postbackJWT =
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJjZThiZDY1M' +
    'C1mZDk4LTQ2NjAtODhiZC00ZjZmZDQ2MWJiODkiLCJhdWQiOiJtYXJrZXR' +
    'wbGFjZS1kZXYuYWxsaXpvbS5vcmciLCJ0eXAiOiJtb3ppbGxhLWRldi9wY' +
    'XltZW50cy9wYXkvdjEiLCJpYXQiOjk5OTk5OTk5OTksImV4cCI6OTk5OTk' +
    '5OTk5OSwicmVxdWVzdCI6eyJpZCI6IjAwMDAwIiwicHJpY2VQb2ludCI6M' +
    'SwibmFtZSI6InRlc3RpbmcgaXRlbSIsImRlc2NyaXB0aW9uIjoidGhpcyB' +
    'pcyBhIHRlc3RpbmcgaXRlbSIsInBvc3RiYWNrVVJMIjoiaHR0cDovL3lvd' +
    'XJhcHAuY29tIiwiY2hhcmdlYmFja1VSTCI6Imh0dHA6Ly95b3VyYXBwLmN' +
    'vbSIsInNpbXVsYXRlIjp7InJlc3VsdCI6InBvc3RiYWNrIn19fQ.ADpypB' +
    'CUWdwuVZtT8NLXMs4vndcTOZ3Dga2qrreyTl4';
  var chargeBackJWT =
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJjZThiZDY1M' +
    'C1mZDk4LTQ2NjAtODhiZC00ZjZmZDQ2MWJiODkiLCJhdWQiOiJtYXJrZXR' +
    'wbGFjZS1kZXYuYWxsaXpvbS5vcmciLCJ0eXAiOiJtb3ppbGxhLWRldi9wY' +
    'XltZW50cy9wYXkvdjEiLCJpYXQiOjk5OTk5OTk5OTksImV4cCI6OTk5OTk' +
    '5OTk5OSwicmVxdWVzdCI6eyJpZCI6IjAwMDAwIiwicHJpY2VQb2ludCI6M' +
    'SwibmFtZSI6InRlc3RpbmcgaXRlbSIsImRlc2NyaXB0aW9uIjoidGhpcyB' +
    'pcyBhIHRlc3RpbmcgaXRlbSIsInBvc3RiYWNrVVJMIjoiaHR0cDovL3lvd' +
    'XJhcHAuY29tIiwiY2hhcmdlYmFja1VSTCI6Imh0dHA6Ly95b3VyYXBwLmN' +
    'vbSIsInNpbXVsYXRlIjp7InJlc3VsdCI6ImNoYXJnZWJhY2siLCJyZWFzb' +
    '24iOiJyZWZ1bmQifX19.RNDx6OA1hgkhaufZObxQywySMlM7usnD5HzXuz' +
    'ByzRg';
  var invalidJWT =
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJjZThiZDY1M' +
    'C1mZDk4LTQ2NjAtODhiZC00ZjZmZDQ2MWJiODkiLCJhdWQiOiJtYXJrZXR' +
    'wbGFjZS1kZXYuYWxsaXpvbS5vcmciLCJ0eXAiOiJpbnZhbGlkLXR5cGUgY' +
    'mxhaGJsYWhibGFoIiwiaWF0Ijo5OTk5OTk5OTk5LCJleHAiOjk5OTk5OTk' +
    '5OTksInJlcXVlc3QiOnsiaWQiOiIwMDAwMCIsInByaWNlUG9pbnQiOjEsI' +
    'm5hbWUiOiJ0ZXN0aW5nIGl0ZW0iLCJkZXNjcmlwdGlvbiI6InRoaXMgaXM' +
    'gYSB0ZXN0aW5nIGl0ZW0iLCJwb3N0YmFja1VSTCI6Imh0dHA6Ly95b3VyY' +
    'XBwLmNvbSIsImNoYXJnZWJhY2tVUkwiOiJodHRwOi8veW91cmFwcC5jb20' +
    'iLCJzaW11bGF0ZSI6eyJyZXN1bHQiOiJwb3N0YmFjayJ9fX0._In70JO-B' +
    'XkL5mNz7ppBmE7gR0ITSlS-ZJ1kBIQwjTg';

  var testPostback = document.getElementById('test-postback');
  var testChargeback = document.getElementById('test-chargeback');
  var testInvalid = document.getElementById('tests-invalid');
  var testNojwt = document.getElementById('test-nojwt');
  var testRepeated = document.getElementById('test-repeated');

  (function init() {
    testPostback.addEventListener('click', function onclick() {
      pay([postbackJWT]);
    });
    testChargeback.addEventListener('click', function onclick() {
      pay([chargeBackJWT]);
    });
    testInvalid.addEventListener('click', function onclick() {
      pay([invalidJWT]);
    });
    testNojwt.addEventListener('click', function onclick() {
      pay();
    });
    testRepeated.addEventListener('click', function onclick() {
      pay([postbackJWT, postbackJWT]);
    });
  })();

  function pay(JWTs) {
    var request = navigator.mozPay(JWTs);
    request.onsuccess = function onsuccess() {
      document.getElementById('result').innerHTML = 'Payment success';
    };
    request.onerror = function onerror() {
      document.getElementById('result').innerHTML = 'Payment error ' +
                                                     request.error.name;
    };
  }
}

window.addEventListener('load', payTest);
