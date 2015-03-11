suite('CallFdnList Panel > ', function() {
  'use strict';

  var callFdnListPanel;
  var mockFdnContext;
  var mockDialogService;
  var mockDsdsSettings;

  var modules = [
    'modules/fdn_context',
    'modules/dialog_service',
    'modules/settings_panel',
    'dsds_settings',
    'panels/call_fdn_list/panel'
  ];

  var map = {
    '*': {
      'modules/fdn_context': 'MockFdnContext',
      'modules/dialog_service': 'MockDialogService',
      'modules/settings_panel': 'MockSettingsPanel',
      'dsds_settings': 'MockDsdsSettings'
    }
  };

  setup(function(done) {
    define('MockDsdsSettings', function() {
      return  {
        getIccCardIndexForCallSettings: function() {
          return 0;
        }
      };
    });
    
    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        var obj = {
          init: options.onInit,
          beforeShow: options.onBeforeShow,
          beforeHide: options.onBeforeHide,
          hide: options.onHide,
        };
        Object.keys(options).forEach(function(key) {
          if (key.match(/^_(.*?)/)) {
            obj[key] = options[key];
          }
        });
        return obj;
      };
    });
    
    define('MockDialogService', function() {
      return {
        show: function() {
          return Promise.resolve({
            type: 'submit'  
          });
        }
      };
    });

    define('MockFdnContext', function() {
      return {
        createAction: function() {},
        getContacts: function() {}
      };
    });

    var requireCtx = testRequire([], map, function() {});
    requireCtx(modules, function(MockFdnContext, MockDialogService,
      MockSettingsPanel, MockDsdsSettings, CallFdnListPanel) {
        mockFdnContext = MockFdnContext;
        mockDialogService = MockDialogService;
        mockDsdsSettings = MockDsdsSettings;
        callFdnListPanel = CallFdnListPanel();

        var panel = createElement('div');
        panel.appendChild(createElement('button', 'fdnContact'));
        panel.appendChild(createElement('div', 'call-fdnList-action'));
        panel.appendChild(createElement('div', 'fdnAction-name'));
        panel.appendChild(createElement('div', 'fdnAction-number'));
        panel.appendChild(createElement('div', 'fdnAction-number'));
        panel.appendChild(createElement('button', 'fdnAction-call'));
        panel.appendChild(createElement('button', 'fdnAction-edit'));
        panel.appendChild(createElement('button', 'fdnAction-delete'));
        panel.appendChild(createElement('button', 'fdnAction-cancel'));
        panel.appendChild(createElement('ul', 'fdn-contactsContainer'));

        callFdnListPanel.init(panel);
        done();
    });
  });

  suite('_renderAuthorizedNumbers', function() {
    var fakeContacts = [{}, {}];
    setup(function() {
      this.sinon.stub(mockFdnContext, 'getContacts', function() {
        return Promise.resolve(fakeContacts);
      });
      this.sinon.stub(callFdnListPanel, '_renderFdnContact', function() {
        return document.createElement('li');
      });
    });

    test('we will do related works', function(done) {
      callFdnListPanel._renderAuthorizedNumbers().then(function() {
        assert.isTrue(callFdnListPanel._renderFdnContact.calledTwice);
        assert.equal(fakeContacts.length,
          callFdnListPanel._elements.contactsContainer.children.length);
      }).then(done, done);
    });
  });

  suite('_showActionMenu', function() {
    var fakeContact = {
      name: 'fakeName',
      number: 'fakeNumber'
    };

    setup(function() {
      callFdnListPanel._showActionMenu(fakeContact);
    });
    
    test('we will show the menu and update information on it', function() {
      assert.equal(callFdnListPanel._currentContact, fakeContact);
      assert.equal(callFdnListPanel._elements.fdnActionMenuName.textContent,
        fakeContact.name);
      assert.equal(callFdnListPanel._elements.fdnActionMenuNumber.textContent,
        fakeContact.number);
      assert.isFalse(callFdnListPanel._elements.fdnActionMenu.hidden);
    });
  });

  suite('_hideActionMenu', function() {
    setup(function() {
      callFdnListPanel._hideActionMenu();
    });
    
    test('the menu will be hidden', function() {
      assert.isTrue(callFdnListPanel._elements.fdnActionMenu.hidden);
    });
  });

  suite('_renderFdnContact', function() {
    var fakeContact = {
      name: 'fakeContact',
      number: '123456'
    };

    setup(function() {
      this.sinon.stub(callFdnListPanel, '_showActionMenu');
    });

    test('we will show right info on the contact item', function() {
      var contactItem = callFdnListPanel._renderFdnContact(fakeContact);
      assert.equal(contactItem.querySelector('span').textContent,
        fakeContact.name);
      assert.equal(contactItem.querySelector('small').textContent,
        fakeContact.number);
    });

    test('when click on the item, show action menu', function() {
      var contactItem = callFdnListPanel._renderFdnContact(fakeContact);
      contactItem.click();
      assert.isTrue(callFdnListPanel._showActionMenu.called);
    });
  });

  suite('_updateContact', function() {
    setup(function() {
      this.sinon.stub(callFdnListPanel, '_renderAuthorizedNumbers');
    });

    test('we will _renderAuthorizedNumbers ' +
      'after pin2 is entered correctly', function(done) {
        callFdnListPanel._updateContact().then(function() {
          assert.isTrue(callFdnListPanel._renderAuthorizedNumbers.called);
        }).then(done, done);
    });
  });

  function createElement(type, className) {
    var element = document.createElement(type);
    className = className || '';
    element.className = className;
    return element;
  }
});
