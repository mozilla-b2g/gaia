requireApp('clock/js/utils.js');

suite('Time functions', function() {

  suite('#formatTime', function() {
    var is12hStub;

    setup(function() {
      is12hStub = sinon.stub(window, 'is12hFormat');
    });

    teardown(function() {
      is12hFormat.restore();
    });

    test('12:00am, with 12 hour clock settings', function() {
      is12hStub.returns(true);
      assert.equal(formatTime(0, 0), '12:00AM');
    });

    test('12:30pm, with 12 hour clock settings', function() {
      is12hStub.returns(true);
      assert.equal(formatTime(12, 30), '12:30PM');
    });

    test('11:30pm, with 12 hour clock settings', function() {
      is12hStub.returns(true);
      assert.equal(formatTime(23, 30), '11:30PM');
    });

    test('12:30am, with 24 hour clock settings', function() {
      is12hStub.returns(false);
      assert.equal(formatTime(0, 30), '00:30');
    });

    test('12:30pm, with 24 hour clock settings', function() {
      is12hStub.returns(false);
      assert.equal(formatTime(12, 30), '12:30');
    });

    test('11:30pm, with 24 hour clock settings', function() {
      is12hStub.returns(false);
      assert.equal(formatTime(23, 30), '23:30');
    });

  });

  suite('#parseTime', function() {

    test('12:10am', function() {
      var time = parseTime('12:10AM');
      assert.equal(time.hour, 0);
      assert.equal(time.minute, 10);
    });

    test('12:00pm', function() {
      var time = parseTime('12:00PM');
      assert.equal(time.hour, 12);
      assert.equal(time.minute, 00);
    });

    test('11:30pm', function() {
      var time = parseTime('11:30PM');
      assert.equal(time.hour, 23);
      assert.equal(time.minute, 30);
    });

    test('00:15', function() {
      var time = parseTime('12:15AM');
      assert.equal(time.hour, 0);
      assert.equal(time.minute, 15);
    });

    test('23:45', function() {
      var time = parseTime('23:45');
      assert.equal(time.hour, 23);
      assert.equal(time.minute, 45);
    });
  });
});
