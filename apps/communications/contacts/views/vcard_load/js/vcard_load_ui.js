/*global utils */

(function(exports) {
  'use strict';

  var contactsToImport = [];
  var header, saveButton, container, template, title;

  function cacheElements() {
    header = document.getElementById('multiple-select-view-header');
    saveButton = document.getElementById('save-button');
    container = document.getElementById('multiple-select-container');
    template = document.getElementById('contactToImportTemplate');
    title = document.getElementById('multiple-select-view-title');
  }

  function addListeners() {
    saveButton.addEventListener('click',
      dispatchEvent.bind(null, 'saveAction',
                        {'contactsToImport': contactsToImport}));
    header.addEventListener('action', dispatchEvent.bind(null, 'closeAction'));
    window.addEventListener('showStatusAction', onShowStatus);
  }

  /**
   * Initializes references to DOM elements. This is needed before calling
   * render.
   */
  function init() {
    cacheElements();
    addListeners();
  }

  /**
   * Allows to preview which contacts will be imported. Requires to call init
   * first when DOM is ready.
   *
   * @param cursor - Reader object to continue reading from vCard.
   * @param {string} filename - Name of the vcf file we are reading from.
   */
  function render(contacts, filename) {
    container.innerHTML = ''; // Avoids rendering the same content twice.
    title.textContent = filename;

    contacts.forEach(doRenderContact);

    function doRenderContact(contact) {
      var clone = document.importNode(template.content, true);

      var contactData = clone.querySelectorAll('p');
      contactData[0].textContent =
        Array.isArray(contact.name) && contact.name[0];
      var org = (Array.isArray(contact.org) && contact.org[0]) ?
        contact.org[0] : '';
      contactData[1].textContent = org;

      if (Array.isArray(contact.photo) && contact.photo[0] instanceof Blob) {
        var picture = clone.querySelector('aside span');
        picture.style.background = 'url(' +
                            window.URL.createObjectURL(contact.photo[0]) + ')';
      }

      contactsToImport.push(contact);
      container.appendChild(clone);
    }
  }

  function dispatchEvent(name, data) {
    window.dispatchEvent(new CustomEvent(name, {'detail': data}));
  }

  function onShowStatus(evt) {
    if (!evt.detail) {
      return;
    }

    utils.status.show({
      id: 'vCardContacts-imported',
      args: {
        n: evt.detail.importedContacts
      }
    }, {
      id: 'contactsMerged',
      args: {
        numDups: evt.detail.numDupsMerged
      }
    });
  }

  exports.VCardLoadUI = {
    'init': init,
    'render': render
  };
})(window);
