'use strict';
/*global requireApp, suite, suiteSetup, testConfig, test,
  assert, suiteTeardown */
requireApp('email/js/alameda.js');
requireApp('email/test/config.js');


suite('email/query_uri', function() {
  var queryURI;

  suiteSetup(function(done) {
    testConfig(
      {
        suiteTeardown: suiteTeardown,
        done: done
      },
      ['query_uri'],
      function(quri) {
        queryURI = quri;
      }
    );
  });

  test('#to', function() {

    assert.deepEqual(queryURI('mailto:Email.address1@mailto.com'),
    { to: ['Email.address1@mailto.com'] },
    'to single address test fail');

    assert.deepEqual(queryURI(
    'mailto:Email.address1@mailto.com;Email.address2@mailto.com'),
    { to: ['Email.address1@mailto.com', 'Email.address2@mailto.com'] },
    'to multi-addresses test fail (separator ";")');

    assert.deepEqual(queryURI(
    'mailto:Email.address1@mailto.com,Email.address2@mailto.com'),
    { to: ['Email.address1@mailto.com', 'Email.address2@mailto.com'] },
    'to multi-addresses test fail (separator ",")');

    assert.deepEqual(queryURI('mailto:'),
    { to: [] },
    'no to address test fail');

  });

  test('#cc', function() {

    assert.deepEqual(queryURI('mailto:?cc=EmailCc.address@mailto.com'),
    { to: [], cc: ['EmailCc.address@mailto.com'] },
    'cc single address test fail');

    assert.deepEqual(queryURI('mailto:?cc=EmailCc.address1@mailto.com;' +
    'EmailCc.address2@mailto.com;EmailCc.address3@mailto.com'),
    { to: [], cc: ['EmailCc.address1@mailto.com', 'EmailCc.address2@mailto.com',
    'EmailCc.address3@mailto.com'] },
    'cc multi-addresses test fail');

  });


  test('#bcc', function() {

    assert.deepEqual(queryURI('mailto:?bcc=EmailBcc.address@mailto.com'),
    { to: [], bcc: ['EmailBcc.address@mailto.com'] },
    'bcc single address test');

    assert.deepEqual(queryURI('mailto:?bcc=EmailBcc.address1@mailto.com;' +
    'EmailBcc.address2@mailto.com;EmailBcc.address3@mailto.com'),
    { to: [], bcc: ['EmailBcc.address1@mailto.com',
    'EmailBcc.address2@mailto.com', 'EmailBcc.address3@mailto.com'] },
    'bcc multi-addresses test fail');

  });


  test('#subject', function() {

    assert.deepEqual(queryURI('mailto:?subject=This is the subject line'),
    { to: [], subject: 'This is the subject line' },
    'subject test fail');

  });


  test('#body', function() {

    assert.deepEqual(queryURI('mailto:?body=This is the body'),
    { to: [], body: 'This is the body' },
    'body test fail');

  });


  test('#complex tests', function() {

    assert.deepEqual(queryURI(
    'mailto:Email.address1@mailto.com;Email.address2@mailto.com?' +
    'cc=EmailCc1.address@mailto.com;EmailCc2.address@mailto.com&' +
    'bcc=EmailBCc1.address@mailto.com;EmailBCc2.address@mailto.com'),
    {
      to: ['Email.address1@mailto.com', 'Email.address2@mailto.com'],
      cc: ['EmailCc1.address@mailto.com', 'EmailCc2.address@mailto.com'],
      bcc: ['EmailBCc1.address@mailto.com', 'EmailBCc2.address@mailto.com']
    },
    'complex 1 test fail');


    assert.deepEqual(queryURI('mailto:Email.address1@mailto.com;?' +
    'cc=EmailCc1.address@mailto.com;&bcc=EmailBCc1.address@mailto.com;' +
    '&subject=This is the subject line&body=This is the text line one.' +
    ' %0AThis is the text line two'),

    {
      to: ['Email.address1@mailto.com'],
      subject: 'This is the subject line',
      body: 'This is the text line one. \nThis is the text line two',
      cc: ['EmailCc1.address@mailto.com'],
      bcc: ['EmailBCc1.address@mailto.com']
    },

    'complex 2 test fail');

  });
});


