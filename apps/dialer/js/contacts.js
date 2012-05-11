'use strict';

var Contacts = {
  _loaded: false,
  get view() {
    delete this.view;
    return this.view = document.getElementById('contacts-view-scrollable');
  },

  setup: function contactsSetup() {
    document.getElementById('contacts').addEventListener('change',
      (function contactTabChanged(evt) {
        // loading contacts the first time the view appears
        this.load();

        ContactDetails.hide();
      }).bind(this));
  },

  load: function contactsLoad() {
    if (this._loaded) {
      return;
    }

    this.find(this.show.bind(this));
  },

  reload: function contactsReload() {
    this._loaded = false;
    this.load();
  },

  find: function contactsFind(callback) {
    var options = {
      sortBy: 'familyName',
      sortOrder: 'ascending'
    };
    var request = window.navigator.mozContacts.find(options);
    request.onsuccess = function findCallback() {
      var contacts = request.result;
      callback(contacts);
    };
  },

  findByNumber: function findByNumber(number, callback) {
    var options = {
      filterBy: ['tel'],
      filterOp: 'contains',
      filterValue: number
    };
    var request = window.navigator.mozContacts.find(options);
    request.onsuccess = function findCallback() {
      if (request.result.length == 0)
        return;

      var contacts = request.result;
      callback(contacts[0]);
    };
  },

  show: function contactsShow(contacts) {
    var content = '';
    var currentLetter = '';

    var count = contacts.length;
    for (var i = 0; i < count; i++) {
      var contact = contacts[i];

      var name = contact.familyName[0];
      var letter = name ? name[0].toUpperCase() : '';
      if (currentLetter != letter) {
        currentLetter = letter;

        content += '<div id="' + currentLetter + '" class="contact-header">' +
                   '<span>' +
                      currentLetter +
                   '</span></div>';
      }

      content += '<div class="contact" id="' + contact.id + '">';
      content += '<span>' + contact.givenName + '</span> ';
      content += '<span>' + contact.familyName + '</span>';
      content += '</div>';
    }

    var contactsContainer = document.getElementById('contacts-container');
    contactsContainer.innerHTML = content;
    this.filter();

    this._loaded = true;
  },

  filter: function contactsFilter(value) {
    var pattern = new RegExp(value, 'i');
    var container = document.getElementById('contacts-container');
    var contacts = container.children;

    var count = contacts.length;
    for (var i = 0; i < count; i++) {
      var contact = contacts[i];
      if (contact.className == 'contact-header')
        continue;

      contact.hidden = !pattern.test(contact.textContent);
    }

    // If there is 0 childs for a particular letter, hide it.
    var enabledLetters = [];
    for (var i = 0; i < count; i++) {
      var contactHeader = contacts[i];
      if (contactHeader.className != 'contact-header')
        continue;

      var nextSibling = contactHeader.nextSibling;
      while (nextSibling && nextSibling.className == 'contact') {
        if (!nextSibling.hidden) {
          enabledLetters.push(contactHeader.id);
          break;
        }
        nextSibling = nextSibling.nextSibling;
      }
    }

    // Reflect the change in the shortcut letter
    var shortcuts = document.getElementById('contacts-shortcuts').children;
    for (var j = 0; j < shortcuts.length; j++) {
      var shortcut = shortcuts[j];
      var targetId = shortcut.name;
      var header = document.getElementById(targetId);

      var disabled = (enabledLetters.indexOf(targetId) == -1);
      if (header && disabled) {
        shortcut.setAttribute('data-disabled', 'true');
        header.hidden = true;
      } else if (disabled) {
        shortcut.setAttribute('data-disabled', 'true');
      } else {
        shortcut.removeAttribute('data-disabled');
        header.hidden = false;
      }
    }
  },

  anchor: function contactsAnchor(targetId) {
    var target = document.getElementById(targetId);
    if (!target)
      return;

    var top = target.getBoundingClientRect().top;
    var scrollable = document.getElementById('contacts-view-scrollable');
    var scrollableTop = scrollable.getBoundingClientRect().top;
    scrollable.scrollTop = (top - scrollableTop) + scrollable.scrollTop;
  },

  showDetails: function contactsShowDetails(evt) {
    var contactId = evt.target.id;

    var options = {
      filterBy: ['id'],
      filterOp: 'equals',
      filterValue: contactId
    };
    var request = window.navigator.mozContacts.find(options);
    request.onsuccess = function findCallback() {
      if (request.result == 0)
        return;

      var contacts = request.result;
      ContactDetails.show(contacts[0]);
    };
  },

  create: function contactsCreate() {
    // creating an empty contact
    var contact = new mozContact();
    contact.init({tel: '', email: ''});

    ContactDetails.show(contact);
  }
};

var ShortcutsHandler = {
  setup: function sh_setup() {
    ['touchstart', 'touchmove', 'touchend'].forEach((function(evt) {
      this.shortcutsBar.addEventListener(evt, this, true);
    }).bind(this));
  },

  get shortcutsBar() {
    delete this.shortcutsBar;
    return this.shortcutsBar = document.getElementById('contacts-shortcuts');
  },

  get shortcutsBackground() {
    delete this.shortcutsBackground;
    var id = 'contacts-shortcuts-background';
    return this.shortcutsBackground = document.getElementById(id);
  },

  handleEvent: function sh_handleEvent(evt) {
    // preventing the events from bubbling to the contacts list
    evt.preventDefault();

    switch (evt.type) {
      case 'touchstart':
        this.startTracking();
      case 'touchmove': // fall through
        this.anchorForPosition(evt.targetTouches[0].clientY);
        break;

      case 'touchend':
        this.stopTracking();
        break;
    }
  },

  startTracking: function sh_startTracking() {
    this.shortcutsBackground.classList.add('tracking');

    // we keep a reference to the horizontal center of the zone
    // it allows us to keep anchoring correctly if the user gets
    // out of the zone while swiping
    var rect = this.shortcutsBar.getBoundingClientRect();
    this._positionX = rect.left + (rect.width / 2);
  },
  stopTracking: function sh_stopTracking() {
    this.shortcutsBackground.classList.remove('tracking');
    delete this._positionX;
  },
  anchorForPosition: function sh_anchorForPosition(positionY) {
    // only inspecting the vertical point of the touch
    var target = document.elementFromPoint(this._positionX, positionY).name;
    Contacts.anchor(target);
  }
};

var ContactDetails = {
  _editing: false,
  _lastFocusedInput: null,
  _keyboardDisplayed: false,

  setup: function cd_setup() {
    window.addEventListener('keyup', this, true);
    window.addEventListener('resize', this, true);

    // Binding to properly handle the return key
    var inputs = this.container.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].onkeypress = (function cd_inputKeyPress(event) {
        if (event.keyCode == event.DOM_VK_RETURN) {
          this.focusNextField();
          return false;
        }
        return true;
      }).bind(this);
    }

    // click outside details container to close
    this.overlay.addEventListener('click', function(evt) {
      ContactDetails.hide();
    });
    this.container.addEventListener('click', function(evt) {
      evt.stopPropagation();
    });
  },
  get overlay() {
    delete this.overlay;
    return this.overlay = document.getElementById('contacts-overlay');
  },
  get container() {
    delete this.container;
    return this.container =
      document.getElementById('contact-details-container');
  },
  get view() {
    delete this.view;
    return this.view = document.getElementById('contact-details-view');
  },

  get contactName() {
    delete this.contactName;
    return this.contactName = document.getElementById('contact-name');
  },
  get contactGivenNameField() {
    delete this.contactGivenNameField;
    var id = 'contact-given-name-field';
    return this.contactGivenNameField = document.getElementById(id);
  },
  get contactFamilyNameField() {
    delete this.contactFamilyNameField;
    var id = 'contact-family-name-field';
    return this.contactFamilyNameField = document.getElementById(id);
  },

  get contactPhone() {
    delete this.contactPhone;
    return this.contactPhone = document.getElementById('contact-phone');
  },
  get contactPhoneField() {
    delete this.contactPhoneField;
    var id = 'contact-phone-field';
    return this.contactPhoneField = document.getElementById(id);
  },

  get contactEmail() {
    delete this.contactEmail;
    return this.contactEmail = document.getElementById('contact-email');
  },
  get contactEmailField() {
    delete this.contactEmailField;
    var id = 'contact-email-field';
    return this.contactEmailField = document.getElementById(id);
  },

  set contact(contact) {
    delete this._contact;
    this._contact = contact;
    this.render();
  },

  execute: function cd_execute(evt) {
    var action = evt.currentTarget.dataset.action;
    if (!this[action]) {
      this.hide();
      return;
    }

    this[action](evt);
  },

  show: function cd_show(contact) {
    if (typeof contact != 'undefined') {
      this.contact = contact;
    }

    var overlay = this.overlay;
    overlay.classList.add('displayed');

    // directly entering the edit mode if this is a new contact
    var self = this;
    if (this._contact.id == 'undefined') {
      overlay.addEventListener('transitionend', function trWait() {
        overlay.removeEventListener('transitionend', trWait);
        self.edit();
      });
    }

    this.container.classList.add('displayed');
  },

  hide: function cd_hide() {
    if (!this.overlay.classList.contains('displayed')) {
      return false;
    }

    var overlay = this.overlay;
    var container = this.container;

    container.classList.remove('displayed');
    container.addEventListener('transitionend', function trWait() {
      container.removeEventListener('transitionend', trWait);

      overlay.classList.remove('displayed');
    });

    this.endEditing();
    return true;
  },

  edit: function cd_edit() {
    if (this._editing) {
      return;
    }
    this._editing = true;

    this.view.classList.add('editing');

    // setting a min-height in preparation for the keyboard appearance
    var minHeight = this.container.getBoundingClientRect().height;
    this.container.style.minHeight = minHeight + 'px';

    // keeping track of the size pre-keyboard appearance
    this._overlayHeight = this.overlay.getBoundingClientRect().height;
  },

  save: function cd_save(form) {
    if (form.checkValidity()) {
      var contact = this._contact;

      contact.givenName = this.contactGivenNameField.value;
      contact.familyName = this.contactFamilyNameField.value;
      contact.name = contact.givenName + ' ' + contact.familyName;

      if (this.contactPhoneField.value.length)
        contact.tel = [this.contactPhoneField.value];
      if (this.contactEmailField.value.length)
        contact.email = [this.contactEmailField.value];

      var req = navigator.mozContacts.save(contact);
      req.onsuccess = (function() {
        this.render();
        this.endEditing();
        Contacts.reload();
      }.bind(this));
    }
  },

  destroy: function cd_destroy(evt) {

    var req = navigator.mozContacts.remove(this._contact);
    req.onsuccess = (function() {
      this.render();
      this.hide();
      Contacts.reload();
    }.bind(this));

    evt.preventDefault();
  },

  call: function cd_call(evt) {
    if (this._editing) {
      return;
    }

    var number = evt.target.dataset.number;
    if (number) {
      CallHandler.call(number);
    }
  },

  endEditing: function cd_endEditing() {
    if (!this._editing) {
      return false;
    }
    this._editing = false;

    this.view.classList.remove('editing');
    return true;
  },

  // scrolling to the right position when one of the fields
  // takes focus
  autoscroll: function cd_autoscroll(event) {
    this._lastFocusedInput = event.currentTarget;
    var element = this.nextField(event.currentTarget);
    var self = this;

    var scrollInPlace = function cd_autoscrollMove() {
      element.scrollIntoView(false);
    };
    scrollInPlace();

    //also listening to the next resize for keyboard handling
    window.addEventListener('resize', function cd_afterResize() {
      window.removeEventListener('resize', cd_afterResize);

      scrollInPlace();
    });
  },

  focusNextField: function cd_focusNextField() {
    if (!this._editing)
      return;

    if (this._lastFocusedInput)
      this.nextField(this._lastFocusedInput).focus();
  },

  nextField: function cd_nextField(element) {
    // selecting the next input or the save button
    var nextGroup = element.parentNode.nextElementSibling;
    var nextElement = nextGroup.querySelector('input');
    if (nextElement) {
      element = nextElement;
    }

    return element;
  },

  // back button handling
  handleEvent: function cd_handleEvent(evt) {
    if (evt.type == 'resize') {
      //XXX: the keyboard resizes the frame before we get the ESCAPE
      // event. So _keyboardDisplayed is always false when we get it
      // if we don't add this timeout
      var keyboardDisplayed = (this._overlayHeight >
                               this.overlay.getBoundingClientRect().height);
      window.setTimeout((function() {
        this._keyboardDisplayed = keyboardDisplayed;
      }).bind(this), 300);
      return;
    }

    if (evt.type !== 'keyup' || evt.keyCode != evt.DOM_VK_ESCAPE) {
      return;
    }

    // If the user escaped just to remove the keyboard we stay
    // in edit mode
    if (this._keyboardDisplayed) {
      evt.preventDefault();
      return;
    }

    if (this.endEditing() || this.hide()) {
      evt.preventDefault();
    }
  },

  render: function cd_render() {
    var contact = this._contact;

    var names = '';
    names += contact.givenName || '';
    names += ' ' + (contact.familyName || '');
    this.contactName.innerHTML = names;

    this.contactGivenNameField.value =
      contact.givenName;
    this.contactFamilyNameField.value =
      contact.familyName;

    document.getElementById('contact-photo').innerHTML =
      '<img src="style/images/contact-placeholder.png" alt="profile" />';

    if (contact.tel) {
      this.contactPhone.querySelector('.value').innerHTML =
        contact.tel[0];
      this.contactPhone.dataset.number = contact.tel[0];

      this.contactPhoneField.value = contact.tel[0];
    }

    if (this._contact.email) {
      this.contactEmail.querySelector('.value').innerHTML =
        contact.email[0];

      this.contactEmailField.value = contact.email[0];
    }
  }
};

window.addEventListener('load', function contactSetup(evt) {
  window.removeEventListener('load', contactSetup);
  Contacts.setup();
  ShortcutsHandler.setup();
  ContactDetails.setup();
});
