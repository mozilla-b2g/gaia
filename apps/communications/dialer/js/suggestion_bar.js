/* globals CallHandler, Contacts, fb, KeypadManager, LazyL10n, LazyLoader,
           SimplePhoneMatcher */

// Suggestion_bar.js will be loaded on init of KeypadManager through
// lazy loader. So we call its init() directly at the end of file.

'use strict';

var SuggestionBar = {
  MIN_DIGIT_TO_SHOW: 3,
  SKIP_FOR_COUNTRYCODE: 2,
  MAX_ITEMS: 10,

  _phoneNumber: null,
  _contactList: null,
  _loaded: false,

  _pendingFbRequest: null,
  _hasMatchingFbContacts: false,
  _hasMatchingLocalContacts: false,

  // Visual Elements
  bar: null,
  barSuggestionItem: null,
  countTag: null,
  list: null,
  overlay: null,
  overlayCancel: null,
  template: null,

  init: function sb_init() {
    // When the DOM is absent (in the call screen) we don't need
    // to initialize the module.
    this.overlay = document.getElementById('suggestion-overlay');
    if (!this.overlay) {
      return;
    }

    this.bar = document.getElementById('suggestion-bar');
    this.barSuggestionItem = this.bar.querySelector('.js-suggestion-item');
    this.countTag = document.getElementById('suggestion-count');
    this.template = document.getElementById('suggestion-item-template');

    this.overlay.addEventListener('click', this);
    this.bar.addEventListener('click', this);
    this.countTag.addEventListener('click', this.showOverlay.bind(this));
    KeypadManager.onValueChanged = this.update.bind(this);
  },

  handleEvent: function sb_handleEvent(event) {
    var node = event.target;
    if (!node.classList.contains('js-suggestion-item')) {
      return;
    }

    event.stopPropagation();
    var telTag = node.querySelector('.js-tel');
    KeypadManager.updatePhoneNumber(telTag.textContent, 'begin', false);
    // In the multi-SIM case, we just autocomplete the phone number without
    // making the call. The call button is responsible for SIM selection
    // behavior.
    if (!navigator.mozIccManager ||
        navigator.mozIccManager.iccIds.length < 2) {
      CallHandler.call(KeypadManager.phoneNumber(), 0);
    } else {
      this.hideOverlay();
    }
  },

  update: function sb_update(number) {
    this._phoneNumber = number;

    // when first letter of number is "+", we'll change minimum search criteria
    // from MIN_DIGIT_TO_SHOW to MIN_DIGIT_TO_SHOW + SKIP_FOR_COUNTRYCODE.
    var min = this.MIN_DIGIT_TO_SHOW +
              ((number.charAt(0) === '+') ? this.SKIP_FOR_COUNTRYCODE : 0);

    if (number.length < min) {
      this.clear(true);
      return;
    }
    if (this._loaded) {
      this._updateByContacts();
      return;
    }

    var self = this;
    LazyLoader.load(['/shared/js/async_storage.js',
                     '/shared/js/dialer/contacts.js',
                     '/shared/js/simple_phone_matcher.js',
                     this.barSuggestionItem,
                     this.template],
    function callback() {
      self._loaded = true;
      self._updateByContacts();
    });
  },

  _renderBar: function sb_renderBar() {
    var self = this;

    self.bar.hidden = false;

    // Create matching index table for reference
    self._allMatched = self._getAllMatched(self._contactList);
    var totalMatchNum = self._allMatched.totalMatchNum;

    var contact = self._contactList[0];
    var firstMatch = self._allMatched.allMatches[0][0];

    // In a multi-SIM setup, tapping on a suggestion in the settings bar doesn't
    // place a call, it just fills in the phone number. In this case, we should
    // hide the suggestions bar to not confuse the user into thinking that
    // tapping it again will place the call.
    if (totalMatchNum === 1 &&
        contact.tel[firstMatch].value == self._phoneNumber &&
        navigator.mozIccManager &&
        navigator.mozIccManager.iccIds.length > 1) {
        self.bar.hidden = true;
      return 0;
    }

    self.countTag.textContent =
      (totalMatchNum < self.MAX_ITEMS) ?
      totalMatchNum : (self.MAX_ITEMS + '+');

    self.countTag.hidden = (totalMatchNum <= 1);
    self.countTag.classList.toggle('more', (totalMatchNum > 1));

    var node = self.barSuggestionItem;
    self._fillContacts(contact, firstMatch, node);
    self.bar.dataset.lastId = contact.id || contact.uid;

    return totalMatchNum;
  },

  _checkIfCleared: function sb_checkIfCleared() {
    var out = false;

    if (!this._phoneNumber) {
      this.bar.dataset.lastId = '';
      this.clear(true);
      out = true;
    }
    return out;
  },

  _searchCallback: function sb_searchCallback(contacts) {
    var self = this;

    self._pendingFbRequest = null;

    if (self._checkIfCleared()) {
      return;
    }

    var totalMatchNum = 0;

    if (Array.isArray(contacts) && contacts.length > 0) {
      self._contactList = contacts.slice(0, self.MAX_ITEMS);
      totalMatchNum = self._renderBar();
      self._hasMatchingLocalContacts = true;
    }
    else {
       // Avoid to clear the list if we have previous FB Contacts
       // This will avoid continous reflows while refreshing
      if (!self._hasMatchingFbContacts ||
            (self._hasMatchingFbContacts && self._hasMatchingLocalContacts)) {
        self.clear(false);
      }
      self._hasMatchingLocalContacts = false;
      self._contactList = null;
    }

    if (totalMatchNum >= self.MAX_ITEMS) {
      self._hasMatchingFbContacts = false;
      return;
    }

    var req = fb.contacts.search('phone', self._phoneNumber);
    self._pendingFbRequest = req;

    req.onsuccess = function() {
      // Avoid to overlap FB requests
      if (self._pendingFbRequest === req) {
        self._pendingFbRequest = null;
        self._searchCallbackFb(req.result);
      }
    };
    req.onerror = function() {
      window.console.error('Error while searching FB Data: ', req.error.name);
      self._hasMatchingFbContacts = false;
    };
  },

  _searchCallbackFb: function sb_searchCallbackFb(contacts) {
    if (this._checkIfCleared()) {
      return;
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      this._hasMatchingFbContacts = false;
      if (!this._hasMatchingLocalContacts) {
        this.clear(true);
      }
      return;
    }

    this._hasMatchingFbContacts = true;
    this._contactList = this._contactList || [];
    var toBeAdded = contacts.slice(0, this.MAX_ITEMS -
                                     this._contactList.length);
    this._contactList = this._contactList.concat(toBeAdded);
    this._renderBar();
  },

  _updateByContacts: function sb_updateByContacts() {
    // A search is both launched on mozContacts and on Facebook DS
    Contacts.findListByNumber(this._phoneNumber, this.MAX_ITEMS,
                              this._searchCallback.bind(this));
  },

  _fillContacts: function sb_fillContacts(contact, matchLocal, node) {

    // if first letter of query is '+' and first letter of matchedTel isn't '+'
    // we use query without country code instead of original query for
    // markedNumber.
    var matchedTel = contact.tel[matchLocal];

    var markedNumber = this._markMatched(matchedTel.value, this._phoneNumber);
    this._setItem(node, markedNumber, matchedTel.type,
                  contact.name[0]);
  },

  _createItem: function sb_createItem() {
    var itemElm = this.template.cloneNode(true);
    itemElm.removeAttribute('id');
    itemElm.hidden = false;
    itemElm.classList.add('si--action-menu');
    this.list.insertBefore(itemElm, this.overlayCancel);
    return itemElm;
  },

  _setItem: function sb_setItem(node, tel, type, name) {
    var typeTag = node.querySelector('.js-tel-type');
    var telTag = node.querySelector('.js-tel');
    var nameTag = node.querySelector('.js-name');
    nameTag.textContent = name ? name : null;
    LazyL10n.get(function localized(_) {
      typeTag.textContent = _(type) || type;
    });
    telTag.innerHTML = tel ? tel : null;
  },

  clear: function sb_clear(isHardClear) {
    if (!this._loaded) {
      return;
    }
    this.countTag.textContent = '';
    this.countTag.classList.remove('more');
    // Clear contents
    var node = this.barSuggestionItem;
    this._setItem(node);
    this._contactList = null;
    this.bar.hidden = true;

    if (isHardClear) {
      this._phoneNumber = null;
      delete this.bar.dataset.lastId;
    }
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
      } else if (validDigits >= (digitBeforeMatch + substr.length) &&
                 isNaN(end)) {
        end = i;
      }
    }
    return str.substr(0, start) + '<mark class="si__mark">' +
           str.substr(start, end - start + 1) + '</mark>' + str.substr(end + 1);
  },

  _initOverlay: function() {
    if (this.list) {
      return;
    }

    this.list = document.getElementById('suggestion-list');
    this.overlayCancel = document.getElementById('suggestion-overlay-cancel');
    this.overlayCancel.addEventListener('click', this.hideOverlay.bind(this));
  },

  _clearOverlay: function() {
    while (this.list.firstElementChild != this.overlayCancel) {
      this.list.firstElementChild.remove();
    }
  },

  showOverlay: function sb_showOverlay() {
    var self = this;
    LazyLoader.load(this.overlay, function() {
      self._initOverlay();
      self._clearOverlay();
      var maxItems = Math.min(self._contactList.length, self.MAX_ITEMS);
      var title = self.overlay.querySelector('header');
      LazyL10n.get(function localized(_) {
        title.textContent = _('suggestionMatches', {
          n: +self.countTag.textContent,
          matchNumber: self._phoneNumber
        });
      });
      for (var i = 0; i < maxItems; i++) {
        for (var j = 0; j < self._allMatched.allMatches[i].length; j++) {
          var node = self._createItem();
          self._fillContacts(self._contactList[i],
            self._allMatched.allMatches[i][j], node);
        }
      }
      self.overlay.setAttribute('aria-hidden', false);
      self.overlay.classList.add('display');
    });
  },

  _getAllMatched: function sb_getAllMatched(contacts) {
    var variants = SimplePhoneMatcher.generateVariants(this._phoneNumber);

    var contactTels = contacts.map(function getTels(contact) {
      return contact.tel.map(function getNumber(tel) {
        return tel.value;
      });
    });

    return SimplePhoneMatcher.bestMatch(variants, contactTels);
  },

  hideOverlay: function sb_hideOverlay() {
    this.overlay.setAttribute('aria-hidden', true);
    this.overlay.classList.remove('display');
  }
};

SuggestionBar.init();
