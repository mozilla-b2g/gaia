/* global LazyLoader, VCardLoadUI, MockContactsList, MockL10n, utils */

'use strict';

require('/shared/js/contacts/import/utilities/status.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('communications/contacts/views/vcard_load/js/vcard_load_ui.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');

suite('VCardLoadUI', function() {

  var realMozL10n, contacts, stubUtilsStatus;

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    // Load HTML
    loadBodyHTML('/contacts/views/vcard_load/vcard_load.html');

    // Add hook to template to "head"
    var importHook = document.createElement('link');
    importHook.id = 'multiple-select-import-link';
    importHook.setAttribute('rel', 'import');
    importHook.setAttribute('href', '/contacts/elements/multiple_select.html');
    document.head.appendChild(importHook);
console.log(document.body.innerHTML);
    // Fill the HTML
    LazyLoader.load(
      [
        document.getElementById('multiple-select-view')
      ],
      function() {
        contacts = MockContactsList();
        VCardLoadUI.init();
        done();
      }
    );
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
    window.VCardLoadUI = null;
    document.body.innerHTML = '';
  });

  setup(function() {
    stubUtilsStatus = this.sinon.stub(utils.status, 'show', function show() {});
  });

  suite('Close button', function() {
    test(' > must dispatch an event when clicked', function(done) {
      window.addEventListener('closeAction', function() {
        done();
      });

      var clickEvent = new CustomEvent('action');
      document.querySelector('#multiple-select-view-header').
        dispatchEvent(clickEvent);
    });
  });

  suite('Import all button', function() {
    test(' > must dispatch an event when clicked', function(done) {
      window.addEventListener('saveAction', function(evt) {
        done();
      });

      document.querySelector('#save-button').click();
    });
  });

  suite('Show status action', function() {
    test(' > must handle showStatusAction event', function(done) {
      window.addEventListener('showStatusAction', function(evt) {
        assert.isTrue(stubUtilsStatus.calledOnce);
        done();
      });

      window.dispatchEvent(new CustomEvent('showStatusAction', {
        'detail': {
            'numDups': 1,
            'importedContacts': 1
          }
      }));
    });
  });

  suite('Render', function() {
    test(' > contacts list must be rendered correctly', function() {
      const FILENAME = 'FileName.vcf';
      VCardLoadUI.render(contacts, FILENAME);

      var title = document.getElementById('multiple-select-view-title');
      assert.equal(title.textContent, FILENAME);

      var contactList = document.getElementById('multiple-select-container');
      var listItems = contactList.querySelectorAll('li');
      assert.equal(listItems.length, 3);

      assert.equal(listItems[0].textContent.trim(), 'Pepito A\n        Test');
      assert.equal(listItems[1].textContent.trim(), 'Pepito BA\n        Test');
      assert.equal(listItems[2].textContent.trim(), 'Antonio CC\n        Test');
    });
  });
});
