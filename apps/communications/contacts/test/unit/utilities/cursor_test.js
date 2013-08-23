require('/shared/js/setImmediate.js');
requireApp('communications/contacts/js/utilities/cursor.js');


suite('cursor', function() {
  var cursor;

  setup(function(done) {
    cursor = new contacts.Cursor();
    done();
  });

  teardown(function(done) {
    cursor.end();
    cursor = null;
    done();
  });

  test('constructor', function(done) {
    var c1 = contacts.Cursor();
    assert.ok(c1 instanceof contacts.Cursor);
    var c2 = new contacts.Cursor();
    assert.ok(c2 instanceof contacts.Cursor);
    done();
  });

  test('emit custom event', function(done) {
    cursor.on('custom', function() {
      done();
    });
    cursor.emit('custom');
  });

  test('next() fires "next" event', function(done) {
    cursor.on('next', function() {
      done();
    });
    cursor.next();
  });

  test('end() fires "end" event', function(done) {
    cursor.on('end', function() {
      done();
    });
    cursor.end();
  });

  test('cancel() fires "cancel" and "end" events', function(done) {
    var canceled = false;
    cursor.on('cancel', function() {
      canceled = true;
    });
    cursor.on('end', function() {
      assert.ok(canceled);
      done();
    });
    cursor.cancel();
  });

  test('end() fires at most one "end" event', function(done) {
    var count = 0;
    cursor.on('end', function() {
      count += 1;
    });
    cursor.end();
    cursor.end();
    setImmediate(function() {
      assert.equal(1, count);
      done();
    });
  });

  test('push() fires "data" event', function(done) {
    cursor.on('data', function() {
      done();
    });
    cursor.push();
  });

  test('push() passes arguments to "data" event', function(done) {
    cursor.on('data', function(a, b) {
      assert.equal(23, a);
      assert.equal('foobar', b);
      done();
    });
    cursor.push(23, 'foobar');
  });
});
