require('/shared/js/lazy_loader.js');
require('/shared/js/zero_timeout.js');
requireApp('communications/contacts/js/contacts_list_queue.js');

suite('contacts.List.Queue', function() {
  var t;

  suiteSetup(function(done) {
    // Pre-load the following files with the lazy loader so that tests
    // run with predictable timing.
    var files = [
      '/shared/js/zero_timeout.js',
      '/contacts/js/contacts_list_queue.js'
    ];
    LazyLoader.load(files, function() {
      done();
    });
  });

  setup(function(done) {
    t = {};

    t.groups = ['A', 'B', 'C'];
    t.groupLists = _createGroupLists(t.groups);
    t.viewport = _createViewport(t.groupLists);
    t.beforeCount = 0;
    t.afterCount = 0;
    t.afterNumFlushed = 0;
    t.flushSize = 5;

    t.queue = new contacts.List.Queue({
      getViewport: function() { return t.viewport; },
      getGroupList: function(group) { return t.groupLists[group]; },
      createNode: _createNode,
      appendToGroupList: function(gl, n) { gl.appendChild(n); },
      before: function() { t.beforeCount += 1; },
      after: function(nf) { t.afterNumFlushed = nf; t.afterCount += 1; },
      flushSize: t.flushSize
    });

    done();
  });

  test('push', function(done) {
    for (var i = 0, n = t.groups.length; i < n; ++i) {
      var result = t.queue.push(t.groups[i], _contact(i));
      assert.isTrue(result, 'push to new queue');
    }
    done();
  });

  test('flush', function(done) {
    var numContacts = 3;
    var group = t.groups[0];
    for (var i = 0; i < numContacts; ++i) {
      var result = t.queue.push(group, _contact(i));
      assert.isTrue(result, 'push to new queue');
    }

    var numFlushed = t.queue.flush(group);
    assert.equal(numFlushed, numContacts);

    var groupList = t.groupLists[group];
    assert.equal(groupList.children.length, numFlushed);

    done();
  });

  test('flush order', function(done) {
    var numContacts = 3;
    var group = t.groups[0];
    for (var i = 0; i < numContacts; ++i) {
      var result = t.queue.push(group, _contact(numContacts - i));
      assert.isTrue(result, 'push to new queue');
    }

    t.queue.flush(group);

    var groupList = t.groupLists[group];
    assert.equal(groupList.children.length, numContacts);

    for (var i = 0; i < numContacts; ++i) {
      var node = groupList.children[i];
      assert.equal(node.dataset.uuid, numContacts - i);
    }

    done();
  });

  test('push to flushed', function(done) {
    for (var i = 0, n = t.groups.length; i < n; ++i) {
      var group = t.groups[i];

      var result = t.queue.push(group, _contact(i));
      assert.isTrue(result, 'push to new queue');

      var numFlushed = t.queue.flush(group);
      assert.equal(numFlushed, 1);

      result = t.queue.push(group, _contact(i + t.groups.length));
      assert.isFalse(result, 'push to flushed queue');
    }
    done();
  });

  test('flush empty', function(done) {
    var group = t.groups[0];
    var numFlushed = t.queue.flush(group);
    assert.equal(numFlushed, 0);
    var pushed = t.queue.push(group, _contact(1));
    assert.isFalse(pushed, 'push to flushed queue');
    done();
  });

  test('flush limit', function(done) {
    var group = t.groups[0];
    var numContacts = t.flushSize + 1;

    for (var i = 0; i < numContacts; ++i) {
      var pushed = t.queue.push(group, _contact(i));
      assert.isTrue(pushed, 'push to new queue');
    }

    var numFlushed = t.queue.flush(group);
    assert.equal(numFlushed, t.flushSize);

    pushed = t.queue.push(group, _contact(i));
    assert.isTrue(pushed, 'push to partial flushed queue');

    numFlushed = t.queue.flush(group);
    assert.equal(numFlushed, 2);

    pushed = t.queue.push(group, _contact(i + 1));
    assert.isFalse(pushed, 'push to flushed queue');

    done();
  });

  test('flush later', function(done) {
    var group = t.groups[0];

    var pushed = t.queue.push(group, _contact(0));
    assert.isTrue(pushed, 'push to new queue');

    t.queue.flushLater(group);

    setZeroTimeout(function() {
      assert.equal(t.beforeCount, 1);
      assert.equal(t.afterCount, 1);
      assert.equal(t.afterNumFlushed, 1);
      done();
    });
  });

  test('flush multiple queues later', function(done) {
    for (var i = 0, n = t.groups.length; i < n; ++i) {
      var group = t.groups[i];
      var pushed = t.queue.push(group, _contact(0));
      assert.isTrue(pushed, 'push to new queue');
      t.queue.flushLater(group);
    }

    setZeroTimeout(function() {
      assert.equal(t.beforeCount, 1);
      assert.equal(t.afterCount, 1);
      assert.equal(t.afterNumFlushed, t.groups.length);
      done();
    });
  });

  test('flush multiple queues later with limit', function(done) {
    var contactsPerGroup = t.flushSize + 1;

    for (var i = 0, n = t.groups.length; i < n; ++i) {
      var group = t.groups[i];
      for (var j = 0; j < contactsPerGroup; ++j) {
        var pushed = t.queue.push(group, _contact((i * 10) + j));
        assert.isTrue(pushed, 'push to new queue');
      }
      t.queue.flushLater(group);
    }

    var totalContacts = contactsPerGroup * t.groups.length;
    var expectedTimerCalls = Math.ceil(totalContacts / t.flushSize);
    var expectedRemainder = totalContacts % t.flushSize;

    var count = 0;
    var checkFlushTimer = function() {
      count += 1;
      assert.equal(t.beforeCount, count);
      assert.equal(t.afterCount, count);

      if (count < expectedTimerCalls)
        assert.equal(t.afterNumFlushed, t.flushSize);
      else
        assert.equal(t.afterNumFlushed, expectedRemainder, 'remainder');

      if (count < expectedTimerCalls) {
        setZeroTimeout(checkFlushTimer);
        return;
      }
      done();
    };
    setZeroTimeout(checkFlushTimer);
  });
});

// --------------------------------------------------------------------------
// Utility/Setup functions
// --------------------------------------------------------------------------
function _createGroupLists(groups) {
  var rtn = {};
  for (var i = 0, n = groups.length; i < n; ++i) {
    var list = document.createElement('ol');
    rtn[groups[i]] = list;
  }
  return rtn;
}

function _createViewport(groupLists) {
  var rtn = document.createElement('div');
  for (var group in groupLists) {
    rtn.appendChild(groupLists[group]);
  }
  return rtn;
}

function _createNode(contact, group) {
  var rtn = document.createElement('li');
  rtn.dataset.uuid = contact.id;
  rtn.dataset.group = group;
  return rtn;
}

function _contact(id) {
  return { id: id };
}
