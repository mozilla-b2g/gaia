'use strict';

var contacts = window.contacts || {};

if (!contacts.MatchingUI) {
  contacts.MatchingUI = (function() {

    var _ = navigator.mozL10n.get;

    var CONTACTS_APP_ORIGIN = 'app://communications.gaiamobile.org';

    // Counter for checked list items
    var checked = 0;

    // Hash contains identifiers of checked contacts
    var checkedContacts = {};

    var mergeButton, merge2Button, contactsList, duplicateMessage, title;

    function init() {
      mergeButton = document.getElementById('merge-action');
      if (!mergeButton) {
        return;
      }

      merge2Button = document.getElementById('merge-action-2');
      duplicateMessage = document.querySelector('#duplicate-msg > p');
      contactsList = document.querySelector('#contacts-list-container > ol');
      title = document.getElementById('title');

      document.getElementById('merge-close').addEventListener('click', onClose);
      document.getElementById('merge-ignore').
                                             addEventListener('click', onClose);
      contactsList.addEventListener('click', onClick);
      mergeButton.addEventListener('click', onMerge);
      merge2Button.addEventListener('click', onMerge);
    }

    function load(type, contact, results, cb) {
      document.body.dataset.mode = type;
      if (type === 'matching') {
        // "Suggested duplicate contacts for xxx"
        duplicateMessage.textContent = _('suggestedDuplicateContacts', {
          name: contact.name ? contact.name[0] : ''
        });
      } else {
        title.textContent = _('duplicatesFoundTitle');
        // "xxx duplicates information in the following contacts"
        duplicateMessage.textContent = _('duplicatesFoundMessage', {
          name: contact.name ? contact.name[0] : ''
        });
      }

      // Rendering the duplicate contacts list
      renderList(results, cb);
    }

    var listDependencies = ['/contacts/js/utilities/image_loader.js',
                            '/contacts/js/utilities/templates.js'];

    function renderList(contacts, success) {
      LazyLoader.load(listDependencies, function loaded() {
        // For each contact in the list
        var contactsKeys = Object.keys(contacts);
        contactsKeys.forEach(function(id) {
          // New contact appended
          checkedContacts[id] = id;
          var contact = cookContact(contacts[id].matchingContact);
          var item = utils.templates.append(contactsList, contact);
          if (contact.email1 === '') {
            var emailField = item.querySelector('p:last-child');
            emailField.parentNode.removeChild(emailField);
          }
        });

        checked = contactsKeys.length;
        checkMerging();

        // The template is deleted from the list
        contactsList.removeChild(contactsList.firstElementChild);
        new ImageLoader('#main', 'li');
        setTimeout(success);
      });
    }

    /*
     * It creates a new copy becase it is forbidden to add new attributes to
     * original contacts provided by the API
     *
     * @param(Object) Contact object provided by Gecko
     */
    function cookContact(contact) {
      var out = {};

      populate(contact, out, Object.getOwnPropertyNames(contact));
      populate(contact, out,
                    Object.getOwnPropertyNames(Object.getPrototypeOf(contact)));

      out.email1 = '';
      if (Array.isArray(out.email) && out.email[0]) {
        out.email1 = out.email[0].value || '';
      }

      if (Array.isArray(out.photo) && out.photo[0]) {
        out.photo1 = window.URL.createObjectURL(out.photo[0]);
      }

      return out;
    }

    function populate(source, target, propertyNames) {
      propertyNames.forEach(function(property) {
        var propertyValue = source[property];
        if (propertyValue) {
          target[property] = propertyValue;
        }
      });
    }

    function onClose(e) {
      e.stopPropagation();
      e.preventDefault();

      parent.postMessage({
        type: 'window_close',
        data: ''
      }, CONTACTS_APP_ORIGIN);
    }

    function onClick(e) {
      var target = e.target;

      if (target && target.dataset.uuid) {
        var uuid = target.dataset.uuid;
        var checkbox = target.querySelector('input[type="checkbox"]');
        setChecked(target, checkbox, !checkbox.checked, uuid);
        checkMerging();
      }
    }

    function checkMerging() {
      mergeButton.disabled = merge2Button.disabled =
                                                   checked === 0 ? true : false;
    }

    function setChecked(item, element, value, uuid) {
      if (element.checked !== value) {
        // We have to take into account the action whether the value changes
        if (value) {
          ++checked;
          checkedContacts[uuid] = uuid;
          item.dataset.disabled = false;
        } else {
          --checked;
          delete checkedContacts[uuid];
          item.dataset.disabled = true;
        }
      }
      element.checked = value;
    }

    function onMerge(e) {
      e.stopPropagation();
      e.preventDefault();

      contacts.MatchingController.merge(checkedContacts);
    }

    // We are going to initialize this module to get references to DOM elements
    init();

    return {
      init: init,

      /*
       * Loads the UI that implements the merge of duplicate contacts
       *
       * @param{Object} Master contact
       *
       * @param{Object} Hash of matching contacts from contacts.Matcher module
       *
       * @param{Function} Success callback when the UI is ready
       *
       */
      load: load
    };

  })();
}
