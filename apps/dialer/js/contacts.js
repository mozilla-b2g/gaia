
var Contacts = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('contacts-view');
  },
  init: function contactsInit() {
    // Could be much easier to have am argument named 'parameters' pass as
    // a second argument that I can omit
    this.find(['id', 'displayName'], this.show.bind(this));

    this.view.addEventListener('touchstart', function showSearch(evt) {
      Contacts.showSearch();
    });
  },
  find: function contactsFind(fields, callback) {
    // Ideally I would like to choose the ordering
    // It also misses simple constaints like the one you can pass to the
    // webSMS API
    window.navigator.mozContacts.find(fields, function findCallback(contacts) {
      contacts.sort(function contactsSort(a, b) {
        return a.name.familyName[0] > b.name.familyName[0];
      });
      callback(contacts);
    });
  },
  show: function contactsShow(contacts) {
    var content = '';
    var currentLetter = '';

    var count = contacts.length;
    for (var i = 0; i < count; i++) {
      var contact = contacts[i];
      var displayName = contact.displayName;
      var phoneNumber = contact.phones[0];

      var name = contact.name.familyName[0];
      if (currentLetter != name[0]) {
        currentLetter = name[0].toUpperCase();

        content += '<div id="' + currentLetter + '" class="contact-header">' +
                      currentLetter +
                   '</div>';
      }

      content += '<div class="contact" id="' + contact.id + '">' +
                 '  <span class="displayName">' + displayName + '</span>' +
                 '  <span class="phoneNumber">' + phoneNumber + '</span>' +
                 '</div>';
    }
    content += '<div class="contact" id="contact-create">' +
               '  <span>Create this contact</span>' +
               '</div>';

    var contactsContainer = document.getElementById('contacts-container');
    contactsContainer.innerHTML = content;
    this.filter();
  },
  hideSearch: function contactsHideSearch() {
    document.getElementById('contacts-search').value = '';
    this.filter();

    var searchContainer = document.getElementById('contacts-search-container');
    searchContainer.hidden = true;
    this.view.scrollTop = 0;
  },
  showSearch: function contactsHideSearch() {
    var oldScrollTop = this.view.scrollTop;

    var search = document.getElementById('contacts-search-container');
    if (!search.hidden)
      return;

    search.hidden = false;
    var searchHeight = search.getBoundingClientRect().height;
    this.view.scrollTop = oldScrollTop + searchHeight;
  },
  filter: function contactsFilter(value) {
    var container = document.getElementById('contacts-container');
    var contacts = container.children;

    var count = contacts.length;
    for (var i = 0; i < count; i++) {
      var contact = contacts[i];
      if (contact.className == 'contact-header')
        continue;

      var name = contact.firstElementChild.textContent;
      var rule = new RegExp(value, 'gi');
      contact.hidden = (name.search(rule) == -1);
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
    for (var j = 1; j < shortcuts.length; j++) {
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

    // Adding a create button when there is room for it without scrolling
    var viewHeight = this.view.getBoundingClientRect().height;
    var contentHeight = container.getBoundingClientRect().height;
    var available = viewHeight - contentHeight;
    if (available >= 56) {
      document.getElementById('contact-create').hidden = false;
    }
  },
  anchor: function contactsAnchor(targetId) {
    var target = document.getElementById(targetId);
    if (!target)
      return;

    var top = target.getBoundingClientRect().top;
    var scrollable = document.getElementById('contacts-view');
    scrollableTop = scrollable.getBoundingClientRect().top;
    scrollable.scrollTop = (top - scrollableTop) + scrollable.scrollTop;
  },
  showDetails: function contactsShowDetails(evt) {
    // I'm under the impression that there will be a better way to do this
    // with the final API (ie. getting a contact from an id)
    var contactId = evt.target.id;

    // creating a fresh contact with a pre-filled name
    if (contactId == 'contact-create') {
      var contact = {
        name: {
          familyName: [document.getElementById('contacts-search').value],
          givenName: []
        },
        phones: [],
        emails: []
      };
      ContactDetails.show(contact);
      return;
    }

    this.find(['id'], function showDetailCallback(contacts) {
      var results = contacts.filter(function finById(contact) {
        return (contact.id == contactId);
      });
      var contact = results[0];
      if (contact) {
        ContactDetails.show(contact);
      }
    });
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
  setup: function cd_setup() {
    window.addEventListener('keypress', this, true);
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
  get editButton() {
    delete this.editButton;
    return this.editButton = document.getElementById('contact-edit-button');
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
    this.container.classList.add('displayed');

    // directly entering the edit mode if this is a new contact
    if (!this._contact.id) {
      this.edit();
    }
  },
  hide: function cd_hide() {
    if (!this.container.classList.contains('displayed')) {
      return false;
    }

    this.container.classList.remove('displayed');
    this.endEditing();
    return true;
  },
  add: function cd_add(evt) {
    var parent = evt.currentTarget.parentNode;
    var type = '';
    switch (parent.id) {
      case 'contact-phones':
        type = 'tel';
        break;
      case 'contact-emails':
        type = 'email';
        break;
      default:
        break;
    }

    var newElement = document.createElement('div');
    newElement.innerHTML = this.inputFragment(type, '', false);
    parent.insertBefore(newElement, evt.currentTarget);

    newElement.querySelector('input').focus();
  },
  remove: function cd_remove(element) {
    element.parentNode.removeChild(element);
  },
  edit: function cd_edit() {
    if (this._editing) {
      return;
    }
    this._editing = true;

    this.smoothTransition((function cd_editTransition() {
      this.editButton.dataset.action = 'save';
      this.view.classList.add('editing');
      // making the fields editable
      var inputs = this.view.getElementsByTagName('input');
      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        input.disabled = false;
      }
    }).bind(this));
  },
  save: function cd_save() {
    // TODO: actually save the contact

    this.endEditing();
  },
  destroy: function cd_destroy() {
    // TODO: destroy the contact
    this.hide();
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

    this.smoothTransition((function cd_endEditingTransition() {
      this.editButton.dataset.action = 'edit';
      this.view.classList.remove('editing');
      // disabling the fields and cleaning up
      var inputs = this.view.getElementsByTagName('input');
      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        input.disabled = true;

        if (input.value.length == 0) {
          this.remove(input.parentNode);
        }
      }
    }).bind(this));
    return true;
  },
  // scrolling to the right position when one of the fields
  // takes focus
  autoscroll: function cd_autoscroll(event) {
    var element = event.currentTarget;
    var self = this;

    var scrollInPlace = function cd_autoscrollMove() {
      var bounds = element.getBoundingClientRect();
      var bottom = bounds.top + bounds.height;
      var yDelta = bottom - self.container.getBoundingClientRect().height;
      if (yDelta > 0) {
        self.container.scrollTop += yDelta;
      }
    };
    scrollInPlace();

    //also listening to the next resize for keyboard handling
    window.addEventListener('resize', function cd_afterResize() {
      window.removeEventListener('resize', cd_afterResize);

      scrollInPlace();
    });
  },

  // back button handling
  handleEvent: function cd_handleEvent(evt) {
    if (evt.type !== 'keypress' || evt.keyCode != evt.DOM_VK_ESCAPE) {
      return;
    }

    if (this.endEditing() || this.hide()) {
      evt.preventDefault();
    }
  },

  render: function cd_render() {
    var names = '';
    for (var key in this._contact.name) {
      names += '<div>' +
               '  ' + this.inputFragment('text', this._contact.name[key]) +
               '</div>';
    }
    document.getElementById('contact-name').innerHTML = names;

    var addAttr = 'data-action="add" onclick="ContactDetails.execute(event)"';
    var phones = '';
    this._contact.phones.forEach(function phoneIterator(phone) {
      phones += '<div data-number="' + phone + '">' +
                '  ' + this.inputFragment('tel', phone) +
                '</div>';
    }, this);
    phones += '<div ' + addAttr + '>' +
              '  Add phone' +
              '</div>';
    document.getElementById('contact-phones').innerHTML = phones;

    var emails = '';
    this._contact.emails.forEach(function emailIterator(email) {
      emails += '<div>' + this.inputFragment('email', email) + '</div>';
    }, this);
    emails += '<div ' + addAttr + '>' +
              '  Add email' +
              '</div>';
    document.getElementById('contact-emails').innerHTML = emails;
  },
  inputFragment: function cd_inputFragment(type, value, disabled) {
    disabled = (typeof disabled == 'undefined') ? true : disabled;

    return '<div class="delete-button"' +
           '  onclick="ContactDetails.remove(this.parentNode)">' +
           '</div>' +
           '<input type="' + type + '" value="' + value +
           '  " data-action="autoscroll"' +
           '  ' + (disabled ? 'disabled="disabled"' : '') +
           '  onfocus="ContactDetails.execute(event)" />';
  },
  smoothTransition: function cd_smoothTransition(callback) {
    var detailsView = this.view;
    detailsView.classList.add('hidden');
    detailsView.addEventListener('transitionend', function cd_smoothFinish() {
      detailsView.removeEventListener('transitionend', cd_smoothFinish);

      callback();

      detailsView.classList.remove('hidden');
    });
  }

};

window.addEventListener('load', function contactsLoad(evt) {
  window.removeEventListener('load', contactsLoad, true);
  Contacts.init();
}, true);

window.addEventListener('load', function contactSetup(evt) {
  window.removeEventListener('load', contactSetup);
  ShortcutsHandler.setup();
  ContactDetails.setup();
});
