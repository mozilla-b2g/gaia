'use strict';

mocha.globals(['SIMSlot']);

suite('SIMSlot', function() {
  suiteSetup(function() {
  });

  suiteTeardown(function() {
  });

  setup(function(callback) {
    requireApp('system/js/simslot.js', callback);
  });

  teardown(function() {
  });

  test('new', function() {
    var created = false;
    window.addEventListener('simslot-created', function() {
      created = true;
    });
    var slot = new SIMSlot(null, 0);
    assert.isTrue(created);
  });

  test('update', function() {
    var slot = new SIMSlot(null, 0);
    var card = document.createElement('div');
    slot.update(card);
    assert.deepEqual(slot.simCard, card);
  });

  test('isAbsent', function() {
    var card = document.createElement('div');
    card.iccInfo = {
      iccid: 1
    };
    var slot1 = new SIMSlot(null, 0, card);
    assert.isFalse(slot1.isAbsent());

    var slot2 = new SIMSlot(null, 0);
    assert.isTrue(slot2.isAbsent());
  });

  ['unknown', 'illegal', 'absent', 'ready', null].forEach(function(lockType) {
    test('isLocked: ' + lockType, function() {
      var card = document.createElement('div');
      card.cardState = lockType;
      var slot = new SIMSlot(null, 0, card);
      assert.isFalse(slot.isLocked());
    });
  });

  ['pinRequired', 'pukRequired', 'networkLocked',
   'corporateLocked', 'serviceProviderLocked'].forEach(function(lockType) {
    test('isLocked: ' + lockType, function() {
      var card = document.createElement('div');
      card.cardState = lockType;
      var slot = new SIMSlot(null, 0, card);
      assert.isTrue(slot.isLocked());
    });
  });

  suite('handleEvent', function() {
    test('cardstatechange', function() {
      var slot = new SIMSlot(null, 0);
      var stubPublish = this.sinon.stub(slot, 'publish');
      slot.handleEvent({
        type: 'cardstatechange'
      });
      assert.isTrue(stubPublish.calledWith('cardstatechange'));
    });

    test('iccinfochange', function() {
      var slot = new SIMSlot(null, 0);
      var stubPublish = this.sinon.stub(slot, 'publish');
      slot.handleEvent({
        type: 'iccinfochange'
      });
      assert.isTrue(stubPublish.calledWith('iccinfochange'));
    });

    test('stkcommand', function() {
      var slot = new SIMSlot(null, 0);
      var stubPublish = this.sinon.stub(slot, 'publish');
      slot.handleEvent({
        type: 'stkcommand'
      });
      assert.isTrue(stubPublish.calledWith('stkcommand'));
    });

    test('stksessionend', function() {
      var slot = new SIMSlot(null, 0);
      var stubPublish = this.sinon.stub(slot, 'publish');
      slot.handleEvent({
        type: 'stksessionend'
      });
      assert.isTrue(stubPublish.calledWith('stksessionend'));
    });
  });
});
