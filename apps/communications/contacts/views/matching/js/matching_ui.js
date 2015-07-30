'use strict';
/* global ContactPhotoHelper */
/* global ImageLoader */
/* global LazyLoader */
/* global Sanitizer */
/* jshint nonew: false */

/**
* This object handles every interaction between the user and the UI of the
* matching contacts view
*/
(function(exports) {

    var CONTACTS_APP_ORIGIN = location.origin;

    var listDependencies = [
      '/shared/js/contacts/utilities/image_loader.js'
    ];

    var MatchingUI = {
      _: null,

      // Counter for checked list items
      checked: 0,

      // Hash contains identifiers of checked contacts
      checkedContacts: {},

      // Field order when showing matching details main reason
      fieldOrder: ['tel', 'email', 'name'],

      init: function() {
        this._ = navigator.mozL10n.get;
        this.mergeButton = document.getElementById('merge-action');
        if (!this.mergeButton) {
          return;
        }

        this.duplicateMessage = document.querySelector('#duplicate-msg > p');
        this.contactsList =
          document.querySelector('#contacts-list-container > ol');

        this.contactsList.addEventListener('click', this.onClick.bind(this));
        this.mergeButton.addEventListener('click', this.onMerge.bind(this));

        window.addEventListener('initUI', evt => {
          this.load(evt.detail.type, evt.detail.contact, evt.detail.results);
        });
      },

      /*
       * Loads the UI that implements the merge of duplicate contacts
       *
       * @param{Object} Master contact
       *
       * @param{Object} Hash of matching contacts from Matcher module
       *
       */
      load: function(type, contact, results) {
        this.matchingResults = results;

        document.body.dataset.mode = type;
        var contactName = this.getDisplayName(contact);
        var params = { name: Sanitizer.escapeHTML `${contactName}` };

        if (type === 'matching') {
          // "Suggested duplicate contacts for xxx"
          navigator.mozL10n.setAttributes(this.duplicateMessage,
                                          'suggestedDuplicatesMessage',
                                          params);
        } else {
          document.title = this._('duplicatesFoundTitle');
          // "xxx duplicates information in the following contacts"
          navigator.mozL10n.setAttributes(this.duplicateMessage,
                                          'foundDuplicatesMessage',
                                          params);
        }

        // Rendering the duplicate contacts list
        this.renderList(results);
      },

      templateDuplicateContact: function(contact) {
        return Sanitizer.createSafeHTML `<li data-uuid="${contact.id}"
          class="block-item">
          <label class="pack-checkbox">
            <input type="checkbox" checked>
            <span></span>
          </label>
          <aside class="pack-end">
            <img data-src="${contact.thumb}">
          </aside>
          <p>
            <bdi class="ellipsis-dir-fix">${contact.displayName}</bdi>
          </p>
          <p class="match-main-reason">
            <bdi class="ellipsis-dir-fix">${contact.mainReason}</bdi>
          </p>
        </li>`;
      },

      renderList: function(contacts) {
        LazyLoader.load(listDependencies, () => {
          // For each contact in the list
          var contactsKeys = Object.keys(contacts);
          contactsKeys.forEach(id => {
            // New contact appended
            this.checkedContacts[id] = id;
            var contact = this.cookContact(contacts[id]);

            // Use a template node so we can append it and also access the node
            var item = document.createElement('template');
            item.innerHTML = 
              Sanitizer.unwrapSafeHTML(this.templateDuplicateContact(contact));

            this.contactsList.appendChild(item.content);

            if (contact.email1 === '') {
              var emailField = item.content.querySelector('p:last-child');
              emailField && emailField.parentNode.removeChild(emailField);
            }
          });

          this.checked = contactsKeys.length;
          this.checkMergeButton();

          new ImageLoader('#main', 'li');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('UIReady'));
          });
        });
      },

      /*
       * It creates a new copy becase it is forbidden to add new attributes to
       * original contacts provided by the API
       *
       * @param(Object) Contact object provided by Gecko
       */
      cookContact: function(matching) {
        var contact = matching.matchingContact;
        var reasons = matching.matchings || {};

        var out = {};

        this.populate(contact, out, Object.getOwnPropertyNames(contact));
        this.populate(contact, out,
          Object.getOwnPropertyNames(Object.getPrototypeOf(contact)));

        out.displayName = this.getDisplayName(contact);
        out.mainReason = this.selectMainReason(reasons);
        var photo = ContactPhotoHelper.getThumbnail(out);
        if (photo) {
          out.thumb = window.URL.createObjectURL(photo);
        }

        return out;
      },

      getCompleteName: function(contact) {
        var givenName = Array.isArray(contact.givenName) ?
                        contact.givenName[0] : '';

        var familyName = Array.isArray(contact.familyName) ?
                        contact.familyName[0] : '';

        var completeName = givenName && familyName ?
                           givenName + ' ' + familyName :
                           givenName || familyName;

        return completeName;
      },

      // Fills the contact data to display if no givenName and familyName
      getDisplayName: function(contact) {
        if (this.hasName(contact)) {
          return this.getCompleteName(contact);
        }

        var name = [];
        if (Array.isArray(contact.name) && contact.name[0] &&
            contact.name[0].trim()) {
          name.push(contact.name[0]);
        } else if (contact.org && contact.org[0] && contact.org[0].trim()) {
          name.push(contact.org[0]);
        } else if (contact.tel && contact.tel[0]) {
          name.push(contact.tel[0].value);
        } else if (contact.email && contact.email[0]) {
          name.push(contact.email[0].value);
        } else {
          name.push(this._('noName'));
        }

        return name[0];
      },

      hasName: function(contact) {
        return (Array.isArray(contact.givenName) && contact.givenName[0] &&
                  contact.givenName[0].trim()) ||
                (Array.isArray(contact.familyName) && contact.familyName[0] &&
                  contact.familyName[0].trim());
      },

      selectMainReason: function(matchings) {
        var out = '';

        for (var j = 0; j < this.fieldOrder.length; j++) {
          var aField = this.fieldOrder[j];
          var theMatchings = matchings[aField];
          if (Array.isArray(theMatchings) && theMatchings[0]) {
            out = theMatchings[0].matchedValue;
            if (out) {
              break;
            }
          }
        }
        return out;
      },

      populate: function(source, target, propertyNames) {
        propertyNames.forEach(function(property) {
          var propertyValue = source[property];
          if (propertyValue) {
            target[property] = propertyValue;
          }
        });
      },

      onClose: function(e) {
        e.stopPropagation();
        e.preventDefault();

        parent.postMessage({
          type: 'window_close',
          data: ''
        }, CONTACTS_APP_ORIGIN);
      },

      onClick: function(e) {
        var el = e.target;
        if (el.tagName !== 'INPUT') {
          return;
        }
        var uuid = el.parentNode.parentNode.dataset.uuid;
        if (el.checked) {
          ++this.checked;
          this.checkedContacts[uuid] = uuid;
        } else {
          --this.checked;
          delete this.checkedContacts[uuid];
        }

        this.checkMergeButton();
      },

      isMatch: function(matchings, aField, fieldValue) {
        var noMatch = true;
        if (matchings[aField]) {
          // Using every to short circuit the checking when a match is found.
          noMatch = matchings[aField].every(function(obj) {
            var val = fieldValue.value || fieldValue;
            if (obj.matchedValue === val) {
              return false;
            }
            return true;
          });
        }
        return !noMatch;
      },

      checkMergeButton: function() {
        navigator.mozL10n.setAttributes(this.mergeButton,
                                        'mergeActionButtonLabel',
                                        { n: this.checked });
        this.mergeButton.disabled = (this.checked === 0);
      },

      onMerge: function(e) {
        e.stopPropagation();
        e.preventDefault();

        window.dispatchEvent(new CustomEvent('merge', {
          'detail': {
            'checkedContacts': this.checkedContacts
          }
        }));
      }
    };

    exports.MatchingUI = MatchingUI;
})(window);
