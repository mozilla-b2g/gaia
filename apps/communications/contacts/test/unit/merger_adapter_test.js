requireApp('communications/contacts/js/merger_adapter.js');

suite('Merger Adapter Tests', function() {

  var realMerger, merge, incomingContact, matches, callbacks;

  suiteSetup(function() {
    realMerger = contacts.Merger;
    contacts.Merger = {
      merge: sinon.spy()
    };
    merge = contacts.Merger.merge;
    callbacks = {
      error: sinon.spy()
    };
  });

  suiteTeardown(function() {
    contacts.Merger = realMerger;
  });

  setup(function() {
    incomingContact = {
      name: ['Alfred']
    };

    matches = {
      '1A': {
        matchingContact: {
          id: '1A',
          name: ['Fred']
        }
      },
      '1B': {
        matchingContact: {
          id: '1B',
          name: ['Albert']
        }
      }
    };

    merge.reset();
    callbacks.error.reset();
  });

  function assertAllButOneWillBeDeleted(matchings) {
    var notRemovables = 0;
    for (var i = 0, l = matchings.length; i < l; i++) {
      if (!hasId(matchings[i].matchingContact)) {
        notRemovables++;
      }
    }
    return notRemovables === 1;
  }

  function hasId(contact) {
    return !!contact.id;
  }

  test('No masterId passed. Selecting incoming contact as master.', function() {
    contacts.adaptAndMerge(incomingContact, matches, callbacks);
    var masterContact = merge.getCall(0).args[0];
    var mergeMatchings = merge.getCall(0).args[1];

    assert.equal(masterContact, incomingContact);
    assert.deepEqual(masterContact, incomingContact);
    assert.equal(Object.keys(matches).length, mergeMatchings.length);
  });

  test('masterId is defined but it is not one of the matches', function() {
    contacts.adaptAndMerge(incomingContact, matches, callbacks, 'XXX');
    assert.ok(callbacks.error.called);
  });

  test('masterId defined. Selecting master among the matches.', function() {
    var selectedMaster = matches['1A'].matchingContact;

    contacts.adaptAndMerge(incomingContact, matches, callbacks, '1A');
    var masterContact = merge.getCall(0).args[0];
    var mergeMatchings = merge.getCall(0).args[1];

    assert.equal(masterContact, selectedMaster);
    assert.deepEqual(masterContact, selectedMaster);
    assert.equal(Object.keys(matches).length, mergeMatchings.length);
    assert.equal(mergeMatchings[mergeMatchings.length - 1].matchingContact,
                                                               incomingContact);
  });

});
