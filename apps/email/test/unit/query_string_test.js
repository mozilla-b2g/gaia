/*jshint browser: true */
/*global requireApp, suite, testConfig, test, assert,
  suiteSetup, suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('query_string', function() {
  var queryString,
      string1 = 'type=message_list&accountId=A',
      object1 = {
        type: 'message_list',
        accountId: 'A'
      },
      string2 = 'type=message_reader&accountId=B&messageSuid=B%2F1',
      object2 = {
        type: 'message_reader',
        accountId: 'B',
        messageSuid: 'B/1'
      };

  suiteSetup(function(done) {
    testConfig(
      {
        suiteTeardown: suiteTeardown,
        done: done
      },
      ['query_string'],
      function(q) {
        queryString = q;
      }
    );
  });

  suite('#toObject', function() {

    test('basic use', function() {
      var result1 = queryString.toObject(string1),
          result2 = queryString.toObject(string2);

      assert.equal('message_list', result1.type);
      assert.equal('A', result1.accountId);

      assert.equal('message_reader', result2.type);
      assert.equal('B', result2.accountId);
      assert.equal('B/1', result2.messageSuid);
    });

  });

  suite('#fromObject', function() {

    test('basic use', function() {
      var result1 = queryString.fromObject(object1),
          result2 = queryString.fromObject(object2);

      assert.equal(string1, result1);
      assert.equal(string2, result2);
    });

  });

  suite('encodeURIComponent use', function() {

    test('basic use', function() {
      var result1 = queryString
                    .toObject('url%26type=http%3A%2F%2Fmozilla.com%2F');

      assert.equal('http://mozilla.com/', result1['url&type']);
    });

  });

});
