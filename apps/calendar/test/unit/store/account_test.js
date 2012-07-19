requireApp('calendar/test/unit/helper.js', function() {
  testSupport.calendar.requireProvider();

  requireLib('db.js');
  requireLib('models/account.js');
  requireLib('models/calendar.js');
  requireLib('store/abstract.js');
  requireLib('store/account.js');
});

suite('store/account', function() {

  var subject, db;

  function add(object) {
    setup(function(done) {
      var store = subject.db.getStore('Calendar');
      var model = store._createModel(object);
      store.once('persist', function() {
        done();
      });
      store.persist(model);
    });
  }

  function createCal(object) {
    return new Calendar.Provider.Calendar.Abstract(
      subject.provider, object
    );
  }

  setup(function(done) {
    db = testSupport.calendar.db();
    subject = db.getStore('Account');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore('accounts', done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore('calendars', done);
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Store.Abstract);
    assert.equal(subject.db, db);
    assert.deepEqual(subject._cached, {});
  });

  test('#presetActive', function() {
    subject._cached[1] = { preset: 'A' };

    assert.isTrue(subject.presetActive('A'));
    assert.isFalse(subject.presetActive('B'));
  });

  suite('#_createModel', function() {
    test('with id', function() {
      var result = subject._createModel({
        providerType: 'Local'
      }, 'id');

      assert.equal(result.providerType, 'Local');
      assert.equal(result._id, 'id');
      assert.instanceOf(result, Calendar.Models.Account);
    });

    test('without id', function() {
     var result = subject._createModel({
        providerType: 'Local'
      });

      assert.equal(result.providerType, 'Local');
      assert.isFalse(('_id' in result));
    });

  });

  suite('#sync: add, remove, update', function() {
    var remote;
    var events;
    var model;
    var results;
    var store;

    add({ accountId: 6, remote: { id: 1, name: 'remove' } });
    add({ accountId: 6, remote: { id: 2, name: 'update' } });

    setup(function() {
      model = new Calendar.Models.Account({
        providerType: 'Local',
        _id: 6
      });

      remote = {};

      remote[2] = createCal({
        id: 2,
        name: 'update!',
        description: 'new desc'
      });

      remote[3] = createCal({
        id: 3,
        name: 'new item'
      });

      model.provider.findCalendars = function(cb) {
        cb(null, remote);
      };
    });

    setup(function(done) {
      store = subject.db.getStore('Calendar');
      events = {
        add: [],
        remove: [],
        update: []
      };

      store.on('add', function() {
        events.add.push(arguments);
      });

      store.on('update', function() {
        events.update.push(arguments);
      });

      store.on('remove', function() {
        events.remove.push(arguments);
      });

      subject.sync(model, function() {
        done();
      });
    });

    setup(function(done) {
      var store = subject.db.getStore('Calendar');
      store.load(function(err, data) {
        results = data;
        done();
      });
    });

    test('after sync', function() {
      var byRemote = {};
      assert.equal(Object.keys(results).length, 2);

      // re-index all records by remote
      Object.keys(results).forEach(function(key) {
        var obj = results[key];
        byRemote[obj.remote.id] = obj;
      });

      // EVENTS
      assert.ok(events.remove[0][0]);

      var updateObj = events.update[0][1].remote;
      assert.equal(updateObj.id, '2');

      var addObj = events.add[0][1].remote;
      assert.equal(addObj.id, '3');

      // update
      assert.instanceOf(byRemote[2], Calendar.Models.Calendar);
      assert.equal(byRemote[2].remote.description, 'new desc');
      assert.equal(byRemote[2].name, 'update!');

      // add
      assert.instanceOf(byRemote[3], Calendar.Models.Calendar);
      assert.equal(byRemote[3].name, 'new item');
    });

  });

});
