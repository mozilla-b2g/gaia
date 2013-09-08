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

    var mergeButton, contactsList, duplicateMessage, title;

    function init() {
      mergeButton = document.getElementById('merge-action');
      if (!mergeButton) {
        return;
      }

      duplicateMessage = document.querySelector('#duplicate-msg > p');
      contactsList = document.querySelector('#contacts-list-container > ol');
      title = document.getElementById('title');

      document.getElementById('merge-close').addEventListener('click', onClose);
      contactsList.addEventListener('click', onClick);
      mergeButton.addEventListener('click', onMerge);
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
          var contact = cookContact(contacts[id]);
          var item = utils.templates.append(contactsList, contact);
          if (contact.email1 === '') {
            var emailField = item.querySelector('p:last-child');
            emailField && emailField.parentNode.removeChild(emailField);
          }
        });

        checked = contactsKeys.length;
        checkMergeButton();

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
    function cookContact(matching) {
      var contact = matching.matchingContact;
      var reasons = matching.matchings || {};

      var out = {};

      populate(contact, out, Object.getOwnPropertyNames(contact));
      populate(contact, out,
                    Object.getOwnPropertyNames(Object.getPrototypeOf(contact)));

      out.mainReason = selectMainReason(reasons);
      if (Array.isArray(out.photo) && out.photo[0]) {
        out.thumb = window.URL.createObjectURL(out.photo[0]);
      }

      return out;
    }

    function selectMainReason(reasons) {
      var reason, precedence = ['tel', 'email', 'name'];
      for (var i = 0, l = precedence.length; i < l; i++) {
        reason = precedence[i];
        if (reasons[reason]) {
          return reasons[reason][0].matchedValue;
        }
      }
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
        checkMergeButton();
      }
    }

    function checkMergeButton() {
      navigator.mozL10n.localize(mergeButton, 'mergeActionButtonLabel',
                                                                { n: checked });
      mergeButton.disabled = (checked === 0);
    }

    function setChecked(item, element, value, uuid) {
      if (element.checked !== value) {
        // We have to take into account the action whether the value changes
        if (value) {
          ++checked;
          checkedContacts[uuid] = uuid;
          item.setAttribute('aria-disabled', false);
        } else {
          --checked;
          delete checkedContacts[uuid];
          item.setAttribute('aria-disabled', true);
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
