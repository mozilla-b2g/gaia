/*global requireApp, suite, suiteSetup, testConfig, test,
  assert, suiteTeardown */
requireApp('email/js/alameda.js');
requireApp('email/test/config.js');


suite('email/mail_app', function() {
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
    [['Email.address1@mailto.com'],
    undefined, undefined, undefined, undefined],
    'to single address test fail');

    assert.deepEqual(queryURI(
    'mailto:Email.address1@mailto.com;Email.address2@mailto.com'),
    [['Email.address1@mailto.com', 'Email.address2@mailto.com'],
    undefined, undefined, undefined, undefined],
    'to multi-addresses test fail (separator ";")');

    assert.deepEqual(queryURI(
    'mailto:Email.address1@mailto.com,Email.address2@mailto.com'),
    [['Email.address1@mailto.com', 'Email.address2@mailto.com'],
    undefined, undefined, undefined, undefined],
    'to multi-addresses test fail (separator ",")');

    assert.deepEqual(queryURI('mailto:'),
    [[], undefined, undefined, undefined, undefined],
    'no to address test fail');

  });

  test('#cc', function() {

    assert.deepEqual(queryURI('mailto:?cc=EmailCc.address@mailto.com'),
    [[], undefined, undefined, ['EmailCc.address@mailto.com'], undefined],
    'cc single address test fail');

    assert.deepEqual(queryURI('mailto:?cc=EmailCc.address1@mailto.com;' +
    'EmailCc.address2@mailto.com;EmailCc.address3@mailto.com'),
    [[], undefined, undefined, ['EmailCc.address1@mailto.com',
    'EmailCc.address2@mailto.com',
    'EmailCc.address3@mailto.com'], undefined],
    'cc multi-addresses test fail');


  });


  test('#bcc', function() {

    assert.deepEqual(queryURI('mailto:?bcc=EmailBcc.address@mailto.com'),
    [[], undefined, undefined, undefined, ['EmailBcc.address@mailto.com']],
    'bcc single address test');

    assert.deepEqual(queryURI('mailto:?bcc=EmailBcc.address1@mailto.com;' +
    'EmailBcc.address2@mailto.com;EmailBcc.address3@mailto.com'),
    [[], undefined, undefined, undefined, ['EmailBcc.address1@mailto.com',
    'EmailBcc.address2@mailto.com',
    'EmailBcc.address3@mailto.com']], 'bcc multi-addresses test fail');

  });


  test('#subject', function() {

    assert.deepEqual(queryURI('mailto:?subject=This is the subject line'),
    [[], 'This is the subject line', undefined, undefined, undefined],
    'subject test fail');

  });


  test('#body', function() {

    assert.deepEqual(queryURI('mailto:?body=This is the body'),
    [[], undefined, 'This is the body', undefined, undefined],
    'body test fail');

  });


  test('#complex tests', function() {

    assert.deepEqual(queryURI(
    'mailto:Email.address1@mailto.com;Email.address2@mailto.com?' +
    'cc=EmailCc1.address@mailto.com;EmailCc2.address@mailto.com&' +
    'bcc=EmailBCc1.address@mailto.com;EmailBCc2.address@mailto.com'),
    [['Email.address1@mailto.com', 'Email.address2@mailto.com'],
    undefined, undefined, ['EmailCc1.address@mailto.com',
    'EmailCc2.address@mailto.com'], ['EmailBCc1.address@mailto.com',
    'EmailBCc2.address@mailto.com']], 'complex 1 test fail');


    assert.deepEqual(queryURI('mailto:Email.address1@mailto.com;?' +
    'cc=EmailCc1.address@mailto.com;&bcc=EmailBCc1.address@mailto.com;' +
    '&subject=This is the subject line&body=This is the text line one.' +
    ' %0AThis is the text line two'),
    [['Email.address1@mailto.com'], 'This is the subject line',
    'This is the text line one. \nThis is the text line two',
    ['EmailCc1.address@mailto.com'],
    ['EmailBCc1.address@mailto.com']],
    'complex 2 test fail');

  });
});


