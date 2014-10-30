suite('Marionette Forms plugin', function() {
  var fork = require('child_process').fork;
  var emptyPort = require('empty-port');
  var async = require('async');

  var client = createClient();
  var elems = {};
  var serverAddr, serverProcess;

  marionette.plugin('forms', require('../../..'));

  suiteSetup(function(done) {
    emptyPort({ startPort: 3000 }, function(err, port) {
      serverProcess = fork(__dirname + '/../server.js', [], {
        env: { PORT: port }
      });
      serverAddr = 'http://localhost:' + port;
      done(err);
    });
  });

  suiteTeardown(function() {
    serverProcess.kill();
  });

  setup(function(done) {
    client.goUrl(serverAddr, function(err) {
      async.parallel([
        client.findElement.bind(client, '#form-a'),
        client.findElement.bind(client, '[name="my-text-1"]'),
        client.findElement.bind(client, '[name="my-text-2"]'),
        client.findElement.bind(client, '[name="my-time"]'),
        client.findElement.bind(client, '[name="my-date"]'),
        client.findElement.bind(client, '[name="my-no-type"]'),
        client.findElement.bind(client, '#invalid')
      ], function(err, results) {
        elems.form = results[0];
        elems.text1 = results[1];
        elems.text2 = results[2];
        elems.time = results[3];
        elems.date = results[4];
        elems.noType = results[5];
        elems.invalid = results[6];
        done();
      });
    });
  });

  suite('#fill', function() {

    suite('asynchronous API', function() {
      suite('single element', function() {
        test('text', function(done) {
          client.forms.fill(elems.text1, 'Some text', function() {
            elems.text1.getAttribute('value', function(err, val) {
              assert.equal(val, 'Some text');
              done();
            });
          });
        });
        test('time', function(done) {
          var date = new Date();
          date.setHours(1);
          date.setMinutes(2);
          date.setSeconds(3);
          client.forms.fill(elems.time, date, function() {
            elems.time.getAttribute('value', function(err, val) {
              assert.equal(val, '01:02:03');
              done();
            });
          });
        });
        test('date', function(done) {
          var date = new Date();
          date.setYear(1997);
          date.setMonth(0);
          date.setDate(2);
          client.forms.fill(elems.date, date, function() {
            elems.date.getAttribute('value', function(err, val) {
              assert.equal(val, '1997-01-02');
              done();
            });
          });
        });
        test('no [type]', function(done) {
          client.forms.fill(elems.noType, 'Some text', function() {
            elems.noType.getAttribute('value', function(err, val) {
              assert.equal(val, 'Some text');
              done();
            });
          });
        });
        test('invalid', function(done) {
          client.forms.fill(elems.invalid, 'Some text', function(err) {
            assert.ok(err, 'error is propagated');
            done();
          });
        });
      });
    });

    process.env.SYNC && suite('synchronous API', function() {
      suite('single element', function() {
        test('text', function() {
          client.forms.fill(elems.text1, 'Some text');
          assert.equal(elems.text1.getAttribute('value'), 'Some text');
        });
        test('time', function() {
          var date = new Date();
          date.setHours(1);
          date.setMinutes(2);
          date.setSeconds(3);
          client.forms.fill(elems.time, date);
          assert.equal(elems.time.getAttribute('value'), '01:02:03');
        });
        test('date', function() {
          var date = new Date();
          date.setYear(1997);
          date.setMonth(0);
          date.setDate(2);
          client.forms.fill(elems.date, date);
          assert.equal(elems.date.getAttribute('value'), '1997-01-02');
        });
        test('no [type]', function() {
          client.forms.fill(elems.noType, 'Some text');
          assert.equal(elems.noType.getAttribute('value'), 'Some text');
        });
        test('invalid', function() {
          assert.throws(function() {
            client.forms.fill(elems.invalid, 'Some text');
          });
        });
      });

      test('multiple elements', function() {
        var date = new Date();
        date.setYear(1997);
        date.setMonth(0);
        date.setDate(2);
        date.setHours(3);
        date.setMinutes(4);
        date.setSeconds(5);

        client.forms.fill(elems.form, {
          'my-text-1': 'Some text',
          'my-text-2': 'Some more text',
          'my-time': date,
          'my-date': date,
          'my-no-type': 'Lorem Ipsum',
          'invalid': 'Should be bypassed'
        });
        assert.equal(
          elems.text1.getAttribute('value'),
          'Some text',
          'Correct text input value'
        );
        assert.equal(
          elems.text2.getAttribute('value'),
          'Some more text',
          'Correct text value'
        );
        assert.equal(
          elems.time.getAttribute('value'),
          '03:04:05',
          'Correct time input value'
        );
        assert.equal(
          elems.date.getAttribute('value'),
          '1997-01-02',
          'Correct date input value'
        );
        assert.equal(
          elems.noType.getAttribute('value'),
          'Lorem Ipsum',
          'Correct input value even if missing [type]'
        );
      });
    });

    test('multiple elements', function() {
      var date = new Date();
      date.setYear(1997);
      date.setMonth(0);
      date.setDate(2);
      date.setHours(3);
      date.setMinutes(4);
      date.setSeconds(5);

      client.forms.fill(elems.form, {
        'my-text-1': 'Some text',
        'my-text-2': 'Some more text',
        'my-time': date,
        'my-date': date,
        'my-no-type': 'Lorem Ipsum',
        'invalid': 'Should be bypassed'
      }, function() {
        async.parallel([
          elems.text1.getAttribute.bind(elems.text1, 'value'),
          elems.text2.getAttribute.bind(elems.text2, 'value'),
          elems.time.getAttribute.bind(elems.time, 'value'),
          elems.date.getAttribute.bind(elems.date, 'value'),
          elems.noType.getAttribute.bind(elems.noType, 'value')
        ], function(err, results) {
          assert.equal(results[0], 'Some text', 'Correct text input value');
          assert.equal(
            results[1],
            'Some more text',
            'Correct text input value'
          );
          assert.equal(results[2], '03:04:05', 'Correct time input value');
          assert.equal(results[3], '1997-01-02', 'Correct date input value');
          assert.equal(
            results[4],
            'Lorem Ipsum',
            'Correct input value even if missing [type]'
          );
        });
      });
    });
  });
});
