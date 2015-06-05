/* global Contacts, contacts, utils, LazyLoader */
'use strict';

window.Contacts = window.Contacts || {};

Contacts.MultipleSelect = (function() {
  const STATUS_TIMEOUT = 3000; // ms before closing view which shows status msg
  var contactsToImport = [];
  var header, saveButton, container, template, title;

  /**
   * Initializes references to DOM elements. This is needed before calling
   * render.
   */
  function init() {
    header = document.getElementById('multiple-select-view-header');
    saveButton = document.getElementById('save-button');
    container = document.getElementById('multiple-select-container');
    template = document.getElementById('contactToImportTemplate');
    title = document.getElementById('multiple-select-view-title');

    saveButton.addEventListener('click', importAll);
    header.addEventListener('action', cancelHandler);
  }

  function cancelHandler() {
    header.removeEventListener('action', cancelHandler);
    saveButton.removeEventListener('click', importAll);
    Contacts.cancel();
  }

  function importAll() {
    var numDupsMerged = 0,
        importedContacts = 0,
        parsedContacts = 0;
    const DEPENDENCIES = [
      '/shared/js/contacts/import/utilities/status.js',
      '/shared/js/simple_phone_matcher.js',
      '/shared/js/contacts/contacts_matcher.js',
      '/shared/js/contacts/contacts_merger.js',
      '/shared/js/contacts/merger_adapter.js'
    ];
    LazyLoader.load(DEPENDENCIES, function() {
      contactsToImport.forEach((contact, index) => {
        contacts.Matcher.match(contact, 'passive', {
          onmatch: (matches) => {
            var callbacks = {
              success: () => {
                numDupsMerged++;
                doContinue(true);
              },
              error: doContinue
            };
            contacts.adaptAndMerge(contact, matches, callbacks);
          },
          onmismatch: () => {
            var saving = navigator.mozContacts.save(contact);

            saving.onsuccess = () => {
              doContinue(true);
            };

            saving.onerror = (err) => {
              console.error(err);
              doContinue();
            };
          }
        });
      });
    });

    function doContinue(isContactImported) {
      parsedContacts++;
      if (isContactImported) {
        importedContacts++;
      }

      if (contactsToImport.length <= parsedContacts) {
        utils.status.show({
          id: 'vCardContacts-imported',
          args: {
            n: importedContacts
          }
        }, {
          id: 'contactsMerged',
          args: {
            numDups: numDupsMerged
          }
        });

        window.setTimeout(cancelHandler, STATUS_TIMEOUT);
      }
    }
  }

  /**
   * Allows to preview which contacts will be imported. Requires to call init
   * first when DOM is ready.
   *
   * @param {mozContact[]} contacts - Every contact already read from vCard.
   * @param cursor - Reader object to continue reading from vCard.
   * @param {string} filename - Name of the vcf file we are reading from.
   */
  var render = function(contacts, cursor, filename) {
    container.innerHTML = ''; // Avoids rendering the same content twice.
    title.textContent = filename;
    contacts.forEach(doRenderContact);

    cursor.onsuccess = function(event) {
      var contact = event.target.result;
      if (contact) {
        doRenderContact(contact);
        cursor.continue();
      }
    };

    function doRenderContact(contact) {
      var clone = document.importNode(template.content, true);

      var contactData = clone.querySelectorAll('p');
      contactData[0].textContent =
        Array.isArray(contact.name) && contact.name[0];
      contactData[1].textContent = Array.isArray(contact.org) && contact.org[0];

      if (Array.isArray(contact.photo) && contact.photo[0] instanceof Blob) {
        var picture = clone.querySelector('aside span');
        picture.style.background = 'url(' +
                            window.URL.createObjectURL(contact.photo[0]) + ')';
      }

      contactsToImport.push(contact);
      container.appendChild(clone);
    }
  };

  return {
    render: render,
    init: init
  };
})();
