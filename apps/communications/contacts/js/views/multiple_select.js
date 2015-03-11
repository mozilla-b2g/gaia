/* global Contacts, contacts, utils, LazyLoader */
'use strict';

window.Contacts = window.Contacts || {};

Contacts.MultipleSelect = (function() {
  const STATUS_TIMEOUT = 3000; // ms before closing view which shows status msg
  var contactsToImport = [];
  var header, saveButton, container, contactTemplate, title, groupTemplate;

  /**
   * Initializes references to DOM elements. This is needed before calling
   * render.
   */
  function init() {
    header = document.getElementById('multiple-select-view-header');
    saveButton = document.getElementById('save-button');
    container = document.getElementById('multiple-select-container');
    contactTemplate = document.getElementById('contactToImportTemplate');
    groupTemplate = document.getElementById('contactGroupTemplate');
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
        importedContacts = 0;
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
                doContinue(index, true);
              },
              error: () => doContinue(index)
            };
            contacts.adaptAndMerge(contact, matches, callbacks);
          },
          onmismatch: () => {
            var saving = navigator.mozContacts.save(contact);

            saving.onsuccess = () => {
              doContinue(index, true);
            };

            saving.onerror = (err) => {
              console.error(err);
              doContinue(index);
            };
          }
        });
      });
    });

    function doContinue(index, isContactImported) {
      if (isContactImported) {
        importedContacts++;
      }

      if (contactsToImport.length - 1 <= index) {
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

  function addToGroup(node, group) {
    group = group.toUpperCase();

    var groupNode = document.getElementById('contacts-list-' + group);
    if (!groupNode) {
      // The group doesn't exist yet, it has to be created first.
      var clone = document.importNode(groupTemplate.content, true);
      clone = container.appendChild(clone);
      clone = document.getElementById('section-group-%%');
      clone.id = clone.id.replace('%%', group);
      clone.innerHTML = clone.innerHTML.replace(/%%/g, group);
      groupNode = document.getElementById('contacts-list-' + group);
    }

    groupNode.appendChild(node);
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

    var scrollbarSel = '#multiple-select-view nav[data-type="scrollbar"] ';
    utils.alphaScroll.init({
      overlay: document.querySelector(scrollbarSel + 'p'),
      jumper: document.querySelector(scrollbarSel + ' ol'),
      groupSelector: '#group-',
      scrollToCb: function(groupContainer) {
        container.scrollTop = groupContainer.offsetTop;
      },
      desktop: true, // Allows to reinitialize the alphaScroll.
      contactListSel: '#multiple-select-view'
    });

    function doRenderContact(contact) {
      var clone = document.importNode(contactTemplate.content, true);

      var contactData = clone.querySelectorAll('p');
      var name = Array.isArray(contact.name) && contact.name[0];
      contactData[0].textContent = name;
      contactData[1].textContent =
        Array.isArray(contact.tel) && contact.tel[0] && contact.tel[0].value;

      if (Array.isArray(contact.photo) && contact.photo[0] instanceof Blob) {
        var picture = clone.querySelector('aside span');
        picture.style.background = 'url(' +
                            window.URL.createObjectURL(contact.photo[0]) + ')';
      }

      contactsToImport.push(contact);
      var group = parseInt(name[0], 10) || !name[0] ? '#' : name[0];
      addToGroup(clone, group);
    }
  };

  return {
    render: render,
    init: init
  };
})();
