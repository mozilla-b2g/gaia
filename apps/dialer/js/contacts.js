
var Contacts = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('contacts-view');
  },
  get detailsView() {
    delete this.detailsView;
    return this.detailsView = document.getElementById('contactDetails-view');
  },
  init: function contactsInit() {
    // Could be much easier to have am argument named 'parameters' pass as
    // a second argument that I can omit
    this.find(['id', 'displayName'], this.show.bind(this));

    this.view.addEventListener('touchstart', function showSearch(evt) {
      Contacts.showSearch();
    });

    window.addEventListener('keypress', this, true);
  },
  handleEvent: function contactsHandleEvent(evt) {
    if (evt.type !== 'keypress') {
      return;
    }

    if (evt.keyCode != evt.DOM_VK_ESCAPE)
      return;

    if (this.hideDetails())
      evt.preventDefault();
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
    var contacts = document.getElementById('contacts-container').children;

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
    var contact;
    this.find(['id'], function showDetailCallback(contacts) {
      var results = contacts.filter(function finById(contact) {
        return (contact.id == contactId);
      });
      contact = results[0];
    });

    this.renderDetails(contact);
    this.detailsView.classList.add('displayed');
  },
  renderDetails: function renderDetails(contact) {
    var names = '<div>' + contact.name.familyName + '</div>' +
                        '<div>' + contact.name.givenName + '</div>';
    document.getElementById('contact-name').innerHTML = names;

    var phones = '';
    contact.phones.forEach(function phoneIterator(phone) {
      phones = '<div data-number=\"' + phone + '\">' + phone + '</div>';
    }, this);
    document.getElementById('contact-phones').innerHTML = phones;

    var emails = '';
    contact.emails.forEach(function emailIterator(email) {
      emails = '<div>' + email + '</div>';
    }, this);
    document.getElementById('contact-emails').innerHTML = emails;
  },
  callNumber: function contactsCallNumber(evt) {
    this.hideDetails();
    var number = evt.target.dataset.number;
    if (number) {
      CallHandler.call(number);
    }
  },
  hideDetails: function contactsHideDetails(evt) {
    if (!this.detailsView.classList.contains('displayed')) {
      return false;
    }

    this.detailsView.classList.remove('displayed');
    return true;
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
    return this.shortcutsBackground = document.getElementById('contacts-shortcuts-background');
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

window.addEventListener('load', function contactsLoad(evt) {
  window.removeEventListener('load', contactsLoad, true);
  Contacts.init();
}, true);

window.addEventListener('load', function shortcutsSetup(evt) {
  window.removeEventListener('load', shortcutsSetup);
  ShortcutsHandler.setup();
});
