'use strict';

/* global MocksHelper */
/* global ICEData */

requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_cache.js');
requireApp('communications/contacts/js/utilities/ice_data.js');
require('/shared/test/unit/mocks/mock_ice_store.js');

var mocksHelper = new MocksHelper([
  'asyncStorage',
  'Cache',
  'ICEStore'
]);

mocksHelper.init();

suite('ICE Data', function() {
  var subject;

  suiteSetup(function() {
    subject = ICEData;
    mocksHelper.suiteSetup();
  });

  setup(function() {
    window.asyncStorage.keys = {
      'ice-contacts': [{ id: 1, active: true}]
    };
  });

  suite('> Load data', function() {
    test('> Check data from async storage', function(done) {
      subject.load().then(done(function() {
        var iceContacts = subject.iceContacts;
        assert.lengthOf(iceContacts, 2);
        assert.isTrue(iceContacts[0].active);
        assert.equal(iceContacts[0].id, 1);
        assert.isFalse(iceContacts[1].active);
      }), done);
    });

    test('> With no ice local async data', function(done) {
      window.asyncStorage.keys = {};
      subject.load().then(done(function() {
        var iceContacts = subject.iceContacts;
        assert.isFalse(iceContacts[0].active);
        assert.isFalse(iceContacts[1].active);
      }), done);
    });
  });

  suite('> Set ice contact', function() {
    test('> Adding a new contact', function(done) {
      subject.setICEContact(2, 1, true).then(done(function() {
        var iceContacts = subject.iceContacts;
        assert.equal(iceContacts[1].id, 2);
        assert.isTrue(iceContacts[1].active);
      }), done);
    });

    test('> Change an existing ice contact', function(done) {
      subject.setICEContact(1, 0, false).then(done(function() {
        var iceContacts = subject.iceContacts;
        assert.isFalse(iceContacts[0].active);
      }),done);
    });

    test('> Data sent to DS is valid', function(done) {
      subject.load().then(function() {
        subject.setICEContact(2, 1, true).then(function(data) {
          done(function() {
            assert.lengthOf(data, 2);
          });
        });
      }, done);
    });

    test('> Setting ICE Contacts', function(done) {
      var newIceContacts = ['aaa'];

      subject.setICEContacts(newIceContacts).then(done(function() {
        var iceContacts = subject.iceContacts;
        assert.equal(iceContacts[0].id, 'aaa');
        assert.isTrue(iceContacts[0].active);
        assert.isUndefined(iceContacts[1].id);
      }), done);
    });
  });

  suite('> Listen for changes', function() {
    setup(function() {
      subject.stopListenForChanges();
    });

    test('> Several listening attach one contact change', function(done) {
      sinon.spy(document, 'addEventListener');

      subject.listenForChanges(function() {}).then(function() {
        return subject.listenForChanges(function() {});
      }).then(function() {
          sinon.assert.calledOnce(document.addEventListener);
          document.addEventListener.restore();
          done();
      });
    });

    test('> A change in a non ice contact will not trigger', function(done) {
      var changeCallback;
      var stub = sinon.stub(document, 'addEventListener', function(name, cb) {
        changeCallback = cb;
      });

      subject.listenForChanges(function() {
        throw new Error();
      }).then(function() {
          changeCallback({
            detail: {
              contactID: 5,
              reason: 'update'
            }
          });
          stub.restore();
          done();
      });
    });

    test('> A change in a ice contact will trigger', function(done) {
      var changeCallback;
      var stub = sinon.stub(document, 'addEventListener', function(name, cb) {
        changeCallback = cb;
      });

      subject.listenForChanges(function() {
          stub.restore();
          done(function() {
            assert.ok('ok');
          });
      }).then(function() {
          changeCallback({
            detail: {
              contactID: 1,
              reason: 'update'
            }
          });
      });
    });

    test('> ICE contact removed', function(done) {
      var changeCallback;

      var stub = sinon.stub(document, 'addEventListener', function(name, cb) {
        changeCallback = cb;
      });

      subject.listenForChanges(function() {
        done(function() {
          assert.isFalse(subject.iceContacts[0].id === 1);
          assert.isFalse(subject.iceContacts[0].active);

          stub.restore();
        });
      }).then(function() {
            changeCallback({
              detail: {
                contactID: 1,
                reason: 'remove'
              }
        });
      });
    });

    test('> Several contacts removed', function(done) {
      var changeCallback;

      window.asyncStorage.keys = {
        'ice-contacts': [{ id: 1, active: true}, {id: 2, active: true}]
      };

      var stub = sinon.stub(document, 'addEventListener', function(name, cb) {
        changeCallback = cb;
      });

      var listenerCalled = 0;

      subject.listenForChanges(function() {
        listenerCalled++;
        assert.isFalse(subject.iceContacts[(listenerCalled-1)].id ===
         listenerCalled);
        assert.isFalse(subject.iceContacts[(listenerCalled-1)].active);
        if (listenerCalled === 2) {
          done(function() {
            stub.restore();
          });
        }
      }).then(function() {
        // Perform several changes, but we will receive just 2 changes
        // in the callback above as we defined 2 ICE contacts and we
        // removed those
            changeCallback({
              detail: {
                contactID: 1,
                reason: 'remove'
              }
            });
            changeCallback({
              detail: {
                contactID: 2,
                reason: 'remove'
              }
            });
            changeCallback({
              detail: {
                contactID: 3,
                reason: 'remove'
              }
            });
      });
    });

  });
});
