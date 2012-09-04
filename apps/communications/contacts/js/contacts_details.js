'use strict';

var _ = navigator.mozL10n.get;

var contacts = window.contacts || {};

contacts.Details = (function() {
  var photoPos = 8;
  var contact,
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
      isFbContact,
      editContactButton,
      cover,
      favoriteMessage,
      detailsInner,
      TAG_OPTIONS;

  var init = function cd_init() {
    contactDetails = document.getElementById('contact-detail');
    listContainer = document.getElementById('details-list');
    star = document.getElementById('favorite-star');
    detailsName = document.getElementById('contact-name-title');
    orgTitle = document.getElementById('org-title');
    birthdayTemplate = document.getElementById('birthday-template-#i#');
    phonesTemplate = document.getElementById('phone-details-template-#i#');
    emailsTemplate = document.getElementById('email-details-template-#i#');
    addressesTemplate = document.getElementById('address-details-template-#i#');
    socialTemplate = document.getElementById('social-template-#i#');
    editContactButton = document.getElementById('edit-contact-button');
    cover = document.getElementById('cover-img');
    detailsInner = document.getElementById('contact-detail-inner');
    favoriteMessage = document.getElementById('toggle-favorite').children[0];
    initPullEffect(cover);
    TAG_OPTIONS = {
      'phone-type' : [
        {value: _('mobile')},
        {value: _('home')},
        {value: _('work')},
        {value: _('personal')},
        {value: _('faxHome')},
        {value: _('faxOffice')},
        {value: _('faxOther')},
        {value: _('another')}
      ],
      'email-type' : [
        {value: _('personal')},
        {value: _('home')},
        {value: _('work')}
      ],
      'address-type' : [
        {value: _('home')},
        {value: _('work')}
      ]
    };
  };

  var initPullEffect = function cd_initPullEffect(cover) {
    cover.addEventListener('mousedown', function(event) {
      if (contactDetails.classList.contains('no-photo'))
        return;

      var startPosition = event.clientY;
      var currentPosition;
      var initMargin = '8rem';
      contactDetails.classList.add('up');
      cover.classList.add('up');

      var onMouseMove = function onMouseMove(event) {
        currentPosition = event.clientY;
        var newMargin = currentPosition - startPosition;
        if (newMargin > 0 && newMargin < 200) {
          contactDetails.classList.remove('up');
          cover.classList.remove('up');
          var calc = '-moz-calc(' + initMargin + ' + ' + newMargin + 'px)';
          // Divide by 40 (4 times slower and in rems)
          contactDetails.style.transform = 'translateY(' + calc + ')';
          var newPos = 'center ' + (-photoPos + (newMargin / 40)) + 'rem';
          cover.style.backgroundPosition = newPos;
        }
      };

      var onMouseUp = function onMouseUp(event) {
        contactDetails.classList.add('up');
        cover.classList.add('up');
        contactDetails.style.transform = 'translateY(' + initMargin + ')';
        cover.style.backgroundPosition = 'center -' + photoPos + 'rem';
        cover.removeEventListener('mousemove', onMouseMove);
        cover.removeEventListener('mouseup', onMouseUp);
      };

      cover.addEventListener('mousemove', onMouseMove);
      cover.addEventListener('mouseup', onMouseUp);
    });
  };

  var render = function cd_render(currentContact, tags) {
    contact = currentContact;
    TAG_OPTIONS = tags || TAG_OPTIONS;

    isFbContact = fb.isFbContact(contact);

    // Initially enabled and only disabled if necessary
    editContactButton.removeAttribute('disabled');

    if (isFbContact) {
      if (!fb.isFbLinked(contact)) {
        editContactButton.setAttribute('disabled', 'disabled');
      }

      var fbContact = new fb.Contact(contact);
      var req = fbContact.getData();

      req.onsuccess = function do_reload() {
        doReloadContactDetails(req.result);
      }

      req.onerror = function() {
        window.console.error('FB: Error while loading FB contact data');
        doReloadContactDetails(contact);
      }
    } else {
      doReloadContactDetails(contact);
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

    renderFavorite();
    renderOrg();
    renderBday();
    renderSocial();
    renderPhones();
    renderEmails();
    renderAddresses();
    renderNotes();
    renderPhoto();
  };

  var renderFavorite = function cd_renderFavorite() {
    var favorite = isFavorite(contact);
    toggleFavoriteMessage(favorite);
    if (contact.category && contact.category.indexOf('favorite') != -1) {
      star.classList.remove('hide');
    } else {
      star.classList.add('hide');
    }
  };

  var isFavorite = function isFavorite(contact) {
    return contact != null & contact.category != null &&
              contact.category.indexOf('favorite') != -1;
  };

  var toggleFavorite = function toggleFavorite() {
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

    var request = navigator.mozContacts.save(contact);
    request.onsuccess = function onsuccess() {
      console.log('1');
      var cList = contacts.List;
      console.log('2');
      /*
         Two contacts are returned because the enrichedContact is readonly
         and if the Contact is edited we need to prevent saving
         FB data on the mozContacts DB.
      */
       cList.getContactById(contact.id,
                           function onSuccess(savedContact, enrichedContact) {
        contact = savedContact;

        if (enrichedContact) {
          contactsList.refresh(enrichedContact);
        } else {
          console.log(cList.refresh);
          cList.refresh(contact);
        }
        renderFavorite();
      }, function onError() {
        console.error('Error reloading contact');
      });
    };
    request.onerror = function onerror() {
      console.error('Error saving favorite');
    };
  };

  var toggleFavoriteMessage = function toggleFavMessage(isFav) {
    favoriteMessage.textContent = !isFav ?
                    _('addFavorite') :
                    _('removeFavorite');
  };

  var renderOrg = function cd_renderOrg() {
    if (contact.org && contact.org[0] != '') {
      orgTitle.textContent = contact.org[0];
      orgTitle.className = '';
    } else {
      orgTitle.className = 'hide';
      orgTitle.textContent = '';
    }
  };

  var renderBday = function cd_renderBday() {
    if (!contact.bday) {
      return;
    }

    var f = new navigator.mozL10n.DateTimeFormat();
    var birthdayFormat = _('birthdayDateFormat') || '%e %B';
    var birthdayString = f.localeFormat(contact.bday, birthdayFormat);

    var element = utils.templates.render(birthdayTemplate, {
      i: contact.id,
      bday: birthdayString
    });

    listContainer.appendChild(element);
  };

  var renderSocial = function cd_renderSocial() {
    var linked = fb.isFbLinked(contact);
    if (!fb.isFbContact(contact) || linked) {
      var action = linked ? _('social-unlink') : _('social-link');
      var linked = linked ? 'false' : 'true';

      var social = utils.templates.render(socialTemplate, {
        i: contact.id,
        action: action,
        linked: linked
      });

      listContainer.appendChild(social);
    }
  }

  var renderPhones = function cd_renderPhones() {
    if (!contact.tel) {
      return;
    }
    var telLength = Contacts.getLength(contact.tel);
    for (var tel = 0; tel < telLength; tel++) {
      var currentTel = contact.tel[tel];
      var telField = {
        value: currentTel.value || '',
        type: currentTel.type || TAG_OPTIONS['phone-type'][0].value,
        carrier: currentTel.carrier || '',
        i: tel
      };
      var template = utils.templates.render(phonesTemplate, telField);
      listContainer.appendChild(template);
    }
  };

  var renderEmails = function cd_renderEmails() {
    if (!contact.email) {
      return;
    }
    var emailLength = Contacts.getLength(contact.email);
    for (var email = 0; email < emailLength; email++) {
      var currentEmail = contact.email[email];
      var emailField = {
        value: currentEmail['value'] || '',
        type: currentEmail['type'] || TAG_OPTIONS['email-type'][0].value,
        i: email
      };
      var template = utils.templates.render(emailsTemplate, emailField);
      listContainer.appendChild(template);
    }
  };

  var renderAddresses = function cd_renderAddresses() {
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
      var addressField = {
        streetAddress: currentAddress['streetAddress'] || '',
        postalCode: currentAddress['postalCode'] || '',
        locality: currentAddress['locality'] || '',
        countryName: currentAddress['countryName'] || '',
        type: currentAddress['type'] || TAG_OPTIONS['address-type'][0].value,
        i: i
      };
      var template = utils.templates.render(addressesTemplate, addressField);
      listContainer.appendChild(template);
    }
  };

  var renderNotes = function cd_rederNotes() {
    if (!contact.note || contact.note.length === 0) {
      return;
    }
    var container = document.createElement('li');
    var title = document.createElement('h2');
    title.textContent = _('comments');
    container.appendChild(title);
    var notesTemplate = document.getElementById('note-details-template-#i#');
    for (var i = 0; i < contact.note.length; i++) {
      var currentNote = contact.note[i];
      var noteField = {
        note: currentNote || '',
        i: i
      };
      var template = utils.templates.render(notesTemplate, noteField);
      container.appendChild(template);
      listContainer.appendChild(container);
    }
  };

  var renderPhoto = function cd_renderPhoto() {
    if (contact.photo && contact.photo.length > 0) {
      contactDetails.classList.add('up');
      var photoOffset = (photoPos + 1) * 10;
      if ((detailsInner.offsetHeight + photoOffset) < cover.clientHeight) {
        cover.style.overflow = 'hidden';
      } else {
        cover.style.overflow = 'visible';
      }
      Contacts.updatePhoto(contact.photo[0], cover);
    } else {
      cover.style.backgroundImage = '';
      cover.style.overflow = 'visible';
      contactDetails.style.transform = '';
      contactDetails.classList.add('no-photo');
    }
  };

  return {
    'init': init,
    'toggleFavorite': toggleFavorite,
    'render': render
  }
})();
