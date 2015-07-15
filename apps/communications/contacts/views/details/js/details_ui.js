/* global ContactsButtons, LazyLoader, utils, WebrtcClient */
/* global Normalizer, ContactPhotoHelper */
/* global TAG_OPTIONS */

/* exported DetailsUI */

/*
 * UI *must* work alone, without any 'Controller' tied. This will
 * help us to have a well-separated model, where the UI will dispatch
 * events that a Controller could potentially handle.
 *
 * UI will be in charge of rendering the info provided by 'Boot', which
 * is the only part of the code which knows UI & Controller.
 *
 * Every action performed by the user in the UI will dispatch an event that
 * should be handle by a controller
 */
(function(exports) {
  'use strict';

  const PHOTO_POS = 7;
  const INIT_MARGIN = 8;
  const MAX_POSITION = 150;
  // Scale ratio for different devices
  var SCALE_RATIO = window.devicePixelRatio || 1;

  var DetailsUI = {
    init: function() {
      var self = this;
      function initContainers() {
        self._ = navigator.mozL10n.get;
        self.header = document.querySelector('#details-view-header');
        self.contactDetails = document.querySelector('#contact-detail');
        self.listContainer = document.querySelector('#details-list');
        self.detailsName = document.querySelector('#contact-name-title');
        self.detailsNameText =
          document.querySelector('#contact-name-title bdi');
        self.orgTitle = document.querySelector('#org-title');
        self.datesTemplate = document.querySelector('#dates-template-\\#i\\#');
        self.addressesTemplate =
          document.querySelector('#address-details-template-\\#i\\#');
        self.duplicateTemplate =
          document.querySelector('#duplicate-contacts-template');
        self.editContactButton = document.querySelector('#edit-contact-button');
        self.cover = document.querySelector('#cover-img');
        self.detailsInner = document.querySelector('#contact-detail-inner');
        self.favoriteMessage = document.querySelector('#toggle-favorite');
        self.notesTemplate =
          document.querySelector('#note-details-template-\\#i\\#');
        self.socialTemplate =
          document.querySelector('#social-template-\\#i\\#');
      }

      function addListeners() {
        self.initPullEffect(self.cover);

        self.favoriteMessage.addEventListener('click',
          self.toggleFavorite.bind(self));

        self.header.addEventListener('action',
          self.handleBackAction.bind(self));
        self.editContactButton.addEventListener('click',
          self.handleEditAction.bind(self));

        ContactsButtons.init(self.listContainer, self.contactDetails, null);

        window.addEventListener('toggleFavoriteDone',
          self.toggleFavoriteHandler.bind(self));
      }

      initContainers();
      addListeners();
    },

    handleBackAction: function(evt) {
      this.dispatchEvent('backAction');
    },

    handleEditAction: function(evt) {
      this.dispatchEvent('editAction');
    },

    initPullEffect: function(cover) {
      var maxPosition = Math.round(MAX_POSITION * SCALE_RATIO);
      var startPosition = 0;
      var self = this;

      function onTouchStart(e) {
        if (self.contactDetails.classList.contains('no-photo')) {
          return;
        }
        e.preventDefault();
        startPosition = e.changedTouches[0].clientY;

        self.contactDetails.classList.add('up');
        cover.classList.add('up');

        window.addEventListener('touchmove', onTouchMove, true);
        window.addEventListener('touchend', onTouchEnd, true);
      }

      function onTouchEnd(e) {
        e.preventDefault();

        self.contactDetails.style.transform = null;
        self.contactDetails.classList.add('up');

        cover.style.transform = null;
        cover.classList.add('up');

        window.removeEventListener('touchmove', onTouchMove, true);
        window.removeEventListener('touchend', onTouchEnd, true);
      }

      function onTouchMove(e) {
        e.preventDefault();

        var deltaY = e.changedTouches[0].clientY - startPosition;
        deltaY = Math.min(maxPosition, Math.max(0, deltaY));

        var calc = 'calc(' + INIT_MARGIN + 'rem + ' + deltaY + 'px)';
        self.contactDetails.style.transform = 'translateY(' + calc + ')';
        self.contactDetails.classList.remove('up');

        // Divide by 40 (4 times slower and in rems)
        var coverPosition = (-PHOTO_POS + (deltaY / 40)) + 'rem';
        cover.style.transform = 'translateY(' + coverPosition + ')';
        cover.classList.remove('up');
      }

      cover.addEventListener('touchstart', onTouchStart, true);
    },

    render: function(currentContact, contactsCount, readOnly) {
      if(this.isAFavoriteChange){
        this.isAFavoriteChange = false;
        return Promise.resolve(this.isAFavoriteChange);
      }

      this.dispatchEvent('renderinit');

      this.contactData = currentContact;
      this.contactsCount = contactsCount;

      // Initially enabled and only disabled if necessary
      this.editContactButton.removeAttribute('disabled');
      this.editContactButton.classList.remove('hide');
      this.header.setAttribute('action', 'back');

      if (readOnly) {
        this.editContactButton.classList.add('hide');
        this.header.setAttribute('action', 'close');
      }

      this.doReloadContactDetails(this.contactData);
    },

    doReloadContactDetails: function(contact) {
      this.setupDisplayName(contact);
      this.contactDetails.classList.remove('no-photo');
      this.contactDetails.classList.remove('up');
      utils.dom.removeChildNodes(this.listContainer);

      this.renderFavorite(contact);
      this.renderOrg(contact);

      ContactsButtons.renderPhones(contact);
      ContactsButtons.renderEmails(contact);

      this.renderWebrtcClient(contact);

      this.renderAddresses(contact);

      this.renderDates(contact);

      this.renderNotes(contact);

      this.renderShareButton(contact);

      this.renderDuplicate(contact);

      this.renderPhoto(contact);

      this.dispatchEvent('renderdone');
    },

    setupDisplayName: function(contact) {
      var name = this.getDisplayName(contact);
      if (typeof name === 'string') {
        this.detailsNameText.setAttribute('data-l10n-id', name);
      } else if (name.raw) {
        this.detailsNameText.textContent = name.raw;
      } else if (name.id) {
        navigator.mozL10n.setAttributes(this.detailsNameText,
                                        name.id, name.args);
      }
    },

    getDisplayName: function(contact) {
      var l10nId = 'noName';

      if (this.hasName(contact)) {
        l10nId = {'raw': contact.name[0]};
      } else if (this.hasContent(contact.tel)) {
        l10nId = {'raw': contact.tel[0].value};
      } else if (this.hasContent(contact.email)) {
        l10nId = {'raw': contact.email[0].value};
      }
      return l10nId;
    },

    hasContent: function(field) {
      return (Array.isArray(field) &&
              field.length > 0 &&
              field[0].value &&
              field[0].value.trim());
    },

    hasName: function(contact) {
      return (Array.isArray(contact.name) &&
              contact.name[0] &&
              contact.name[0].trim());
    },

    renderFavorite: function(contact) {
      var favorite = this.isFavorite();
      this.toggleFavoriteMessage(favorite);

      this.header.classList.toggle('favorite', !!favorite);
    },

    toggleFavorite: function() {
      var contact = this.contactData;

      var favorite = !this.isFavorite();
      this.toggleFavoriteMessage(favorite);

      // Disabling button while saving the contact
      this.favoriteMessage.style.pointerEvents = 'none';
      this.dispatchEvent('toggleFavoriteAction',
                        {contact: contact, isFavorite: !favorite});
    },

    toggleFavoriteMessage: function(isFav) {
      var cList = this.favoriteMessage.classList;
      var l10nId = isFav ? 'removeFavorite' : 'addFavorite';
      this.favoriteMessage.setAttribute('data-l10n-id', l10nId);
      isFav ? cList.add('on') : cList.remove('on');
    },

    toggleFavoriteHandler: function(evt) {
      var savedContact = evt.detail.contact;
      this.favoriteMessage.style.pointerEvents = 'auto';
      this.setContact(savedContact);
      this.renderFavorite(savedContact);
      this.isAFavoriteChange = true;
    },

    setContact: function(currentContact) {
      this.contactData = currentContact;
    },

    renderOrg: function(contact) {
      if (contact.org && contact.org.length > 0 && contact.org[0] !== '') {
        this.orgTitle.textContent = contact.org[0];
        this.orgTitle.classList.remove('hide');
      } else {
        this.orgTitle.classList.add('hide');
        this.orgTitle.textContent = '';
      }
    },

    renderWebrtcClient: function(contact) {
      LazyLoader.load([
        '/contacts/style/webrtc-client/webrtc_client.css',
        '/contacts/js/webrtc-client/webrtc_client.js'
      ]).then(function() {
        WebrtcClient.start(contact);
      });
    },

    renderAddresses: function(contact) {
      if (!contact.adr) {
        return;
      }

      // Load what we need
      LazyLoader.load('/contacts/js/utilities/mozContact.js', () => {
        for (var i = 0; i < contact.adr.length; i++) {
          var currentAddress = contact.adr[i];
          // Sanity check
          if (utils.mozContact.haveEmptyFields(currentAddress,
              ['streetAddress', 'postalCode', 'locality', 'countryName'])) {
            continue;
          }
          var address = currentAddress.streetAddress || '';
          var escapedStreet = Normalizer.escapeHTML(address, true);
          var locality = currentAddress.locality;
          var escapedLocality = Normalizer.escapeHTML(locality, true);
          var escapedType = Normalizer.escapeHTML(currentAddress.type, true);
          var country = currentAddress.countryName || '';
          var escapedCountry = Normalizer.escapeHTML(country, true);
          var postalCode = currentAddress.postalCode || '';
          var escapedPostalCode = Normalizer.escapeHTML(postalCode, true);

          var addressField = {
            streetAddress: escapedStreet,
            postalCode: escapedPostalCode,
            locality: escapedLocality || '',
            countryName: escapedCountry,
            type: this._(escapedType) || escapedType ||
              TAG_OPTIONS['address-type'][0].value,
            'type_l10n_id': currentAddress.type,
            i: i
          };
          var template = utils.templates.render(this.addressesTemplate,
            addressField);
          this.listContainer.appendChild(template);
        }
      });
    },

    renderDates: function(contact) {
      if (!contact.bday && !contact.anniversary) {
        return;
      }

      var dateString = '';

      var fields = ['bday', 'anniversary'];
      var l10nIds = ['birthday', 'anniversary'];

      var rendered = 0;
      for (var j = 0; j < fields.length; j++) {
        var value = contact[fields[j]];
        if (!value) {
          continue;
        }
        try {
          dateString = utils.misc.formatDate(value);
        } catch (err) {
          console.error('Error parsing date');
          continue;
        }
        var element = utils.templates.render(this.datesTemplate, {
          i: ++rendered,
          date: dateString,
          type: this._(l10nIds[j])
        });

        this.listContainer.appendChild(element);
      }
    },

    renderNotes: function(contact) {
      if (!contact.note || contact.note.length === 0) {
        return;
      }
      var container = document.createElement('li');
      var title = document.createElement('h2');
      title.setAttribute('data-l10n-id', 'comments');
      container.appendChild(title);
      for (var i = 0; i < contact.note.length; i++) {
        var currentNote = contact.note[i];
        var noteField = {
          note: Normalizer.escapeHTML(currentNote, true) || '',
          i: i
        };
        var template = utils.templates.render(this.notesTemplate, noteField);
        container.appendChild(template);
        this.listContainer.appendChild(container);
      }
    },

    renderShareButton: function(contact) {
      var social = utils.templates.render(this.socialTemplate, {
        i: contact.id
      });
      var shareButton = social.querySelector('#share_button');

      shareButton.addEventListener('click', () => {
        this.dispatchEvent('shareAction', {contact: this.contactData});
      });

      shareButton.classList.remove('hide');

      this.listContainer.appendChild(social);
    },

    renderDuplicate: function(contact) {
      var dupItem = utils.templates.render(this.duplicateTemplate, {});
      var findMergeButton = dupItem.querySelector('#find-merge-button');
      findMergeButton.disabled = true;

      if (this.contactsCount > 1) {
        // Only have this active if contact list has more than one entry
        findMergeButton.disabled = false;
        findMergeButton.addEventListener('click', () => {
          this.dispatchEvent('findDuplicatesAction',
                            {contactId: this.contactData.id});
        });
      }

      this.listContainer.appendChild(dupItem);
    },

    renderPhoto: function(contact) {
      this.contactDetails.classList.remove('up');

      var photo = ContactPhotoHelper.getFullResolution(contact);
      if (photo) {
        var currentHash = this.cover.dataset.imgHash;
        if (!currentHash) {
          utils.dom.updatePhoto(photo, this.cover);
          this.updateHash(photo, this.cover);
        }
        else {
          // Need to recalculate the hash and see whether the images changed
          this.calculateHash(photo, newHash => {
            if (currentHash !== newHash) {
              utils.dom.updatePhoto(photo, this.cover);
              this.cover.dataset.imgHash = newHash;
            }
            else {
              // Only for testing purposes
              this.cover.dataset.photoReady = 'true';
            }
          });
        }

        this.contactDetails.classList.add('up');
        this.cover.classList.add('translated');
        this.contactDetails.classList.add('translated');
        var clientHeight = this.contactDetails.clientHeight -
            (INIT_MARGIN * 10 * SCALE_RATIO);
        if (this.detailsInner.offsetHeight < clientHeight) {
          this.cover.style.overflow = 'hidden';
        } else {
          this.cover.style.overflow = 'auto';
        }
      } else {
        this.resetPhoto();
      }
    },

    updateHash: function(photo, cover) {
      this.calculateHash(photo, function(hash) {
        cover.dataset.imgHash = hash;
      });
    },

    calculateHash: function(photo, cb) {
      var START_BYTES = 127;
      var BYTES_HASH = 16;

      var out = [photo.type, photo.size];

      // We skip the first bytes that typically are headers
      var chunk = photo.slice(START_BYTES, START_BYTES + BYTES_HASH);
      var reader = new FileReader();
      reader.onloadend = function() {
        out.push(reader.result);
        cb(out.join(''));
      };
      reader.onerror = function() {
        window.console.error('Error while calculating the hash: ',
                             reader.error.name);
        cb(out.join(''));
      };
      reader.readAsDataURL(chunk);
    },

    resetPhoto: function() {
      this.cover.classList.remove('translated');
      this.contactDetails.classList.remove('translated');
      this.cover.style.backgroundImage = '';
      this.cover.style.overflow = 'auto';
      this.contactDetails.style.transform = '';
      this.contactDetails.classList.add('no-photo');
      this.cover.dataset.imgHash = '';
    },

    isFavorite: function() {
      return this.contactData != null && this.contactData.category != null &&
              this.contactData.category.indexOf('favorite') != -1;
    },

    dispatchEvent: function(name, data) {
      window.dispatchEvent(new CustomEvent(name, {detail: data}));
    }
  };

  exports.DetailsUI = DetailsUI;

})(window);
