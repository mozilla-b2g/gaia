'use strict';

/* global MocksHelper */
/* global ICEData */

requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/js/utilities/ice_data.js');
require('/shared/test/unit/mocks/mock_ice_store.js');

var mocksHelper = new MocksHelper([
  'asyncStorage', 'ICEStore'
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
      subject.load().then(function() {
        var iceContacts = subject.iceContacts;
        assert.length(iceContacts, 2);
        assert.isTrue(iceContacts[0].active);
        assert.equal(iceContacts[0].id, 1);
        assert.isFalse(iceContacts[1].active);
        done();
      }, done);
    });

    test('> With no ice local async data', function(done) {
      window.asyncStorage.keys = {};
      subject.load().then(function() {
        var iceContacts = subject.iceContacts;
        assert.isFalse(iceContacts[0].active);
        assert.isFalse(iceContacts[1].active);
        done();
      }, done);
    });
  });

  suite('> Set ice contact', function() {
    test('> Adding a new contact', function(done) {
      subject.setICEContact(2, 1, true).then(function() {
        var iceContacts = subject.iceContacts;
        assert.equal(iceContacts[1].id, 2);
        assert.isTrue(iceContacts[1].active);
        done();
      }, done);
    });

    test('> Change an existing ice contact', function(done) {
      subject.setICEContact(1, 0, false).then(function() {
        var iceContacts = subject.iceContacts;
        assert.isFalse(iceContacts[0].active);
        done();
      },done);
    });

    test('> Data sent to DS is valid', function(done) {
      subject.load().then(function() {
        subject.setICEContact(2, 1, true).then(function(data) {
          assert.length(data, 2);
          done();
        });
      }, done);
    });
  });

  suite('> Listen for changes', function() {
    var realPromise;
    setup(function() {
      subject.stopListenForChanges();
    });
    suiteSetup(function() {
      realPromise = window.Promise;
      window.Promise = function(func, rj) {
        var args = Array.prototype.slice.call(arguments, 1);
        return {
          'then': function() {
            var allArguments = args.concat(
              Array.prototype.slice.call(arguments));
            return func.apply(this, allArguments);
          }
        };
      };
      window.Promise.resolve = function(args) {
        return {
          'then': function(fn) {
            fn(args);
          }
        };
      };
    });
    suiteTeardown(function() {
      window.Promise = realPromise;
    });
    test('> Several listening attach one contact change', function() {
      sinon.spy(document, 'addEventListener');
      subject.listenForChanges(function(){});
      subject.listenForChanges(function(){});
      sinon.assert.calledOnce(document.addEventListener);
      document.addEventListener.restore();
    });
    test('> A change in a non ice contact wont trigger', function() {
      var changeCallback;
      sinon.stub(document, 'addEventListener', function(name, cb) {
        changeCallback = cb;
      });
      subject.listenForChanges(function() {
        throw new Error();
      });

      changeCallback({
        detail: {
          contactID: 5,
          reason: 'update'
        }
      });
      document.addEventListener.restore();
    });
    test('> A change in a ice contact will trigger', function(done) {
      var changeCallback;
      sinon.stub(document, 'addEventListener', function(name, cb) {
        changeCallback = cb;
      });
      subject.listenForChanges(function() {
        done();
      });

      changeCallback({
        detail: {
          contactID: 1,
          reason: 'update'
        }
      });
      document.addEventListener.restore();
    });
    test('> ICE contact removed', function(done) {
      var changeCallback;
      
      sinon.stub(document, 'addEventListener', function(name, cb) {
        changeCallback = cb;
      });
      subject.listenForChanges(function() {
        assert.isFalse(subject.iceContacts[0].id === 1);
        assert.isFalse(subject.iceContacts[0].active);
        done();
      });

      changeCallback({
        detail: {
          contactID: 1,
          reason: 'remove'
        }
      });
      document.addEventListener.restore();
    });
  });
});