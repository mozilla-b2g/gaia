'use strict';

/* global utils, importer, MockAlphaScroll, MockImageLoader */
/* global MockSearch, MockasyncStorage, MockOauthflow, MockImportHtml */
/* global MockConnector, MockImportedContacts, MockCurtain, MockLazyLoader */
/* global MockConfirmDialog */

require('/shared/js/text_normalizer.js');
require('/shared/js/contacts/search.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
require('/shared/js/contacts/import/importer_ui.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/utilities/templates.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_confirm_dialog.js');

requireApp('communications/contacts/test/unit/import/mock_import.html.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_search.js');
requireApp('communications/contacts/test/unit/mock_oauthflow.js');
require('/shared/js/contacts/import/friends_list.js');
requireApp('communications/contacts/test/unit/mock_contacts_shortcuts.js');
requireApp('communications/contacts/test/unit/mock_utils.js');
requireApp('communications/facebook/test/unit/mock_curtain.js');
requireApp('communications/contacts/test/unit/import/mock_connector.js');
requireApp(
        'communications/contacts/test/unit/import/mock_imported_contacts.js');

var realSearch,
    realImageLoader,
    realAlphaScroll,
    realAsyncStorage,
    realOauthflow,
    realCurtain,
    realLazyLoader,
    realConfirmDialog,
    realParentLazyLoader,
    groupsListChild, groupsList;

if (!window.asyncStorage) {
  window.asyncStorage = null;
}

if (!window.ImageLoader) {
  window.ImageLoader = null;
}

if (!window.contacts) {
  window.contacts = null;
}

if (!window.onrendered) {
  window.onrendered = true;
}

if (!window.oauthflow) {
  window.oauthflow = null;
}

if (!window.LazyLoader) {
  window.LazyLoader = null;
}

if (!window.ConfirmDialog) {
  window.ConfirmDialog = null;
}

setup(function() {
  importer.reset();
});



suite('Import Friends Test Suite', function() {
  suiteSetup(function() {
    realAlphaScroll = utils.AlphaScroll;
    utils.alphaScroll = MockAlphaScroll;

    realCurtain = window.Curtain;
    window.Curtain = MockCurtain;

    realImageLoader = window.ImageLoader;
    window.ImageLoader = MockImageLoader;

    realSearch = window.contacts.Search;
    window.contacts.Search = MockSearch;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;

    realOauthflow = window.oauthflow;
    window.oauthflow = MockOauthflow;

    realLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;

    realConfirmDialog = window.ConfirmDialog;
    window.ConfirmDialog = MockConfirmDialog;

    realParentLazyLoader = window.parent.LazyLoader;
    window.parent.LazyLoader = MockLazyLoader;

    document.body.innerHTML = MockImportHtml;

    groupsList = document.body.querySelector('#groups-list');
    groupsListChild = groupsList.firstElementChild;

    importer.ui.init();
  });


  test('Import UI. items created. not already present', function(done) {
    var contactsLoadedCalled = false;
    MockConnector.oncontactsloaded = function() {
      contactsLoadedCalled = true;
    };
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);

    importer.start('mock_token', MockConnector, '*', function() {
      assert.equal(document.querySelectorAll('#groups-list li').length,
                   MockImportedContacts.data.length);

      // MockAsyncStorage is ordering by first name
      assert.isNotNull(document.
                       querySelector('section#group-P li[data-uuid="1xz"]'));
      assert.isNotNull(document.
                       querySelector('section#group-A li[data-uuid="2abc"]'));
      assert.isNotNull(document.
                       querySelector('section#group-Ψ li[data-uuid="3cde"]'));

      assert.equal(document.querySelectorAll('section#group-G *').length, 0);

      assert.equal(document.querySelector('input[name="1xz"]').checked, false);
      assert.equal(document.querySelector('input[name="2abc"]').checked, false);
      assert.equal(document.querySelector('input[name="3cde"]').checked, false);

      assert.isTrue(document.getElementById('deselect-all').disabled);
      assert.isFalse(document.getElementById('select-all').disabled);
      assert.isTrue(document.getElementById('import-action').disabled);

      if (contactsLoadedCalled) {
        done();
      }
      else {
        assert.fail('contactsLoaded not Called', 'contactsLoadedCalled');
        done();
      }
    });
  });


  test('Import UI with some contacts already imported', function(done) {
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);
    var listDeviceContacts = MockConnector.listDeviceContacts;

    MockConnector.listDeviceContacts = function(callbacks) {
      callbacks.success([
        {
          uid: '1xz'
        }
      ]);
    };

    importer.start('mock_token', MockConnector, '*', function() {
      var check = document.querySelector(
                                  'li[data-uuid="1xz"] input[type="checkbox"]');

      assert.isTrue(check.checked);

      var otherCheck = document.querySelector(
                                'li[data-uuid="2abc"] input[type="checkbox"]');

      assert.isFalse(otherCheck.checked);

      assert.isFalse(document.getElementById('deselect-all').disabled);
      assert.isFalse(document.getElementById('select-all').disabled);

      done();
    });

    MockConnector.listDeviceContacts = listDeviceContacts;
  });

  test('Import UI with all contacts already imported', function(done) {
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);
    var listDeviceContacts = MockConnector.listDeviceContacts;

    MockConnector.listDeviceContacts = function(callbacks) {
      callbacks.success([
        {
          uid: '1xz'
        },
        {
          uid: '2abc'
        },
        {
          uid: '3cde'
        }
      ]);
    };

    importer.start('mock_token', MockConnector, '*', function() {
      var check = document.querySelector(
                                  'li[data-uuid="1xz"] input[type="checkbox"]');

      assert.isTrue(check.checked);

      var otherCheck = document.querySelector(
                                'li[data-uuid="2abc"] input[type="checkbox"]');

      assert.isTrue(otherCheck.checked);

      var anotherCheck = document.querySelector(
                                'li[data-uuid="3cde"] input[type="checkbox"]');

      assert.isTrue(anotherCheck.checked);

      assert.isTrue(document.getElementById('deselect-all').disabled === false);
      assert.isTrue(document.getElementById('select-all').disabled === true);

      done();
    });

    MockConnector.listDeviceContacts = listDeviceContacts;
  });

  test('Import UI, Importing then deleting contacts from Outlook/Gmail ' +
       'returns the correct result', function(done) {
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);
    var listDeviceContacts = MockConnector.listDeviceContacts;
    // Simulate contacts already imported from the connector
    MockConnector.listDeviceContacts = function(callbacks) {
      callbacks.success([
        {
          uid: '1xz'
        },
        {
          uid: '2abc'
        },
        {
          uid: '3cde'
        }
      ]);
    };
    // Simulate the desktop deletion of all contacts
    this.sinon.stub(MockConnector, 'listAllContacts',
      function(access_token, callbacks) {
        callbacks.success({data: []});
      }
    );

    var spy = sinon.spy(window.ConfirmDialog, 'show');

    importer.start('mock_token', MockConnector, '*', function() {
      done(function() {
        assert.isTrue(spy.called);
        assert.isTrue(spy.calledWith(null, 'emptyAccount'));
      });
    });

    spy.restore();
    MockConnector.listDeviceContacts = listDeviceContacts;
  });

  test('Import UI with no contacts available to import', function(done) {
    groupsList.innerHTML = '';
    groupsList.appendChild(groupsListChild);

    var listAllContacts = MockConnector.listAllContacts;

    MockConnector.listAllContacts = function(access_token, callbacks) {
      callbacks.success({ data: []});
    };

    var spy = sinon.spy(window.ConfirmDialog, 'show');

    importer.start('mock_token', MockConnector, '*', function() {
      done(function() {
        assert.isTrue(spy.called);
        assert.isTrue(spy.calledWith(null, 'emptyAccount'));
      });
    });

    spy.restore();
    MockConnector.listAllContacts = listAllContacts;
  });

  suite('Import process', function() {
    var stubFriendListRenderer;
    var listDeviceContacts;
    var mockCurtainHide;
    var stubImporterImportAll;
    var stubParentPostMessage;

    suiteSetup(function() {
      stubFriendListRenderer = sinon.stub(window.FriendListRenderer, 'render',
        function(contacts, cb) {
          cb();
      });

      mockCurtainHide = MockCurtain.hide;
      MockCurtain.hide = function (cb) {cb();};

      listDeviceContacts = MockConnector.listDeviceContacts;
      MockConnector.listDeviceContacts = function(callbacks) {
        callbacks.success([{uid: '1xz'}]);
      };
      stubImporterImportAll = sinon.stub(importer, 'importAll', function(cb) {
        cb();
      });
    });

    setup(function() {
      groupsList.innerHTML = '';
      groupsList.appendChild(groupsListChild);
    });

    test('Import UI is closed when process ends in FTU', function(done) {
      var stubGetContext = sinon.stub(importer, 'getContext', function() {
        return 'ftu';
      });

      stubParentPostMessage = sinon.stub(window.parent, 'postMessage',
        function(msg) {
          if (msg.type === 'window_close') {
            done(function() {
              assert.ok('passed');
              stubGetContext.restore();
            });
          }
      });

      importer.start('mock_token', MockConnector, '*', function() {
        importer.setSelected({contact1: null});
        importer.ui.importAll();
      });
    });

    test('Import UI is closed when process ends in contacts', function(done) {
      stubParentPostMessage = sinon.stub(window.parent, 'postMessage',
        function(msg) {
          if (msg.type === 'import_updated') {
            window.postMessage({type: 'contacts_loaded'}, '*');
          } else if (msg.type === 'window_close') {
            done(function() {
              assert.ok('passed');
            });
          }
      });

      importer.start('mock_token', MockConnector, window.location.origin,
          function() {
        importer.setSelected({contact1: null});
        importer.ui.importAll();
      });
    });

    suite('Number of contacts available to import', function() {
      var fbContacts;
      var deviceContacts;
      var observer;

      function setObserver(callback) {
        observer = new MutationObserver(callback);
        var observerTarget = document.getElementById('friends-msg');
        observer.observe(observerTarget, {attributes: true});

        var MockFbConnector = {
          name: 'facebook',
          listAllContacts: function(token, cb) {
            cb.success({data: fbContacts});
          },
          listDeviceContacts: function(cb) {
            cb.success(deviceContacts);
          },
          adaptDataForShowing: function(data) {
            return data;
          },
          getContactUid: function(data) {
            return data;
          }
        };

        window.importer.start('test_token', MockFbConnector);
      }

      suiteSetup(function() {
        sinon.stub(window.Curtain, 'hide', function() {});
      });

      suiteTeardown(function() {
        window.Curtain.hide.restore();
      });

      teardown(function() {
        observer.disconnect();
      });

      test('If fb contacts < device contacts, 0', function(done) {
        fbContacts = ['contact1', 'contact2'];
        deviceContacts = ['contact1', 'contact2', 'contact3'];

        setObserver(function(mutations) {
          done(function() {
            var l10nAttrs =
              navigator.mozL10n.getAttributes(mutations[0].target);
            assert.deepEqual(l10nAttrs.args, { numFriends : 0 },
              'The number must be 0');
          });
        });
      });

      test('If fb contacts = device contacts, 0', function(done) {
        fbContacts = ['contact1', 'contact2', 'contact3'];
        deviceContacts = ['contact1', 'contact2', 'contact3'];

        setObserver(function(mutations) {
          done(function() {
            var l10nAttrs =
              navigator.mozL10n.getAttributes(mutations[0].target);
            assert.deepEqual(l10nAttrs.args, { numFriends : 0 },
              'The number must be 0');
          });
        });
      });

      test('If fb contacts > device contacts, >0', function(done) {
        fbContacts = ['contact1', 'contact2', 'contact3'];
        deviceContacts = ['contact1', 'contact2'];

        setObserver(function(mutations) {
          done(function() {
            var l10nAttrs =
              navigator.mozL10n.getAttributes(mutations[0].target);
            assert.deepEqual(l10nAttrs.args, { numFriends : 1 },
              'The number must be 1');
          });
        });
      });
    });

    teardown(function() {
      stubParentPostMessage.restore();
    });

    suiteTeardown(function() {
      MockConnector.listDeviceContacts = listDeviceContacts;
      stubImporterImportAll.restore();
      stubFriendListRenderer.restore();
      MockCurtain.hide = mockCurtainHide;
    });
  });

  suiteTeardown(function() {
    utils.alphaScroll = realAlphaScroll;
    window.ImageLoader = realImageLoader;
    window.contacts.Search = realSearch;
    window.asyncStorage = realAsyncStorage;
    window.oauthflow = realOauthflow;
    window.curtain = realCurtain;
    window.LazyLoader = realLazyLoader;
    window.ConfirmDialog = realConfirmDialog;
    window.parent.LazyLoader = realParentLazyLoader;
  });

});

suite('HTML format', function() {
  test('Contact name is tagged with the right class', function() {
    function loadImportHTML() {
      var req = new XMLHttpRequest();
      req.open('GET', '/shared/pages/import/import.html', false);
      req.send(null);
      return req.responseText;
    }

    document.body.innerHTML = loadImportHTML();
    assert.ok(document.getElementsByClassName('contact-text'), 'Some element' +
        'with class contact-text should exist for search highlighting to work');
  });
});
