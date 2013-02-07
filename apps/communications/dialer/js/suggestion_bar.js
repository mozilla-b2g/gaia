// Suggestion_bar.js will be loaded on init of KeypadManager through
// lazy loader. So we call its init() directly at the end of file.

'use strict';

var SuggestionBar = {
  MIN_DIGIT_TO_SHOW: 3,
  MAX_ITEMS: 10,

  _phoneNumber: null,
  _contactList: null,
  _loaded: false,

  // Visual Elements
  bar: document.getElementById('suggestion-bar'),
  countTag: document.getElementById('suggestion-count'),
  list: document.getElementById('suggestion-list'),
  overlay: document.getElementById('suggestion-overlay'),
  overlayCancel: document.getElementById('suggestion-overlay-cancel'),

  init: function sb_init() {
    this.overlay.addEventListener('click', this);
    this.bar.addEventListener('click', this);
    this.countTag.addEventListener('click', this.showOverlay.bind(this));
    this.overlayCancel.addEventListener('click', this.hideOverlay.bind(this));
    KeypadManager.onValueChanged = this.update.bind(this);
    this.overlay.hidden = false;
  },

  handleEvent: function sb_handleEvent(event) {
    var node = event.target;
    if (node.className == 'suggestion-item') {
      event.stopPropagation();
      var telTag = node.querySelector('.tel');
      KeypadManager.updatePhoneNumber(telTag.textContent, 'begin', false);
      // If we are tapping from overlay, hide it
      KeypadManager.makeCall();
    }
  },

  update: function sb_update(number) {
    this._phoneNumber = number;
    if (number.length < this.MIN_DIGIT_TO_SHOW) {
      this.clear();
      return;
    }
    if (this._loaded) {
      this._updateByContacts();
    } else {
      var self = this;
      LazyLoader.load(['/dialer/js/contacts.js',
                       '/shared/js/simple_phone_matcher.js'],
      function callback() {
        self._loaded = true;
        self._updateByContacts();
      });
    }
  },

  _updateByContacts: function sb_updateByContacts(onempty) {
    var self = this;
    //Search Contact list
    Contacts.findListByNumber(self._phoneNumber, this.MAX_ITEMS,
    function callback(contacts) {
      if (!Array.isArray(contacts) || contacts.length < 1) {
        self.bar.dataset.lastId = '';
        self.clear();
        if (onempty) {
          onempty();
        }
        return;
      }

      self.bar.hidden = false;
      self.countTag.textContent =
        (contacts.length < self.MAX_ITEMS) ?
        contacts.length : (self.MAX_ITEMS + '+');
      if (contacts.length > 1) {
        self.countTag.classList.add('more');
      } else {
        self.countTag.classList.remove('more');
      }

      // Store contacts for constructing multiple suggestions.
      self._contactList = contacts;

      var node = self.bar.querySelector('.suggestion-item');
      var contact = contacts[0];
      self._fillContacts(node, contact);
      // If the matched contact doesn't change, don't update photo
      // to prevent flashing.
      if (contact.id !== self.bar.dataset.lastId) {
        self._setAvatar(node, contact);
      }

      self.bar.dataset.lastId = contact.id;
    });
  },

  _fillContacts: function sb_fillContacts(node, contact) {
    var tel = contact.tel;
    var sanitized;
    // Find matched number from all numbers of the contact.
    for (var i = 0; i < tel.length; i++) {
      sanitized = SimplePhoneMatcher.sanitizedNumber(tel[i].value);
      if (sanitized.contains(this._phoneNumber)) {
        break;
      }
    }
    if (i == tel.length) {
      i = 0;
    }
    var markedNumber = this._markMatched(tel[i].value, this._phoneNumber);
    this._setItem(node, markedNumber, tel[i].type, contact.name[0]);
  },

  _createItem: function sb_createItem() {
    var template = document.getElementById('suggestion-item-template');
    var itemElm = template.cloneNode(true);
    itemElm.id = null;
    itemElm.hidden = false;
    this.list.appendChild(itemElm);
    return itemElm;
  },

  _setItem: function sb_setItem(node, tel, type, name) {
    var typeTag = node.querySelector('.tel-type');
    var telTag = node.querySelector('.tel');
    var nameTag = node.querySelector('.name');

    nameTag.textContent = name ? name : null;
    typeTag.textContent = type ? type : null;
    telTag.innerHTML = tel ? tel : null;
  },

  _setAvatar: function sb_setAvatar(node, contact) {
    var avatarTag = node.querySelector('.avatar');
    var photo;
    if (contact) {
      photo = contact.photo ? contact.photo[0] : null;
    } else {
      photo = null;
    }
    if (photo) {
      avatarTag.style.backgroundImage =
        'url(' + URL.createObjectURL(photo) + ')';
      avatarTag.classList.remove('hidden');
    } else {
      avatarTag.classList.add('hidden');
    }
  },

  clear: function sb_clear() {
    this.countTag.textContent = '';
    this.countTag.classList.remove('more');
    // Clear contents
    var node = this.bar.querySelector('.suggestion-item');
    this._setItem(node);
    this._setAvatar(node);
    this._contactList = null;
    this.bar.hidden = true;
    delete this.bar.dataset.lastId;
  },

  _markMatched: function sb_markMatched(str, substr) {
    var sanitized = SimplePhoneMatcher.sanitizedNumber(str);
    var digitBeforeMatch = sanitized.indexOf(substr);
    if (digitBeforeMatch == -1) {
      return str;
    }

    // Highlight matched number. We need to count formatting character in.
    // we already have sanitized match position above. Then we search from
    // head of str, count only valid digits to find corresponding start and
    // end position in origin str.
    var start = NaN;
    var end = NaN;
    var validDigits = 0;
    for (var i = 0; i < str.length; i++) {
      if (/^[\d\+*#]$/.test(str[i])) {
        validDigits++;
      }
      if ((validDigits > digitBeforeMatch) && isNaN(start)) {
        start = i;
      } else if (
          validDigits >= (digitBeforeMatch + substr.length) && isNaN(end)) {
        end = i;
      }
    }
    return str.substr(0, start) + '<span>' +
           str.substr(start, end - start + 1) + '</span>' + str.substr(end + 1);
  },

  showOverlay: function sb_showOverlay() {
    var maxItems = Math.min(
      this._contactList.length, this.MAX_ITEMS);
    var title = this.overlay.querySelector('header');
    var self = this;
    LazyL10n.get(function localized(_) {
      title.textContent = _('suggestionMatches', {
        n: maxItems,
        matchNumber: self._phoneNumber
      });
    });
    for (var i = 0; i < maxItems; i++) {
      var node = this._createItem();
      this._fillContacts(node, this._contactList[i]);
      this._setAvatar(node, this._contactList[i]);
    }
    this.overlay.classList.add('display');
  },

  hideOverlay: function sb_hideOverlay() {
    if (!this.overlay.classList.contains('display')) {
      return;
    }
    var self = this;
    this.overlay.classList.remove('display');
    self.list.innerHTML = '';
  }
};

SuggestionBar.init();
