﻿'use strict';

var _ = navigator.mozL10n.get;
var TAG_OPTIONS;

function navigationStack(currentView) {
  var transitions = {
    'left-right': { from: 'view-left', to: 'view-right'},
    'top-bottom': { from: 'view-bottom', to: 'view-top'},
    'right-left': { from: 'view-right', to: 'view-left'},
    'bottom-top': { from: 'view-top', to: 'view-bottom'},
    'none': { from: 'none', to: 'none'}
  };

  var _currentView = currentView;
  var app = document.getElementById('app');
  var cache = document.getElementById('cache');
  var transitionTimeout = 0;

  var stack = [];

  var revertTransition = function(transition) {
    return {
      from: transitions[transition].to,
      to: transitions[transition].from
    };
  };

  var setAppView = function(current, next) {
    current.dataset.state = 'inactive';
    next.dataset.state = 'active';
  };

  var setCacheView = function(current, next, transition) {
    current.classList.add('transitioning');
    next.classList.add('transitioning');
    var currentMirror = document.getElementById(current.dataset.mirror);
    var nextMirror = document.getElementById(next.dataset.mirror);
    var move = transitions[transition] || transition;

    cache.dataset.state = 'active';
    clearTimeout(transitionTimeout);
    transitionTimeout = setTimeout(function animate() {
      currentMirror.classList.add(move.to);
      nextMirror.classList.remove(move.from);
    }, 1);

    nextMirror.addEventListener('transitionend', function nocache() {
      setAppView(current, next);
      app.dataset.state = 'active';
      cache.dataset.state = 'inactive';
      nextMirror.removeEventListener('transitionend', nocache);
      current.classList.remove('transitioning');
      next.classList.remove('transitioning');
    });
  };

  var resetMirror = function resetMirror(view, transition) {
    var mirror = document.getElementById(view.dataset.mirror);
    mirror.classList.remove(transition.to);
    mirror.classList.add(transition.from);
  };

  this.go = function go(nextView, transition) {
    if (_currentView === nextView)
      return;
    var current = document.getElementById(_currentView);
    var next = document.getElementById(nextView);
    if (transition == 'none') {
      setAppView(current, next);
    } else {
      setCacheView(current, next, transition);
    }

    stack.push({ view: _currentView, transition: transition});
    _currentView = nextView;
  };

  this.back = function back() {
    if (stack.length < 1)
      return;
    var current = document.getElementById(_currentView);
    var nextView = stack.pop();
    var next = document.getElementById(nextView.view);
    var from = transitions[nextView.transition].from;
    var to = transitions[nextView.transition].to;
    if (from == 'none' || to == 'none') {
      setAppView(current, next);
    } else {
      var reverted = revertTransition(nextView.transition);
      setCacheView(current, next, reverted);
    }
    _currentView = nextView.view;
  };

  this.home = function home() {
    if (stack.length < 1)
      return;

    while (stack.length > 1) {
      var currentObject = stack.pop();
      var currentView = document.getElementById(currentObject.view);
      resetMirror(currentView, transitions[currentObject.transition]);
    }
    // As stack.length == 1 next view is going to be
    // the home, so we can use back method
    this.back();
  }
}

var Contacts = (function() {
  var navigation = new navigationStack('view-contacts-list');

  function edit() {
    navigation.go('view-contact-form', 'right-left');
  }

  var numberEmails = 0;
  var numberPhones = 0;
  var numberAddresses = 0;
  var numberNotes = 0;
  var photoPos = 8;
  var currentContactId,
      detailsName,
      givenName,
      company,
      familyName,
      formTitle,
      phoneTemplate,
      emailTemplate,
      addressTemplate,
      noteTemplate,
      phonesContainer,
      emailContainer,
      addressContainer,
      noteContainer,
      selectedTag,
      customTag,
      contactTag,
      contactDetails,
      saveButton,
      deleteContactButton,
      favoriteMessage,
      cover,
      thumb;

  var currentContact = {};

  var contactsList = contacts.List;

  var checkUrl = function checkUrl() {
    var hasParams = window.location.hash.split('?');
    var hash = hasParams[0];
    var sectionId = hash.substr(1, hash.length) || '';
    var cList = contacts.List;
    var params = hasParams.length > 1 ?
      extractParams(hasParams[1]) : -1;

    switch (sectionId) {
      case 'view-contact-details':
        if (params == -1 || !('id' in params)) {
          console.log('Param missing');
          return;
        }
        var id = params['id'];
        cList.getContactById(id, function onSuccess(savedContact) {
          currentContact = savedContact;
          reloadContactDetails();
          navigation.go(sectionId, 'none');
        }, function onError() {
          console.error('Error retrieving contact');
        });
        break;

      case 'view-contact-form':
        if (params == -1 || !('id' in params)) {
          showAdd(params);
        } else {
          // Editing existing contact
          if ('id' in params) {
            var id = params['id'];
            cList.getContactById(id, function onSuccess(savedContact) {
              currentContact = savedContact;
              showEdit();
            }, function onError() {
              console.log('Error retrieving contact to be edited');
              showAdd();
            });
          }
        }
        break;

    }

    if (!contactsList.loaded) {
      loadList();
    }

  }

  var extractParams = function extractParams(url) {
    if (!url) {
      return -1;
    }
    var ret = {};
    var params = url.split('&');
    for (var i = 0; i < params.length; i++) {
      var currentParam = params[i].split('=');
      ret[currentParam[0]] = currentParam[1];
    }
    return ret;
  }

  var initContainers = function initContainers() {
    currentContactId = document.getElementById('contact-form-id');
    givenName = document.getElementById('givenName');
    company = document.getElementById('org');
    familyName = document.getElementById('familyName');
    detailsName = document.getElementById('contact-name-title');
    formTitle = document.getElementById('contact-form-title');
    phoneTemplate = document.getElementById('add-phone-#i#');
    emailTemplate = document.getElementById('add-email-#i#');
    addressTemplate = document.getElementById('add-address-#i#');
    noteTemplate = document.getElementById('add-note-#i#');
    phonesContainer = document.getElementById('contacts-form-phones');
    emailContainer = document.getElementById('contacts-form-emails');
    addressContainer = document.getElementById('contacts-form-addresses');
    noteContainer = document.getElementById('contacts-form-notes');
    contactDetails = document.getElementById('contact-detail');
    saveButton = document.getElementById('save-button');
    deleteContactButton = document.getElementById('delete-contact');
    customTag = document.getElementById('custom-tag');
    favoriteMessage = document.getElementById('toggle-favorite').children[0];
    cover = document.getElementById('cover-img');
    thumb = document.getElementById('thumbnail-photo');
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

  window.addEventListener('localized', function initContacts(evt) {
    initLanguages();
    initContainers();
    initPullEffect(cover);
    initContactsList();
    checkUrl();
    window.addEventListener('hashchange', checkUrl);
    document.body.classList.remove('hide');
  });

  var initContactsList = function initContactsList() {
    var list = document.getElementById('groups-list');
    contactsList.init(list);
  }

  var initLanguages = function initLanguages() {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  };

  document.addEventListener('input', function input(event) {
    checkDisableButton();
  });

  // When the cancel button inside the input is clicked
  document.addEventListener('cancelInput', function() {
    checkDisableButton();
  });

  var checkDisableButton = function checkDisable() {
    var saveButton = document.getElementById('save-button');
    if (emptyForm('contact-form')) {
      saveButton.setAttribute('disabled', 'disabled');
    } else {
      saveButton.removeAttribute('disabled');
    }
  };

  var emptyForm = function emptyForm(id) {
    var form = document.getElementById(id);
    var inputs = form.querySelectorAll('input.textfield');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].value != '')
        return false;
    }
    return true;
  }

  var loadList = function loadList() {
    contactsList.load();
    contactsList.handleClick(function handleClick(id) {
      var options = {
        filterBy: ['id'],
        filterOp: 'equals',
        filterValue: id
      };

      var request = navigator.mozContacts.find(options);
      request.onsuccess = function findCallback() {
        currentContact = request.result[0];
        reloadContactDetails();
        navigation.go('view-contact-details', 'right-left');
      };
    });
  }

  var initPullEffect = function initPullEffect(cover) {
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

  //
  // Method that generates HTML markup for the contact
  //
  var reloadContactDetails = function reloadContactDetails() {
    var contact = currentContact;
    toggleFavoriteMessage(isFavorite(currentContact));
    detailsName.textContent = contact.name;
    var star = document.getElementById('favorite-star');
    if (contact.category && contact.category.indexOf('favorite') != -1) {
      star.classList.remove('hide');
    } else {
      star.classList.add('hide');
    }
    contactDetails.classList.remove('no-photo');
    contactDetails.classList.remove('up');

    var orgTitle = document.getElementById('org-title');
    if (contact.org && contact.org[0] != '') {
      orgTitle.textContent = contact.org[0];
      orgTitle.className = '';
    } else {
      orgTitle.className = 'hide';
      orgTitle.textContent = '';
    }
    var listContainer = document.getElementById('details-list');
    listContainer.innerHTML = '';

    var phonesTemplate = document.getElementById('phone-details-template-#i#');
    for (var tel in contact.tel) {
      var currentTel = contact.tel[tel];
      var telField = {
        number: currentTel.number || '',
        type: currentTel.type || TAG_OPTIONS['phone-type'][0].value,
        notes: '',
        i: tel
      };
      var template = utils.templates.render(phonesTemplate, telField);
      listContainer.appendChild(template);
    }

    var emailsTemplate = document.getElementById('email-details-template-#i#');
    for (var email in contact.email) {
      var currentEmail = contact.email[email];
      var emailField = {
        address: currentEmail['address'] || '',
        type: currentEmail['type'] || TAG_OPTIONS['email-type'][0].value,
        i: email
      };
      var template = utils.templates.render(emailsTemplate, emailField);
      listContainer.appendChild(template);
    }

    if (contact.bday) {
      var bdayTemplate = document.getElementById('birthday-template-#i#');

      // TODO: Fix this with a locale function for dates!!!!
      var months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November',
                    'December'];
      var bdayString = contact.bday.getDate() + ', ' +
                                            months[contact.bday.getMonth()];
      var e = utils.templates.render(bdayTemplate, {bday: bdayString});
      listContainer.appendChild(e);
    }

    var selector = document.getElementById('address-details-template-#i#');
    var addressesTemplate = selector;
    if (contact.adr) {
      for (var i = 0; i < contact.adr.length; i++) {
        var currentAddress = contact.adr[i];
        // Sanity check
        if (isEmpty(currentAddress, ['streetAddress', 'postalCode',
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
    }

    if (contact.note && contact.note.length > 0) {
      var container = document.createElement('li');
      var title = document.createElement('h2');
      title.textContent = _('comments');
      container.appendChild(title);
      var notesTemplate = document.getElementById('note-details-template-#i#');
      for (var i in contact.note) {
        var currentNote = contact.note[i];
        var noteField = {
          note: currentNote || '',
          i: i
        };
        var template = utils.templates.render(notesTemplate, noteField);
        container.appendChild(template);
        listContainer.appendChild(container);
      }
    }

    if (contact.photo && contact.photo.length > 0) {
      var detailsInner = document.getElementById('contact-detail-inner');
      contactDetails.classList.add('up');
      var photoOffset = (photoPos + 1) * 10;
      if ((detailsInner.offsetHeight + photoOffset) < cover.clientHeight) {
        cover.style.overflow = 'hidden';
      } else {
        cover.style.overflow = null;
      }
      updatePhoto(contact.photo[0], cover);
    } else {
      cover.style.overflow = null;
      cover.style.backgroundImage = null;
      contactDetails.style.transform = null;
      contactDetails.classList.add('no-photo');
    }
  };

  var showEdit = function showEdit() {
    resetForm();
    deleteContactButton.classList.remove('hide');
    formTitle.innerHTML = _('editContact');
    currentContactId.value = currentContact.id;
    givenName.value = currentContact.givenName;
    familyName.value = currentContact.familyName;
    company.value = currentContact.org;
    if (currentContact.photo && currentContact.photo.length > 0) {
      updatePhoto(currentContact.photo[0], thumb);
    }
    var default_type = TAG_OPTIONS['phone-type'][0].value;
    for (var tel in currentContact.tel) {
      var currentTel = currentContact.tel[tel];
      var telField = {
        number: currentTel.number,
        type: currentTel.type || default_type,
        notes: '',
        i: tel
      };

      var template = utils.templates.render(phoneTemplate, telField);
      template.appendChild(removeFieldIcon(template.id));
      phonesContainer.appendChild(template);
      numberPhones++;
    }

    for (var email in currentContact.email) {
      var currentEmail = currentContact.email[email];
      var default_type = TAG_OPTIONS['email-type'][0].value;
      var emailField = {
        address: currentEmail['address'] || '',
        type: currentEmail['type'] || default_type,
        i: email
      };

      var template = utils.templates.render(emailTemplate, emailField);
      template.appendChild(removeFieldIcon(template.id));
      emailContainer.appendChild(template);
      numberEmails++;
    }

    if (currentContact.adr) {
      for (var adr = 0; adr < currentContact.adr.length; adr++) {
        var currentAddress = currentContact.adr[adr];
        if (isEmpty(currentAddress, ['streetAddress', 'postalCode',
          'locality', 'countryName'])) {
            continue;
        }
        var default_type = TAG_OPTIONS['address-type'][0].value;
        var adrField = {
          streetAddress: currentAddress['streetAddress'] || '',
          postalCode: currentAddress['postalCode'] || '',
          locality: currentAddress['locality'] || '',
          countryName: currentAddress['countryName'] || '',
          type: currentAddress['type'] || default_type,
          i: adr
        };

        var template = utils.templates.render(addressTemplate, adrField);
        template.appendChild(removeFieldIcon(template.id));
        addressContainer.appendChild(template);
        numberAddresses++;
      }
    }

    for (var index in currentContact.note) {
      var currentNote = currentContact.note[index];
      var noteField = {
        note: currentNote || '',
        i: index
      };
      var template = utils.templates.render(noteTemplate, noteField);
      template.appendChild(removeFieldIcon(template.id));
      noteContainer.appendChild(template);
      numberNotes++;
    }

    deleteContactButton.onclick = function deleteClicked(event) {
      var msg = _('deleteConfirmMsg');
      Permissions.show('', msg, function onAccept() {
        deleteContact(currentContact);
      },function onCancel() {
        Permissions.hide();
      });
    };

    edit();
  };

  var updatePhoto = function updatePhoto(photo, dest) {
    var photoURL = URL.createObjectURL(photo);
    dest.style.backgroundImage = 'url(' + photoURL + ')';
  };

  // Checks if an object fields are empty, by empty means
  // field is null and if it's an array it's length is 0
  var isEmpty = function isEmpty(obj, fields) {
    if (obj == null || typeof(obj) != 'object' ||
        !fields || !fields.length) {
      return true;
    }
    var attr;
    var isArray;
    for (var i = 0; i < fields.length; i++) {
      attr = fields[i];
      if (obj.hasOwnProperty(attr) && obj[attr]) {
        if (Array.isArray(obj[attr])) {
          if (obj[attr].length > 0) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
    return true;
  }

  var isFavorite = function isFavorite(contact) {
    return contact != null & contact.category != null &&
              contact.category.indexOf('favorite') != -1;
  }

  var goToSelectTag = function goToSelectTag(event) {
    var target = event.currentTarget.children[0];
    var tagList = target.dataset.taglist;
    var options = TAG_OPTIONS[tagList];
    fillTagOptions(options, tagList, target);
    navigation.go('view-select-tag', 'right-left');
  };

  var fillTagOptions = function fillTagOptions(options, tagList, update) {
    var container = document.getElementById('tags-list');
    container.innerHTML = '';
    contactTag = update;

    var selectedLink;
    for (var option in options) {
      var link = document.createElement('a');
      link.href = '#';
      link.dataset.index = option;
      link.textContent = options[option].value;

      link.onclick = function(event) {
        var index = event.target.dataset.index;
        selectTag(event.target, tagList);
      };

      if (update.textContent == TAG_OPTIONS[tagList][option].value) {
        selectedLink = link;
      }

      var list = document.createElement('li');
      list.appendChild(link);
      container.appendChild(list);
    }

    // Deal with the custom tag, clean or fill
    customTag.value = '';
    if (!selectedLink && update.textContent) {
      customTag.value = update.textContent;
    }
    customTag.onclick = function(event) {
      if (selectedTag) {
        // Remove any mark if we had selected other option
        selectedTag.removeChild(selectedTag.firstChild.nextSibling);
      }
      selectedTag = null;
    }

    selectTag(selectedLink);
  };

  var selectTag = function selectTag(link, tagList) {
    if (link == null) {
      return;
    }

    //Clean any trace of the custom tag
    customTag.value = '';

    var index = link.dataset.index;
    if (tagList && contactTag) {
      contactTag.textContent = TAG_OPTIONS[tagList][index].value;
    }

    if (selectedTag) {
      selectedTag.removeChild(selectedTag.firstChild.nextSibling);
    }

    var icon = document.createElement('span');
    icon.className = 'slcl-state icon-selected';
    icon.setAttribute('role', 'button');
    link.appendChild(icon);
    selectedTag = link;
  };

  /*
  * Finish the tag edition, check if we have a custom
  * tag selected or use the predefined ones
  */
  var doneTag = function doneTag() {
    if (!selectedTag && customTag.value.length > 0 && contactTag) {
      contactTag.textContent = customTag.value;
    }
    contactTag = null;
    this.goBack();
  };

  var sendSms = function sendSms(number) {
    if (!ActivityHandler.currentlyHandling)
      SmsIntegration.sendSms(number);
  }

  var callOrPick = function callOrPick(number) {
    if (ActivityHandler.currentlyHandling) {
      ActivityHandler.postPickSuccess(number);
    } else {
      try {
        var activity = new MozActivity({
          name: 'dial',
          data: {
            type: 'webtelephony/number',
            number: number
          }
        });
      } catch (e) {
        console.log('WebActivities unavailable? : ' + e);
      }
    }
  }

  var showAdd = function showAdd(params) {
    if (!params || params == -1 || !('id' in params)) {
      currentContact = {};
    }
    resetForm();
    saveButton.setAttribute('disabled', 'disabled');
    deleteContactButton.classList.add('hide');
    formTitle.innerHTML = _('addContact');

    params = params || {};

    givenName.value = params.giveName || '';
    familyName.value = params.lastName || '';
    company.value = params.company || '';

    var paramsMapping = {
      'tel' : insertPhone,
      'email' : insertEmail,
      'address' : insertAddress,
      'note' : insertNote
    };
    formTitle.innerHTML = _('addContact');

    for (var i in paramsMapping) {
      paramsMapping[i].call(this, params[i] || 0);
    }
    checkDisableButton();
    edit();
  };

  var toggleFavorite = function toggleFavorite() {
    var favorite = !isFavorite(currentContact);
    toggleFavoriteMessage(favorite);
    if (favorite) {
      currentContact.category = currentContact.category || [];
      currentContact.category.push('favorite');
    } else {
      if (!currentContact.category) {
        return;
      }
      var pos = currentContact.category.indexOf('favorite');
      if (pos > -1) {
        delete currentContact.category[pos];
      }
    }

    var request = navigator.mozContacts.save(currentContact);
    request.onsuccess = function onsuccess() {
      var cList = contacts.List;
      cList.getContactById(currentContact.id, function onSuccess(savedContact) {
        currentContact = savedContact;
        contactsList.refresh(currentContact);
        reloadContactDetails();
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
  }

  var deleteContact = function deleteContact(contact) {
    var request = navigator.mozContacts.remove(currentContact);
    request.onsuccess = function successDelete() {
      contactsList.remove(currentContact.id);
      currentContact = {};
      navigation.home();
    };
    request.onerror = function errorDelete() {
      console.error('Error removing the contact');
    };
  };

  var saveContact = function saveContact() {
    saveButton.setAttribute('disabled', 'disabled');
    var myContact = {
      id: document.getElementById('contact-form-id').value,
      additionalName: '',
      name: ''
    };

    var inputs = {
      'givenName': givenName,
      'familyName': familyName,
      'org': company
    };

    for (field in inputs) {
      var value = inputs[field].value;
      if (value && value.length > 0) {
        myContact[field] = [value];
      } else {
        myContact[field] = null;
      }
    }

    var fields = ['photo', 'category'];

    for (var i = 0; i < fields.length; i++) {
      var currentField = fields[i];
      if (currentContact[currentField]) {
        myContact[currentField] = currentContact[currentField];
      }
    }

    if (myContact.givenName || myContact.familyName) {
      var name = myContact.givenName || '';
      name += ' ';
      if (myContact.familyName) {
        name += myContact.familyName;
      }
      myContact.name = [name];
    }

    getPhones(myContact);
    getEmails(myContact);
    getAddresses(myContact);
    getNotes(myContact);

    // Use the isEmpty function to check fields but address
    // and inspect address by it self.
    if (isEmpty(myContact, ['givenName', 'familyName', 'org', 'tel',
      'email', 'note', 'adr'])) {
      return;
    }

    var contact;
    if (myContact.id) { //Editing a contact
      currentContact.tel = [];
      currentContact.email = [];
      currentContact.adr = [];
      currentContact.note = [];
      currentContact.photo = [];
      for (var field in myContact) {
        currentContact[field] = myContact[field];
      }
      contact = currentContact;
    } else {
      contact = new mozContact();
      contact.init(myContact);
    }

    var request = navigator.mozContacts.save(contact);
    request.onsuccess = function onsuccess() {
      // Reloading contact, as it only allows to be updated once
      var cList = contacts.List;
      cList.getContactById(contact.id, function onSuccess(savedContact) {
        currentContact = savedContact;
        myContact.id = savedContact.id;
        myContact.photo = savedContact.photo;
        myContact.category = savedContact.category;
        contactsList.refresh(myContact);
        if (ActivityHandler.currentlyHandling) {
          ActivityHandler.postNewSuccess(myContact);
        } else {
          reloadContactDetails();
        }
        navigation.back();
      }, function onError() {
        console.error('Error reloading contact');
        if (ActivityHandler.currentlyHandling) {
          ActivityHandler.postCancel();
        }
      });
    };

    request.onerror = function onerror() {
      console.error('Error saving contact');
    }
  };

  var getPhones = function getPhones(contact) {
    var selector = '#view-contact-form form div.phone-template';
    var phones = document.querySelectorAll(selector);
    for (var i = 0; i < phones.length; i++) {
      var currentPhone = phones[i];
      var arrayIndex = currentPhone.dataset.index;
      var numberField = document.getElementById('number_' + arrayIndex);
      var numberValue = numberField.value;
      if (!numberValue)
        continue;

      var selector = 'tel_type_' + arrayIndex;
      var typeField = document.getElementById(selector).textContent || '';
      var notes = document.getElementById('notes_' + arrayIndex).value || '';
      contact['tel'] = contact['tel'] || [];
      // TODO: Save notes
      contact['tel'][i] = {
        number: numberValue,
        type: typeField
      };
    }
  };

  var getEmails = function getEmails(contact) {
    var selector = '#view-contact-form form div.email-template';
    var emails = document.querySelectorAll(selector);
    for (var i = 0; i < emails.length; i++) {
      var currentEmail = emails[i];
      var arrayIndex = currentEmail.dataset.index;
      var emailField = document.getElementById('email_' + arrayIndex);
      var emailValue = emailField.value;
      var selector = 'email_type_' + arrayIndex;
      var typeField = document.getElementById(selector).textContent || '';
      if (!emailValue)
        continue;

      contact['email'] = contact['email'] || [];
      contact['email'][i] = {
        address: emailValue,
        type: typeField
      };
    }
  };

  var getAddresses = function getAddresses(contact) {
    var selector = '#view-contact-form form div.address-template';
    var addresses = document.querySelectorAll(selector);
    for (var i = 0; i < addresses.length; i++) {
      var currentAddress = addresses[i];
      var arrayIndex = currentAddress.dataset.index;
      var addressField = document.getElementById('streetAddress_' + arrayIndex);
      var addressValue = addressField.value || '';

      var selector = 'address_type_' + arrayIndex;
      var typeField = document.getElementById(selector).textContent || '';
      selector = 'locality_' + arrayIndex;
      var locality = document.getElementById(selector).value || '';
      selector = 'postalCode_' + arrayIndex;
      var postalCode = document.getElementById(selector).value || '';
      selector = 'countryName_' + arrayIndex;
      var countryName = document.getElementById(selector).value || '';

      // Sanity check for pameters, check all params but the typeField
      if (addressValue == '' && locality == '' &&
          postalCode == '' && countryName == '') {
        continue;
      }

      contact['adr'] = contact['adr'] || [];
      contact['adr'][i] = {
        streetAddress: addressValue,
        postalCode: postalCode,
        locality: locality,
        countryName: countryName,
        type: typeField
      };
    }
  };

  var getNotes = function getNotes(contact) {
    var selector = '#view-contact-form form div.note-template';
    var notes = document.querySelectorAll(selector);
    for (var i = 0; i < notes.length; i++) {
      var currentNote = notes[i];
      var arrayIndex = currentNote.dataset.index;
      var noteField = document.getElementById('note_' + arrayIndex);
      var noteValue = noteField.value;
      if (!noteValue) {
        continue;
      }

      contact['note'] = contact['note'] || [];
      contact['note'].push(noteValue);
    }
  };

  var insertPhone = function insertPhone(phone) {
    var telField = {
      number: phone || '',
      type: TAG_OPTIONS['phone-type'][0].value,
      notes: '',
      i: numberPhones || 0
    };
    var template = utils.templates.render(phoneTemplate, telField);
    template.appendChild(removeFieldIcon(template.id));
    phonesContainer.appendChild(template);
    numberPhones++;
  };

  var insertEmail = function insertEmail(email) {
    var emailField = {
      address: email || '',
      type: TAG_OPTIONS['email-type'][0].value,
      i: numberEmails || 0
    };

    var template = utils.templates.render(emailTemplate, emailField);
    template.appendChild(removeFieldIcon(template.id));
    emailContainer.appendChild(template);
    numberEmails++;
  };

  var insertAddress = function insertAddress(address) {
    var addressField = {
      type: TAG_OPTIONS['address-type'][0].value,
      streetAddress: address || '',
      postalCode: '',
      locality: '',
      countryName: '',
      i: numberAddresses || 0
    };

    var template = utils.templates.render(addressTemplate, addressField);
    template.appendChild(removeFieldIcon(template.id));
    addressContainer.appendChild(template);
    numberAddresses++;
  };

  var insertNote = function insertNote(note) {
    var noteField = {
      note: note || '',
      i: numberNotes || 0
    };

    var template = utils.templates.render(noteTemplate, noteField);
    template.appendChild(removeFieldIcon(template.id));
    noteContainer.appendChild(template);
    numberNotes++;
  };

  var resetForm = function resetForm() {
    saveButton.removeAttribute('disabled');
    currentContactId.value = '';
    givenName.value = '';
    familyName.value = '';
    company.value = '';
    thumb.style.backgroundImage = '';
    var phones = document.getElementById('contacts-form-phones');
    var emails = document.getElementById('contacts-form-emails');
    var addresses = document.getElementById('contacts-form-addresses');
    var notes = document.getElementById('contacts-form-notes');
    phones.innerHTML = '';
    emails.innerHTML = '';
    addresses.innerHTML = '';
    notes.innerHTML = '';
    numberEmails = 0;
    numberPhones = 0;
    numberAddresses = 0;
    numberNotes = 0;
  };

  var removeFieldIcon = function removeFieldIcon(selector) {
    var delButton = document.createElement('button');
    delButton.className = 'fillflow-row-action';
    var delIcon = document.createElement('span');
    delIcon.setAttribute('role', 'button');
    delIcon.className = 'icon-delete';
    delButton.appendChild(delIcon);
    delButton.onclick = function removeElement(event) {
      event.preventDefault();
      var elem = document.getElementById(selector);
      elem.parentNode.removeChild(elem);
      return false;
    };
    return delButton;
  };

  var handleBack = function handleBack() {
    //If in an activity, cancel it
    var inActivity = ActivityHandler.currentlyHandling;
    if (inActivity && ActivityHandler.activityName == 'new') {
      ActivityHandler.postCancel();
    } else {
      navigation.back();
    }
  };

  var pickImage = function pickImage() {
    var activity = new MozActivity({
      name: 'pick',
      data: {
        type: 'image/jpeg'
      }
    });

    var reopenApp = function reopen() {
      navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
        var app = evt.target.result;
        app.launch();
      };
    };

    activity.onsuccess = function success() {
      reopenApp();
      var currentImg = this.result.filename;
      updateContactPhoto(currentImg);
    }

    activity.onerror = function error() {
      reopenApp();
    }
  }

  var updateContactPhoto = function updateContactPhoto(image) {
    if (!navigator.getDeviceStorage) {
      console.log('Device storage unavailable');
      return;
    }
    var storageAreas = navigator.getDeviceStorage('pictures');
    var storage = storageAreas[0] || storageAreas;
    var request = storage.get(image);
    request.onsuccess = function() {
      var img = document.createElement('img');
      var imgSrc = URL.createObjectURL(request.result);
      img.src = imgSrc;
      this.img = img;
      img.onload = function() {
        var dataImg = getPhoto(this.img);
        updatePhoto(dataImg, thumb);
        currentContact.photo = currentContact.photo || [];
        currentContact.photo[0] = dataImg;
      }.bind(this);
    };
    request.onerror = function() {
      console.log('Error loading img');
    };
  }

  var getPhoto = function getContactImg(contactImg) {
    // Checking whether the image was actually loaded or not
    var canvas = document.createElement('canvas');
    var ratio = 2.5;
    canvas.width = thumb.width * ratio;
    canvas.height = thumb.height * ratio;
    var ctx = canvas.getContext('2d');
    var widthBigger = contactImg.width > contactImg.height;
    var toCut = widthBigger ? 'width' : 'height';
    var toScale = widthBigger ? 'height' : 'width';
    var scaled = contactImg[toScale] / canvas[toScale];
    var scaleValue = 1 / scaled;
    ctx.scale(scaleValue, scaleValue);
    var margin = ((contactImg[toCut] / scaled) - canvas[toCut]) / 2;

    if (widthBigger) {
      ctx.drawImage(contactImg, -margin, 0);
    } else {
      ctx.drawImage(contactImg, 0, -margin);
    }
    var filename = 'contact_' + new Date().getTime();
    var ret = canvas.mozGetAsFile(filename);
    contactImg = null;
    canvas = null;
    return ret;
  }

  var sendEmailOrPick = function sendEmailOrPick(address) {
    if (ActivityHandler.currentlyHandling) {
      // Placeholder for the email app if we want to
      // launch contacts to select an email address.
      // So far we do nothing
    } else {
      try {
        // We don't check the email format, lets the email
        // app do that
        var activity = new MozActivity({
          name: 'new',
          data: {
            type: 'mail',
            URI: 'mailto:' + address
          }
        });
      } catch (e) {
        console.log('WebActivities unavailable? : ' + e);
      }
    }
  };

  return {
    'showEdit' : showEdit,
    'doneTag': doneTag,
    'showAdd': showAdd,
    'addNewPhone' : insertPhone,
    'addNewEmail' : insertEmail,
    'addNewAddress' : insertAddress,
    'addNewNote' : insertNote,
    'goBack' : handleBack,
    'goToSelectTag': goToSelectTag,
    'sendSms': sendSms,
    'saveContact': saveContact,
    'toggleFavorite': toggleFavorite,
    'callOrPick': callOrPick,
    'pickImage': pickImage,
    'navigation': navigation,
    'sendEmailOrPick': sendEmailOrPick,
    'updatePhoto': updatePhoto
  };
})();

if (window.navigator.mozSetMessageHandler) {
  var actHandler = ActivityHandler.handle.bind(ActivityHandler);
  window.navigator.mozSetMessageHandler('activity', actHandler);
}

document.addEventListener('mozvisibilitychange', function visibility(e) {
  if (document.mozHidden) {
    if (ActivityHandler.currentlyHandling)
      ActivityHandler.postCancel();
  }
});
