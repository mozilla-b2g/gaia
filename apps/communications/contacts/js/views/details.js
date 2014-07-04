'use strict';
/* jshint nonew: false */
/* global ActivityHandler */
/* global COMMS_APP_ORIGIN */
/* global Contacts */
/* global ContactPhotoHelper */
/* global fb */
/* global LazyLoader */
/* global MmiManager */
/* global MozActivity */
/* global MultiSimActionButton */
/* global Normalizer */
/* global SCALE_RATIO */
/* global TelephonyHelper */
/* global WebrtcClient */
/* global utils */
/* global TAG_OPTIONS */

var contacts = window.contacts || {};

contacts.Details = (function() {
  var photoPos = 7;
  var initMargin = 8;
  var DEFAULT_TEL_TYPE = 'other';
  var DEFAULT_EMAIL_TYPE = 'other';
  var PHONE_TYPE_MAP = {
  'cell' : 'mobile'
  };
  var contactData,
      contactDetails,
      listContainer,
      detailsName,
      orgTitle,
      datesTemplate,
      phonesTemplate,
      emailsTemplate,
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
      _;

  var socialButtonIds = [
    '#profile_button',
    '#wall_button',
    '#msg_button'
  ];

  var init = function cd_init(currentDom) {
    _ = navigator.mozL10n.get;
    dom = currentDom || document;
    contactDetails = dom.querySelector('#contact-detail');
    listContainer = dom.querySelector('#details-list');
    detailsName = dom.querySelector('#contact-name-title');
    orgTitle = dom.querySelector('#org-title');
    datesTemplate = dom.querySelector('#dates-template-\\#i\\#');
    phonesTemplate = dom.querySelector('#phone-details-template-\\#i\\#');
    emailsTemplate = dom.querySelector('#email-details-template-\\#i\\#');
    addressesTemplate = dom.querySelector('#address-details-template-\\#i\\#');
    socialTemplate = dom.querySelector('#social-template-\\#i\\#');
    duplicateTemplate = dom.querySelector('#duplicate-contacts-template');
    editContactButton = dom.querySelector('#edit-contact-button');
    cover = dom.querySelector('#cover-img');
    detailsInner = dom.querySelector('#contact-detail-inner');
    favoriteMessage = dom.querySelector('#toggle-favorite');
    notesTemplate = dom.querySelector('#note-details-template-\\#i\\#');

    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);

    initPullEffect(cover);

    utils.listeners.add({
      '#toggle-favorite': toggleFavorite,
      '#details-back': handleDetailsBack,
      '#edit-contact-button': showEditContact
    });
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
    // disable NFC listeners if NFC is available
    if ('mozNfc' in navigator) {
      contacts.NFC.stopListening();
    }

    if (WebrtcClient) {
      getWebrtcClientResources(WebrtcClient.stop);
    }

    if (ActivityHandler.currentActivityIsNot(['import'])) {
      ActivityHandler.postCancel();
      Contacts.navigation.home();
    } else {
      var hasParams = window.location.hash.split('?');
      var params = hasParams.length > 1 ?
        utils.extractParams(hasParams[1]) : -1;

      Contacts.navigation.back(resetPhoto);
      // post message to parent page included Contacts app.
      if (params.back_to_previous_tab === '1') {
        var message = { 'type': 'contactsiframe', 'message': 'back' };
        window.parent.postMessage(message, COMMS_APP_ORIGIN);
      }
    }
  };

  var showEditContact = function showEditContact() {
    Contacts.showForm(true, contactData);
  };

  var setContact = function cd_setContact(currentContact) {
    contactData = currentContact;
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

  var render = function cd_render(currentContact, fbContactData) {
    contactData = currentContact || contactData;

    isFbContact = fb.isFbContact(contactData);
    isFbLinked = fb.isFbLinked(contactData);

    // Initially enabled and only disabled if necessary
    editContactButton.removeAttribute('disabled');

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
    detailsName.textContent = getDisplayName(contact);
    contactDetails.classList.remove('no-photo');
    contactDetails.classList.remove('fb-contact');
    contactDetails.classList.remove('up');
    utils.dom.removeChildNodes(listContainer);

    renderFavorite(contact);
    renderOrg(contact);

    renderPhones(contact);
    renderEmails(contact);

    renderWebrtcClient(contactData);// Don't share the FB info

    renderAddresses(contact);

    renderDates(contact);

    renderNotes(contact);
    if (fb.isEnabled) {
      renderSocial(contact);
    }

    if (!fb.isFbContact(contact) || fb.isFbLinked(contact)) {
      renderDuplicate(contact);
    }

    renderPhoto(contact);
  };

  var renderFavorite = function cd_renderFavorite(contact) {
    var favorite = isFavorite(contact);
    toggleFavoriteMessage(favorite);
    if (contact.category && contact.category.indexOf('favorite') != -1) {
      detailsName.classList.add('favorite');
    } else {
      detailsName.classList.remove('favorite');
    }
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

    var request = navigator.mozContacts.save(utils.misc.toMozContact(contact));
    request.onsuccess = function onsuccess() {
      var cList = contacts.List;
      /*
         Two contacts are returned because the enrichedContact is readonly
         and if the Contact is edited we need to prevent saving
         FB data on the mozContacts DB.
      */
       cList.getContactById(contact.id,
                           function onSuccess(savedContact, enrichedContact) {
        renderFavorite(savedContact);
        setContact(savedContact);
        favoriteMessage.style.pointerEvents = 'auto';
      }, function onError() {
        console.error('Error reloading contact');
        favoriteMessage.style.pointerEvents = 'auto';
      });
    };
    request.onerror = function onerror() {
      favoriteMessage.style.pointerEvents = 'auto';
      console.error('Error saving favorite');
    };
  };

  var toggleFavoriteMessage = function toggleFavMessage(isFav) {
    var cList = favoriteMessage.classList;
    var text = isFav ? _('removeFavorite') : _('addFavorite');
    favoriteMessage.textContent = text;
    isFav ? cList.add('on') : cList.remove('on');
  };

  var renderOrg = function cd_renderOrg(contact) {
    if (contact.org && contact.org.length > 0 && contact.org[0] !== '') {
      orgTitle.textContent = contact.org[0];
      orgTitle.className = '';
    } else {
      orgTitle.className = 'hide';
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

  var renderSocial = function cd_renderSocial(contact) {
    var linked = isFbLinked;

    var action = linked ? _('social-unlink') : _('social-link');
    var slinked = linked ? 'false' : 'true';

    var social = utils.templates.render(socialTemplate, {
      i: contact.id,
      action: action,
      linked: slinked
    });
    currentSocial = social;
    var linkButton = social.querySelector('#link_button');

    if (!isFbContact) {
      socialButtonIds.forEach(function check(id) {
        var button = social.querySelector(id);
        if (button) {
          button.classList.add('hide');
        }
      });
      // Checking whether link should be enabled or not
      doDisableButton(linkButton);
    } else {
        var socialLabel = social.querySelector('#social-label');
        if (socialLabel) {
          socialLabel.textContent = _('facebook');
        }

        // Check whether the social buttons that require to be online
        // should be there
        disableButtons(social, socialButtonIds);
    }

    // If it is a FB Contact but not linked unlink must be hidden
    if (isFbContact && !linked) {
      linkButton.classList.add('hide');
    }

    Contacts.extServices.initEventHandlers(social, contact, linked);

    listContainer.appendChild(social);
  };

  var checkOnline = function() {
    var socialTemplate = document.querySelector(
                                        ':not([data-template])[data-social]');

    if (socialTemplate) {
      if (isFbContact) {
         disableButtons(socialTemplate, socialButtonIds);
      }
      else {
        disableButtons(socialTemplate, ['#link_button']);
      }
    }
  };

  function disableButtons(tree, buttonIds) {
    buttonIds.forEach(function enable(id) {
      var button = tree.querySelector(id);
      if (button) {
        doDisableButton(button);
      }
    });
  }

  function doDisableButton(buttonElement) {
    if (navigator.onLine === true) {
      buttonElement.removeAttribute('disabled');
    }
    else {
      buttonElement.setAttribute('disabled', 'disabled');
    }
  }

  var enableCalls = function enableCalls() {
    contactDetails.classList.remove('calls-disabled');
  };

  var disableCalls = function disableCalls() {
    contactDetails.classList.add('calls-disabled');
  };

  var call = function call(phoneNumber, cardIndex) {
    disableCalls();
    TelephonyHelper.call(phoneNumber, cardIndex, enableCalls, enableCalls,
                         enableCalls, enableCalls);
  };

  var renderPhones = function cd_renderPhones(contact) {
    if (!contact.tel) {
      return;
    }
    var telLength = Contacts.getLength(contact.tel);
    for (var tel = 0; tel < telLength; tel++) {
      var currentTel = contact.tel[tel];
      var escapedType = Normalizer.escapeHTML(currentTel.type, true).trim();
      var carrier = Normalizer.escapeHTML(currentTel.carrier || '', true) || '';
      escapedType =
            _(PHONE_TYPE_MAP[escapedType] || escapedType || DEFAULT_TEL_TYPE) ||
            escapedType;
      var telField = {
        value: Normalizer.escapeHTML(currentTel.value, true) || '',
        type: escapedType + (carrier ? _('separator') : ''),
        'type_l10n_id': currentTel.type,
        carrier: carrier,
        i: tel
      };

      var template = utils.templates.render(phonesTemplate, telField);

      // Add event listeners to the phone template components
      var sendSmsButton = template.querySelector('#send-sms-button-' + tel);
      sendSmsButton.dataset.tel = telField.value;
      sendSmsButton.addEventListener('click', onSendSmsClicked);

      var callOrPickButton = template.querySelector('#call-or-pick-' + tel);
      callOrPickButton.dataset.tel = telField.value;
      setupPhoneButtonListener(callOrPickButton, telField.value);

      listContainer.appendChild(template);
    }
  };

  var renderWebrtcClient = function renderWebrtcClient(contact) {
    getWebrtcClientResources(function onLoaded() {
      WebrtcClient.start(contact);
    });
  };

  // Check current situation and setup different listener for the button
  function setupPhoneButtonListener(button, number) {
    LazyLoader.load(['/dialer/js/mmi.js'], function() {
      if (ActivityHandler.currentActivityIsNot(['open'])) {
        button.addEventListener('click', onPickNumber);
      } else if ((navigator.mozMobileConnection ||
          window.navigator.mozMobileConnections &&
          window.navigator.mozMobileConnections[0]) &&
          MmiManager.isMMI(number)) {
        button.addEventListener('click', onMMICode);
      } else if (navigator.mozTelephony) {
        LazyLoader.load(['/shared/js/multi_sim_action_button.js'], function() {
          new MultiSimActionButton(button, call,
                                   'ril.telephony.defaultServiceId',
                                   function() { return number; });
        });
      }
    });
  }

  // If we are currently handing an activity, send the phone
  // number as result of clicking in the phone button.
  function onPickNumber(evt) {
    var number = evt.target.dataset.tel;
    ActivityHandler.postPickSuccess({ number: number });
  }

  // If the phone number stored in a contact is a MMI code,
  // launch the dialer with that specific code.
  function onMMICode(evt) {
    var number = evt.target.dataset.tel;
    // For security reasons we cannot directly call MmiManager.send(). We
    // need to show the MMI number in the dialer instead.
    new MozActivity({
      name: 'dial',
      data: {
        type: 'webtelephony/number',
        number: number
      }
    });
  }

  var onSendSmsClicked = function onSendSmsClicked(evt) {
    var tel = evt.target.dataset.tel;
    Contacts.sendSms(tel);
  };

  var renderEmails = function cd_renderEmails(contact) {
    if (!contact.email) {
      return;
    }
    var emailLength = Contacts.getLength(contact.email);
    for (var email = 0; email < emailLength; email++) {
      var currentEmail = contact.email[email];
      var escapedType = Normalizer.escapeHTML(currentEmail.type, true);
      var emailField = {
        value: Normalizer.escapeHTML(currentEmail.value, true) || '',
        type: _(escapedType) || escapedType || DEFAULT_EMAIL_TYPE,
        'type_l10n_id': currentEmail.type,
        i: email
      };
      var template = utils.templates.render(emailsTemplate, emailField);

      // Add event listeners to the phone template components
      var emailButton = template.querySelector('#email-or-pick-' + email);
      emailButton.dataset.email = emailField.value;
      emailButton.addEventListener('click', onEmailOrPickClick);

      listContainer.appendChild(template);
    }
  };

  var onEmailOrPickClick = function onEmailOrPickClick(evt) {
    evt.preventDefault();
    var email = evt.target.dataset.email;
    Contacts.sendEmailOrPick(email);
    return false;
  };

  var renderAddresses = function cd_renderAddresses(contact) {
    if (!contact.adr) {
      return;
    }
    for (var i = 0; i < contact.adr.length; i++) {
      var currentAddress = contact.adr[i];
      // Sanity check
      if (Contacts.isEmpty(currentAddress, ['streetAddress', 'postalCode',
        'locality', 'countryName'])) {
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
  };

  var renderDuplicate = function cd_renderDuplicate(contact) {
    var dupItem = utils.templates.render(duplicateTemplate, {});
    var findMergeButton = dupItem.querySelector('#find-merge-button');
    findMergeButton.disabled = true;

    if (contacts.List.total > 1) {
      // Only have this active if contact list has more than one entry
      findMergeButton.disabled = false;
      findMergeButton.addEventListener('click', function finding() {
        Contacts.extServices.match(contact.id);
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
    title.textContent = _('comments');
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
        Contacts.updatePhoto(photo, cover);
        updateHash(photo, cover);
      }
      else {
        // Need to recalculate the hash and see whether the images changed
        calculateHash(photo, function(newHash) {
          if (currentHash !== newHash) {
            Contacts.updatePhoto(photo, cover);
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

  var reMark = function(field, value, remarkClass) {
    var selector = '[data-' + field + '="' + value + '"]';
    var elements = listContainer.querySelectorAll(selector);

    if (typeof remarkClass === 'undefined') {
      remarkClass = 'remark';
    }

    for (var i = 0; i < elements.length; i++) {
      elements[i].classList.add(remarkClass);
    }
  };

  return {
    'init': init,
    'setContact': setContact,
    'toggleFavorite': toggleFavorite,
    'render': render,
    'reMark': reMark,
    'defaultTelType' : DEFAULT_TEL_TYPE
  };
})();
