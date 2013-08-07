'use strict';

var contacts = window.contacts || {};

contacts.Details = (function() {
  var photoPos = 7;
  var initMargin = 8;
  var contactData,
      contactDetails,
      listContainer,
      star,
      detailsName,
      orgTitle,
      birthdayTemplate,
      phonesTemplate,
      emailsTemplate,
      addressesTemplate,
      socialTemplate,
      notesTemplate,
      isFbContact,
      isFbLinked,
      editContactButton,
      cover,
      wrapper,
      favoriteMessage,
      detailsInner,
      TAG_OPTIONS,
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
    star = dom.querySelector('#favorite-star');
    detailsName = dom.querySelector('#contact-name-title');
    orgTitle = dom.querySelector('#org-title');
    birthdayTemplate = dom.querySelector('#birthday-template-\\#i\\#');
    phonesTemplate = dom.querySelector('#phone-details-template-\\#i\\#');
    emailsTemplate = dom.querySelector('#email-details-template-\\#i\\#');
    addressesTemplate = dom.querySelector('#address-details-template-\\#i\\#');
    socialTemplate = dom.querySelector('#social-template-\\#i\\#');
    editContactButton = dom.querySelector('#edit-contact-button');
    cover = dom.querySelector('#cover-img');
    detailsInner = dom.querySelector('#contact-detail-inner');
    favoriteMessage = dom.querySelector('#toggle-favorite');
    notesTemplate = dom.querySelector('#note-details-template-\\#i\\#');

    wrapper = dom.querySelector('#contact-detail-wrapper');
    initPullEffect(cover);
  };

  var setContact = function cd_setContact(currentContact) {
    contactData = currentContact;
  };

  var setContainer = function cd_setContainer(container) {
    listContainer = container;
  };

  var initPullEffect = function cd_initPullEffect(cover) {
    wrapper.addEventListener('touchstart', function(event) {

      // Avoiding repaint (at least when no scroll is needed)
      if (cover.style.overflow == 'hidden') {
        var headerHeight = 5;
        contactDetails.style.top = headerHeight + 'rem';
        contactDetails.style.position = 'fixed';
      }

      var event = event.changedTouches[0];
      if (contactDetails.classList.contains('no-photo'))
        return;

      var startPosition = event.clientY;
      contactDetails.classList.add('up');
      cover.classList.add('up');

      var onMouseMove = function onMouseMove(event) {
        var event = event.changedTouches[0];
        var newMargin = event.clientY - startPosition;
        if (newMargin > 0 && newMargin < 150) {
          contactDetails.classList.remove('up');
          cover.classList.remove('up');
          var calc = 'calc(' + initMargin + 'rem + ' + newMargin + 'px)';
          // Divide by 40 (4 times slower and in rems)
          contactDetails.style.transform = 'translateY(' + calc + ')';
          var newPos = (-photoPos + (newMargin / 40)) + 'rem';
          cover.style.transform = 'translateY(' + newPos + ')';
        }
      };

      var onMouseUp = function onMouseUp(event) {
        var event = event.changedTouches[0];
        contactDetails.classList.add('up');
        cover.classList.add('up');
        contactDetails.style.transform = null;
        cover.style.transform = null;
        removeEventListener('touchmove', onMouseMove);
        removeEventListener('touchend', onMouseUp);
        contactDetails.addEventListener('transitionend', function transEnd() {
          contactDetails.style.position = 'relative';
          contactDetails.style.top = '0';
          this.removeEventListener('transitionend', transEnd);
        });
      };

      addEventListener('touchmove', onMouseMove);
      addEventListener('touchend', onMouseUp);
    });
  };

  var render = function cd_render(currentContact, tags, isEnrichedContact) {
    contactData = currentContact || contactData;

    TAG_OPTIONS = tags || TAG_OPTIONS;
    isFbContact = fb.isFbContact(contactData);
    isFbLinked = fb.isFbLinked(contactData);

    // Initially enabled and only disabled if necessary
    editContactButton.removeAttribute('disabled');

    if (!isEnrichedContact && isFbContact) {
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
      doReloadContactDetails(contactData);
    }
  };



  //
  // Method that generates HTML markup for the contact
  //
  var doReloadContactDetails = function doReloadContactDetails(contact) {

    detailsName.textContent = contact.name;
    contactDetails.classList.remove('no-photo');
    contactDetails.classList.remove('up');
    listContainer.innerHTML = '';

    renderFavorite(contact);
    renderOrg(contact);
    renderBday(contact);

    renderPhones(contact);
    renderEmails(contact);
    renderAddresses(contact);
    renderNotes(contact);
    if (fb.isEnabled) {
      renderSocial(contact);
    }

    renderPhoto(contact);
  };

  var renderFavorite = function cd_renderFavorite(contact) {
    var favorite = isFavorite(contact);
    toggleFavoriteMessage(favorite);
    if (contact.category && contact.category.indexOf('favorite') != -1) {
      star.classList.remove('hide');
    } else {
      star.classList.add('hide');
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
        delete contact.category[pos];
      }
    }

    // Disabling button while saving the contact
    favoriteMessage.style.pointerEvents = 'none';

    var request = navigator.mozContacts.save(contact);
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
    if (contact.org && contact.org.length > 0 && contact.org[0] != '') {
      orgTitle.textContent = contact.org[0];
      orgTitle.className = '';
    } else {
      orgTitle.className = 'hide';
      orgTitle.textContent = '';
    }
  };

  var renderBday = function cd_renderBday(contact) {
    if (!contact.bday) {
      return;
    }

    var f = new navigator.mozL10n.DateTimeFormat();
    var birthdayFormat = _('birthdayDateFormat') || '%e %B';
    var birthdayString = '';
    try {
      birthdayString = f.localeFormat(contact.bday, birthdayFormat);
    } catch (err) {
      console.error('Error parsing birthday');
      return;
    }

    var element = utils.templates.render(birthdayTemplate, {
      i: contact.id,
      bday: birthdayString
    });

    listContainer.appendChild(element);
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
        if (socialLabel)
          socialLabel.textContent = _('facebook');
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

  var checkOnline = function(social) {
    var socialTemplate = social || currentSocial;

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

  var renderPhones = function cd_renderPhones(contact) {
    if (!contact.tel) {
      return;
    }
    var telLength = Contacts.getLength(contact.tel);
    for (var tel = 0; tel < telLength; tel++) {
      var currentTel = contact.tel[tel];
      var escapedType = Normalizer.escapeHTML(currentTel.type, true);
      var telField = {
        value: Normalizer.escapeHTML(currentTel.value, true) || '',
        type: _(escapedType) || escapedType ||
                                        TAG_OPTIONS['phone-type'][0].value,
        'type_l10n_id': currentTel.type,
        carrier: Normalizer.escapeHTML(currentTel.carrier || '', true) || '',
        i: tel
      };
      var template = utils.templates.render(phonesTemplate, telField);

      // Add event listeners to the phone template components
      var sendSmsButton = template.querySelector('#send-sms-button-' + tel);
      sendSmsButton.dataset['tel'] = telField.value;
      sendSmsButton.addEventListener('click', onSendSmsClicked);

      var callOrPickButton = template.querySelector('#call-or-pick-' + tel);
      callOrPickButton.dataset['tel'] = telField.value;
      callOrPickButton.addEventListener('click', onCallOrPickClicked);

      listContainer.appendChild(template);
    }
  };

  var onSendSmsClicked = function onSendSmsClicked(evt) {
    var tel = evt.target.dataset['tel'];
    Contacts.sendSms(tel);
  };

  var onCallOrPickClicked = function onCallOrPickClicked(evt) {
    var tel = evt.target.dataset['tel'];
    Contacts.callOrPick(tel);
  };

  var renderEmails = function cd_renderEmails(contact) {
    if (!contact.email) {
      return;
    }
    var emailLength = Contacts.getLength(contact.email);
    for (var email = 0; email < emailLength; email++) {
      var currentEmail = contact.email[email];
      var escapedType = Normalizer.escapeHTML(currentEmail['type'], true);
      var emailField = {
        value: Normalizer.escapeHTML(currentEmail['value'], true) || '',
        type: _(escapedType) || escapedType ||
                                          TAG_OPTIONS['email-type'][0].value,
        'type_l10n_id': currentEmail['type'],
        i: email
      };
      var template = utils.templates.render(emailsTemplate, emailField);

      // Add event listeners to the phone template components
      var emailButton = template.querySelector('#email-or-pick-' + email);
      emailButton.dataset['email'] = emailField.value;
      emailButton.addEventListener('click', onEmailOrPickClick);

      listContainer.appendChild(template);
    }
  };

  var onEmailOrPickClick = function onEmailOrPickClick(evt) {
    evt.preventDefault();
    var email = evt.target.dataset['email'];
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
      var address = currentAddress['streetAddress'] || '';
      var escapedStreet = Normalizer.escapeHTML(address, true);
      var locality = currentAddress['locality'];
      var escapedLocality = Normalizer.escapeHTML(locality, true);
      var escapedType = Normalizer.escapeHTML(currentAddress['type'], true);
      var country = currentAddress['countryName'] || '';
      var escapedCountry = Normalizer.escapeHTML(country, true);
      var postalCode = currentAddress['postalCode'] || '';
      var escapedPostalCode = Normalizer.escapeHTML(postalCode, true);

      var addressField = {
        streetAddress: escapedStreet,
        postalCode: escapedPostalCode,
        locality: escapedLocality || '',
        countryName: escapedCountry,
        type: _(escapedType) || escapedType ||
                                        TAG_OPTIONS['address-type'][0].value,
        'type_l10n_id': currentAddress['type'],
        i: i
      };
      var template = utils.templates.render(addressesTemplate, addressField);
      listContainer.appendChild(template);
    }
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

  var renderPhoto = function cd_renderPhoto(contact) {
    contactDetails.classList.remove('up');
    if (contact.photo && contact.photo.length > 0) {
      contactDetails.classList.add('up');
      var clientHeight = contactDetails.clientHeight - (initMargin * 10);
      if (detailsInner.offsetHeight < clientHeight) {
        cover.style.overflow = 'hidden';
      } else {
        cover.style.overflow = 'auto';
      }
      Contacts.updatePhoto(contact.photo[0], cover);
    } else {
      cover.style.backgroundImage = '';
      cover.style.overflow = 'auto';
      contactDetails.style.transform = '';
      contactDetails.classList.add('no-photo');
    }
  };

  var reMark = function(field, value) {
    var selector = '[data-' + field + '="' + value + '"]';
    var elements = listContainer.querySelectorAll(selector);
    for (var i = 0; i < elements.length; i++) {
      elements[i].classList.add('remark');
    }
  };

  return {
    'init': init,
    'setContact': setContact,
    'toggleFavorite': toggleFavorite,
    'render': render,
    'onLineChanged': checkOnline,
    'reMark': reMark
  };
})();
