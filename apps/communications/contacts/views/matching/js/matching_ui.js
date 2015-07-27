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
        this.title = document.getElementById('title');

        this.mergeHeader = document.getElementById('merge-header');
        this.mergeHeader.addEventListener('action', this.onClose);
        this.contactsList.addEventListener('click', this.onClick.bind(this));
        this.mergeButton.addEventListener('click', this.onMerge.bind(this));

        this.matchingDetails = document.querySelector('#matching-details');
        this.matchingFigure = document.querySelector('#matching-figure');
        this.matchingDetailList =
          this.matchingDetails.querySelector('#matching-list');
        this.matchingImg = this.matchingDetails.querySelector('img');
        this.matchingName = this.matchingDetails.querySelector('figcaption');

        this.matchingDetails.querySelector('button').onclick =
          this.hideMatchingDetails.bind(this);

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
          this.title.setAttribute('data-l10n-id', 'duplicatesFoundTitle');
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

      // Obtains the action from the contacts list from the click coordinates
      // The action can be: 'check' or 'detail'
      // If it is 'check' the input check will be toggled
      // If it is 'detail' the matching contact details overlay will be show
      getActionOverList: function(event) {
        // 40% percent of the horizontal width will be consider 'check' area
        var CHECKING_AREA_WIDTH = 0.4;
        var shouldShowDetail = true;

        // In case of an RTL language we need to swap the areas
        if (document.dir === 'rtl') {
          CHECKING_AREA_WIDTH = 0.6;
          shouldShowDetail = false;
        }

        if (event.clientX <= window.innerWidth * CHECKING_AREA_WIDTH) {
          shouldShowDetail = !shouldShowDetail;
        }

        return shouldShowDetail ? 'detail' : 'check';
      },

      onClick: function(e) {
        var target = e.target;

        var uuid;
        if (target && target.dataset.uuid) {
          uuid = target.dataset.uuid;
        }

        var targetAction = this.getActionOverList(e);
        if (targetAction === 'check') {
          var checkbox = target.querySelector('input[type="checkbox"]');
          this.setChecked(target, checkbox, !checkbox.checked, uuid);
          this.checkMergeButton();
        }
        else if (uuid) {
          this.showMatchingDetails(uuid);
          this.renderMatchingDetails(uuid);
        }
      },

      resetContentDetails: function() {
        this.matchingName.classList.remove('selected');
        if (this.matchingImg.src) {
          window.URL.revokeObjectURL(this.matchingImg.src);
          this.matchingImg.src = '';
          this.matchingImg.classList.add('hide');
        }
        this.matchingName.textContent = '';
        this.matchingDetailList.innerHTML = '';
      },

      hideMatchingDetails: function() {
        this.matchingDetails.classList.remove('fade-in');
        this.matchingDetails.classList.add('fade-out');
        var self = this;

        this.matchingDetails.addEventListener('animationend',
          function cd_fadeOut(ev) {
          self.matchingDetails.removeEventListener('animationend', cd_fadeOut);
          self.matchingDetails.classList.add('no-opacity');
          self.matchingDetails.classList.add('hide');

          self.resetContentDetails();
        });
      },

      imageLoaded: function() {
        this.matchingImg.classList.remove('hide');
        this.doShowMatchingDetails();
      },

      imageLoadingError: function() {
        this.matchingImg.classList.add('hide');
        this.doShowMatchingDetails();
      },

      showMatchingDetails: function(uuid) {
        var theContact = this.matchingResults[uuid].matchingContact;
        var photo = ContactPhotoHelper.getThumbnail(theContact);
        if (photo) {
          // If the contact has a photo, preload it before showing the overlay.
          var url = window.URL.createObjectURL(photo);

          // Check to see if the image is already loaded, if so process
          // it immediately.  We won't get another 'load' event by resetting the
          // same url.
          if (this.matchingImg.src === url && this.matchingImg.naturalWidth) {
            window.URL.revokeObjectURL(url);
            this.imageLoaded();
            return;
          }

          this.matchingImg.onload = this.imageLoaded.bind(this);
          this.matchingImg.onerror = this.imageLoadingError.bind(this);
          this.matchingImg.src = url;
        }
        else {
          this.doShowMatchingDetails();
        }
      },

      doShowMatchingDetails: function() {
        this.matchingDetails.classList.remove('hide');
        this.matchingDetails.classList.remove('fade-out');
        this.matchingDetails.classList.add('fade-in');
        var self = this;

        this.matchingDetails.addEventListener('animationend',
          function cd_fadeIn(ev) {
          self.matchingDetails.removeEventListener('animationend', cd_fadeIn);
          self.matchingDetails.classList.remove('no-opacity');
        });
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

      renderMatchingDetails: function(uuid) {
        var fields = ['name', 'photo', 'org', 'tel', 'email', 'adr'];
        var self = this;

        var theContact = this.matchingResults[uuid].matchingContact;
        var matchings = this.matchingResults[uuid].matchings;
        if (!this.hasName(theContact)) {
          theContact.name = [this.getDisplayName(theContact)];
        }
        fields.forEach(function(aField) {
          if (!Array.isArray(theContact[aField]) || !theContact[aField][0]) {
            return;
          }

          theContact[aField].forEach(function(fieldValue) {
            if (!fieldValue) {
              return;
            }

            var item;
            switch (aField) {
              case 'name':
                self.matchingName.textContent = fieldValue;
                if (self.isMatch(matchings, aField, fieldValue)) {
                  self.matchingName.classList.add('selected');
                }
              break;
              case 'photo':
                self.matchingImg.alt = self.getDisplayName(theContact);
              break;
              case 'tel':
              case 'email':
                item = document.createElement('li');
                if (self.isMatch(matchings, aField, fieldValue)) {
                  item.classList.add('selected');
                }
                navigator.mozL10n.setAttributes(item, 'itemWithLabel', {
                  label: self._(fieldValue.type),
                  item: fieldValue.value
                });
                self.matchingDetailList.appendChild(item);
              break;
              case 'adr':
                item = document.createElement('li');
                if (self.isMatch(matchings, aField, fieldValue)) {
                  item.classList.add('selected');
                }
                var adrFields = ['streetAddress', 'locality',
                                 'region', 'countryName'];
                adrFields.forEach(function(addrField) {
                  if (fieldValue[addrField]) {
                    var li = document.createElement('li');
                    li.textContent = fieldValue[addrField];
                    item.appendChild(li);
                  }
                });
                self.matchingDetailList.appendChild(item);
              break;
              default:
                item = document.createElement('li');
                item.textContent = fieldValue.value || fieldValue || '';
                self.matchingDetailList.appendChild(item);
              break;
            }
          });
        });
      },

      /*
       * Displays the details of a contact matching in an overlay.
       * @param {String} Unique user id.
       */
      displayMatchingDetails: function(uuid) {
        this.showMatchingDetails(uuid);
        this.renderMatchingDetails(uuid);
      },

      checkMergeButton: function() {
        navigator.mozL10n.setAttributes(this.mergeButton,
                                        'mergeActionButtonLabel',
                                        { n: this.checked });
        this.mergeButton.disabled = (this.checked === 0);
      },

      setChecked: function(item, element, value, uuid) {
        if (element.checked !== value) {
          // We have to take into account the action whether the value changes
          if (value) {
            ++this.checked;
            this.checkedContacts[uuid] = uuid;
          } else {
            --this.checked;
            delete this.checkedContacts[uuid];
          }
        }
        element.checked = value;
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
