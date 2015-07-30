'use strict';

/* jshint nonew: false */

/* global ActivityHandler */
/* global COMMS_APP_ORIGIN */
/* global Contacts */
/* global ContactsButtons */
/* global ContactPhotoHelper */
/* globals ContactToVcardBlob */
/* global fb */
/* global NFC */
/* global ICEData */
/* global LazyLoader */
/* global MozActivity */
/* global Normalizer */
/* global SCALE_RATIO */
/* global TAG_OPTIONS */
/* global utils */
/* global VcardFilename */
/* global MatchService */
/* global WebrtcClient */
/* global MainNavigation */
/* global ContactsService */

var contacts = window.contacts || {};

contacts.Details = (function() {
  var photoPos = 7;
  var initMargin = 8;
  var DEFAULT_TEL_TYPE = 'other';
  // If it is a favourite on/off change, I cancel the render
  var isAFavoriteChange = false;
  var contactData,
      contactDetails,
      listContainer,
      detailsName,
      detailsNameText,
      orgTitle,
      datesTemplate,
      addressesTemplate,
      socialTemplate,
      duplicateTemplate,
      notesTemplate,
      isFbContact,
      isFbLinked,
      editContactButton,
      cover,
      favoriteMessage,
      detailsInner,
      dom,
      currentSocial,
      header,
      _;

  var init = function cd_init(currentDom) {
    _ = navigator.mozL10n.get;
    dom = currentDom || document;
    header = dom.querySelector('#details-view-header');
    contactDetails = dom.querySelector('#contact-detail');
    listContainer = dom.querySelector('#details-list');
    detailsName = dom.querySelector('#contact-name-title');
    detailsNameText = dom.querySelector('#contact-name-title bdi');
    orgTitle = dom.querySelector('#org-title');
    datesTemplate = dom.querySelector('#dates-template-\\#i\\#');
    addressesTemplate = dom.querySelector('#address-details-template-\\#i\\#');
    socialTemplate = dom.querySelector('#social-template-\\#i\\#');
    duplicateTemplate = dom.querySelector('#duplicate-contacts-template');
    editContactButton = dom.querySelector('#edit-contact-button');
    cover = dom.querySelector('#cover-img');
    detailsInner = dom.querySelector('#contact-detail-inner');
    favoriteMessage = dom.querySelector('#toggle-favorite');
    notesTemplate = dom.querySelector('#note-details-template-\\#i\\#');

    initPullEffect(cover);

    // to avoid race conditions with NFC, we load it before handleDetails
    LazyLoader.load('/contacts/js/nfc.js', () => {
      favoriteMessage.addEventListener('click', toggleFavorite);
      editContactButton.addEventListener('click', showEditContact);
      header.addEventListener('action', handleDetailsBack);
    });

    ContactsButtons.init(listContainer, contactDetails, ActivityHandler);
  };

  var getWebrtcClientResources = function getWebrtcClientResources(cb) {
    if (typeof cb !== 'function') {
      return;
    }
    LazyLoader.load(
      [
        '/contacts/style/webrtc-client/webrtc_client.css',
        '/contacts/js/webrtc-client/webrtc_client.js'
      ],
      cb
    );
  };

  var handleDetailsBack = function handleDetailsBack() {
    // disable NFC listeners when going out of Details view
    stopNFC();

    if (WebrtcClient) {
      getWebrtcClientResources(WebrtcClient.stop);
    }

    if (ActivityHandler.currentActivityIsNot(['import'])) {
      ActivityHandler.postCancel();
      MainNavigation.home();
    }
    else if (contacts.ICEView && contacts.ICEView.iceListDisplayed) {
      ICEData.getActiveIceContacts().then(function(list) {
        if (!Array.isArray(list) || list.length === 0) {
          MainNavigation.home();
        }
        else {
          doHandleDetailsBack();
        }
      }, doHandleDetailsBack);
    }
    else {
      doHandleDetailsBack();
    }
  };

  var doHandleDetailsBack = function() {
    var hashParams = window.location.hash.split('?');
    var params = hashParams.length > 1 ?
                 utils.extractParams(hashParams[1]) : -1;

    // post message to parent page included Contacts app.
    if (params.back_to_previous_tab === '1') {
      var message = { 'type': 'contactsiframe', 'message': 'back' };
      window.parent.postMessage(message, COMMS_APP_ORIGIN);
    } else {
      MainNavigation.back(resetPhoto);
    }
  };

  var showEditContact = function showEditContact() {
    // Disable NFC listeners when editing a contact
    stopNFC();
    Contacts.showForm(true, contactData);
  };

  var setContact = function cd_setContact(currentContact) {
    contactData = currentContact;
    startNFC(currentContact);
  };

  // Needed for now because of external call from contacts.js
  var startNFC = function(contact) {
    LazyLoader.load('/contacts/js/nfc.js', () => {
      NFC.startListening(contact);
    });
  };

  var stopNFC = function() {
    LazyLoader.load('/contacts/js/nfc.js', () => {
      NFC.stopListening();
    });
  };

  var initPullEffect = function cd_initPullEffect(cover) {
    var maxPosition = Math.round(150 * SCALE_RATIO);
    var startPosition = 0;

    function onTouchStart(e) {
      if (contactDetails.classList.contains('no-photo')) {
        return;
      }
      e.preventDefault();
      startPosition = e.changedTouches[0].clientY;

      contactDetails.classList.add('up');
      cover.classList.add('up');

      window.addEventListener('touchmove', onTouchMove, true);
      window.addEventListener('touchend', onTouchEnd, true);
    }

    function onTouchEnd(e) {
      e.preventDefault();

      contactDetails.style.transform = null;
      contactDetails.classList.add('up');

      cover.style.transform = null;
      cover.classList.add('up');

      window.removeEventListener('touchmove', onTouchMove, true);
      window.removeEventListener('touchend', onTouchEnd, true);
    }

    function onTouchMove(e) {
      e.preventDefault();

      var deltaY = e.changedTouches[0].clientY - startPosition;
      deltaY = Math.min(maxPosition, Math.max(0, deltaY));

      var calc = 'calc(' + initMargin + 'rem + ' + deltaY + 'px)';
      contactDetails.style.transform = 'translateY(' + calc + ')';
      contactDetails.classList.remove('up');

      // Divide by 40 (4 times slower and in rems)
      var coverPosition = (-photoPos + (deltaY / 40)) + 'rem';
      cover.style.transform = 'translateY(' + coverPosition + ')';
      cover.classList.remove('up');
    }

    cover.addEventListener('touchstart', onTouchStart, true);
  };

  // readOnly tells us if we should allow editing the rendered contact.
  var render = function cd_render(currentContact, fbContactData, readOnly) {

    if(isAFavoriteChange){
      isAFavoriteChange = false;
      return Promise.resolve(isAFavoriteChange);
    }


    contactData = currentContact || contactData;

    startNFC(contactData);

    isFbContact = fb.isFbContact(contactData);
    isFbLinked = fb.isFbLinked(contactData);

    // Initially enabled and only disabled if necessary
    editContactButton.removeAttribute('disabled');
    editContactButton.classList.remove('hide');
    header.setAttribute('action', 'back');
    socialTemplate.classList.remove('hide');

    if (readOnly) {
      editContactButton.classList.add('hide');
      header.setAttribute('action', 'close');
      socialTemplate.classList.add('hide');
    }

    if (!fbContactData && isFbContact) {
      var fbContact = new fb.Contact(contactData);
      var req = fbContact.getData();

      req.onsuccess = function do_reload() {
        doReloadContactDetails(req.result);
      };

      req.onerror = function() {
        window.console.error('FB: Error while loading FB contact data');
        doReloadContactDetails(contactData);
      };
    } else {
      doReloadContactDetails(fbContactData || contactData);
    }
  };

  // Fills the contact data to display if no givenName and familyName
  var getDisplayName = function getDisplayName(contact) {
    var name = _('noName');

    if (hasName(contact)) {
      name = contact.name[0];
    } else if (hasContent(contact.tel)) {
      name = contact.tel[0].value;
    } else if (hasContent(contact.email)) {
      name = contact.email[0].value;
    }
    return name;
  };

  function hasContent(field) {
    return (Array.isArray(field) &&
            field.length > 0 &&
            field[0].value &&
            field[0].value.trim());
  }

  function hasName(contact) {
    return (Array.isArray(contact.name) &&
            contact.name[0] &&
            contact.name[0].trim());
  }

  //
  // Method that generates HTML markup for the contact
  //
  var doReloadContactDetails = function doReloadContactDetails(contact) {
    detailsNameText.textContent = getDisplayName(contact);
    contactDetails.classList.remove('no-photo');
    contactDetails.classList.remove('fb-contact');
    contactDetails.classList.remove('up');
    utils.dom.removeChildNodes(listContainer);

    renderFavorite(contact);
    renderOrg(contact);

    ContactsButtons.renderPhones(contact);
    ContactsButtons.renderEmails(contact);

    renderWebrtcClient(contactData);// Don't share the FB info

    renderAddresses(contact);

    renderDates(contact);

    renderNotes(contact);

    renderShareButton(contact);

    if (!fb.isFbContact(contact) || fb.isFbLinked(contact)) {
      renderDuplicate(contact);
    }

    renderPhoto(contact);
  };

  var renderFavorite = function cd_renderFavorite(contact) {
    var favorite = isFavorite(contact);
    toggleFavoriteMessage(favorite);

    header.classList.toggle('favorite', !!favorite);
  };

  var isFavorite = function isFavorite(contact) {
    return contact != null && contact.category != null &&
              contact.category.indexOf('favorite') != -1;
  };

  var toggleFavorite = function toggleFavorite() {
    var contact = contactData;

    var favorite = !isFavorite(contact);
    toggleFavoriteMessage(favorite);
    if (favorite) {
      contact.category = contact.category || [];
      contact.category.push('favorite');
    } else {
      if (!contact.category) {
        return;
      }
      var pos = contact.category.indexOf('favorite');
      if (pos > -1) {
        contact.category.splice(pos, 1);
      }
    }

    // Disabling button while saving the contact
    favoriteMessage.style.pointerEvents = 'none';

    var promise = new Promise(function(resolve, reject) {
      ContactsService.save(
        utils.misc.toMozContact(contact),
        function(e) {
          if (e) {
            favoriteMessage.style.pointerEvents = 'auto';
            console.error('Error saving favorite');
            reject('Error saving favorite');
            resolve(false);
            return;
          }

          isAFavoriteChange = true;
          /*
             Two contacts are returned because the enrichedContact is readonly
             and if the Contact is edited we need to prevent saving
             FB data on the mozContacts DB.
          */

          ContactsService.get(
            contact.id,
            function onSuccess(savedContact, enrichedContact) {
              renderFavorite(savedContact);
              setContact(savedContact);
              favoriteMessage.style.pointerEvents = 'auto';
            },
            function onError() {
              console.error('Error reloading contact');
              favoriteMessage.style.pointerEvents = 'auto';
            }
          );
          resolve(isAFavoriteChange);
        }
      );
    }).then();

    return promise;
  };

  var toggleFavoriteMessage = function toggleFavMessage(isFav) {
    var cList = favoriteMessage.classList;
    var l10nId = isFav ? 'removeFavorite' : 'addFavorite';
    favoriteMessage.setAttribute('data-l10n-id', l10nId);
    isFav ? cList.add('on') : cList.remove('on');
  };

  var renderOrg = function cd_renderOrg(contact) {
    if (contact.org && contact.org.length > 0 && contact.org[0] !== '') {
      orgTitle.textContent = contact.org[0];
      orgTitle.classList.remove('hide');
    } else {
      orgTitle.classList.add('hide');
      orgTitle.textContent = '';
    }
  };

  var renderDates = function cd_renderDates(contact) {
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
      var element = utils.templates.render(datesTemplate, {
        i: ++rendered,
        date: dateString,
        type: _(l10nIds[j])
      });

      listContainer.appendChild(element);
    }
  };

  var renderShareButton = function cd_renderShareButton(contact) {
    var social = utils.templates.render(socialTemplate, {
      i: contact.id
    });
    currentSocial = social;
    var shareButton = social.querySelector('#share_button');

    shareButton.addEventListener('click', shareContact);
    shareButton.classList.remove('hide');

    listContainer.appendChild(social);
  };

  var renderWebrtcClient = function renderWebrtcClient(contact) {
    getWebrtcClientResources(function onLoaded() {
      WebrtcClient.start(contact);
    });
  };

  var renderAddresses = function cd_renderAddresses(contact) {
    if (!contact.adr) {
      return;
    }
    // Load what we need
    LazyLoader.load('/contacts/js/utilities/mozContact.js', function() {
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
          type: _(escapedType) || escapedType ||
                                          TAG_OPTIONS['address-type'][0].value,
          'type_l10n_id': currentAddress.type,
          i: i
        };
        var template = utils.templates.render(addressesTemplate, addressField);
        listContainer.appendChild(template);
      }
    });


  };

  var renderDuplicate = function cd_renderDuplicate(contact) {
    var dupItem = utils.templates.render(duplicateTemplate, {});
    var findMergeButton = dupItem.querySelector('#find-merge-button');
    findMergeButton.disabled = true;

    if (contacts.List.total > 1) {
      // Only have this active if contact list has more than one entry
      findMergeButton.disabled = false;
      findMergeButton.addEventListener('click', function finding() {
        MatchService.match(contact.id);
      });
    }

    listContainer.appendChild(dupItem);
  };

  var renderNotes = function cd_rederNotes(contact) {
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
      var template = utils.templates.render(notesTemplate, noteField);
      container.appendChild(template);
      listContainer.appendChild(container);
    }
  };

  var calculateHash = function calculateHash(photo, cb) {
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
  };

  var updateHash = function updateHash(photo, cover) {
    calculateHash(photo, function(hash) {
      cover.dataset.imgHash = hash;
    });
  };

  var renderPhoto = function cd_renderPhoto(contact) {
    contactDetails.classList.remove('up');
    if (isFbContact) {
      contactDetails.classList.add('fb-contact');
    }

    var photo = ContactPhotoHelper.getFullResolution(contact);
    if (photo) {
      var currentHash = cover.dataset.imgHash;
      if (!currentHash) {
        utils.dom.updatePhoto(photo, cover);
        updateHash(photo, cover);
      }
      else {
        // Need to recalculate the hash and see whether the images changed
        calculateHash(photo, function(newHash) {
          if (currentHash !== newHash) {
            utils.dom.updatePhoto(photo, cover);
            cover.dataset.imgHash = newHash;
          }
          else {
            // Only for testing purposes
            cover.dataset.photoReady = 'true';
          }
        });
      }

      contactDetails.classList.add('up');
      cover.classList.add('translated');
      contactDetails.classList.add('translated');
      var clientHeight = contactDetails.clientHeight -
          (initMargin * 10 * SCALE_RATIO);
      if (detailsInner.offsetHeight < clientHeight) {
        cover.style.overflow = 'hidden';
      } else {
        cover.style.overflow = 'auto';
      }
    } else {
      resetPhoto();
    }
  };

  var resetPhoto = function cd_resetPhoto() {
    cover.classList.remove('translated');
    contactDetails.classList.remove('translated');
    cover.style.backgroundImage = '';
    cover.style.overflow = 'auto';
    contactDetails.style.transform = '';
    contactDetails.classList.add('no-photo');
    cover.dataset.imgHash = '';
  };

  var shareContact = function cd_shareContact() {
    const VCARD_DEPS = [
      '/shared/js/text_normalizer.js',
      '/shared/js/contact2vcard.js',
      '/shared/js/setImmediate.js'
    ];

    LazyLoader.load(VCARD_DEPS,function vcardLoaded() {
      ContactToVcardBlob([contactData], function blobReady(vcardBlob) {
        var filename = VcardFilename(contactData);
        new MozActivity({
          name: 'share',
          data: {
            type: 'text/vcard',
            number: 1,
            blobs: [new window.File([vcardBlob], filename)],
            filenames: [filename]
          }
        });
        // The MIME of the blob should be this for some MMS gateways
      }, { type: 'text/x-vcard'} );
    });
  };

  return {
    'init': init,
    'setContact': setContact,
    'toggleFavorite': toggleFavorite,
    'render': render,
    'defaultTelType': DEFAULT_TEL_TYPE,
    'startNFC': startNFC
  };
})();
