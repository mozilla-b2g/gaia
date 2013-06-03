'use strict';
var Customize = {
  DEFAULT_BOOKMARK: '000000',
  iccSettings: { mcc: '-1', mnc: '-1' },

  populateDefaultData: function browser_populateDefaultData() {
    console.log('Populating default data.');

    // Fetch default data
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/js/init.json', true);
    xhr.addEventListener('load', (function browser_defaultDataListener() {
      if (!(xhr.status === 200 | xhr.status === 0))
        return;

      var data = JSON.parse(xhr.responseText);
      if (data[Customize.DEFAULT_BOOKMARK]) { //has default bookmark
        Customize.getICCSettings(Customize.customizeDefaultBookmark, data);
      } else {
        console.log('No default bookmark.');
      }

    }).bind(this), false);
    xhr.onerror = function getDefaultDataError() {
      console.log('Error getting default data.');
    };
    xhr.send();
  },
  // Read the mcc/mnc settings, then trigger callback.
  // pattern from system/js/operator_variant/operator_variant.js
  getICCSettings: function browser_getICCSettings(callback, data) {
    var transaction = navigator.mozSettings.createLock();
    var mccKey = 'operatorvariant.mcc';
    var mncKey = 'operatorvariant.mnc';

    var mccRequest = transaction.get(mccKey);
    mccRequest.onsuccess = function() {
      Customize.iccSettings.mcc = mccRequest.result[mccKey] || '0';
      var mncRequest = transaction.get(mncKey);
      mncRequest.onsuccess = function() {
        Customize.iccSettings.mnc = mncRequest.result[mncKey] || '0';
        callback(data);
      };
    };
  },

  addDefaultSearchEngines: function browser_addDefaultSearchEngines(data) {
    if (!data.search_engine) {
      // fallback to default
      asyncStorage.setItem('default_search_provider_url',
        Browser.DEFAULT_SEARCH_PROVIDER_URL);
      asyncStorage.setItem('default_search_provider_title',
        Browser.DEFAULT_SEARCH_PROVIDER_TITLE);
      asyncStorage.setItem('default_search_provider_icon',
        Browser.DEFAULT_SEARCH_PROVIDER_ICON);
    } else {
      // save search engine provider
      var default_item = data.search_engine;
      asyncStorage.setItem('default_search_provider_url',
        default_item['url']);
      Browser.DEFAULT_SEARCH_PROVIDER_URL = default_item['url'];
      asyncStorage.setItem('default_search_provider_title',
        default_item['title']);
      Browser.DEFAULT_SEARCH_PROVIDER_TITLE = default_item['title'];
      asyncStorage.setItem('default_search_provider_icon',
        default_item['iconUri']);
      Browser.DEFAULT_SEARCH_PROVIDER_ICON = default_item['iconUri'];
    }
  },

  addDefaultBookmarks: function browser_addDefaultBookmarks(data) {
    // Save bookmarks
    data.bookmarks.forEach(function saveDefaultBookmarks(bookmark) {
      Places.addBookmark(bookmark.uri, bookmark.title);
      if (bookmark.iconUri)
        Places.setAndLoadIconForPage(bookmark.uri, bookmark.iconUri);
    });
  },

  // pad leading zeros
  zfill: function browser_zfill(code, len) {
    var c = code;
    while (c.length < len) c = '0' + c;
    return c;
  },

  /* Match best bookmark setting by
   * 1. check carrier with region
   * 2. check carrier
   * 3. fallback to no SIM card case
   */
  customizeDefaultBookmark: function browser_customizeDefaultBookmark(data) {
    var DEFAULT_MNC = '000';
    var codename = Customize.DEFAULT_BOOKMARK; //fallback to no SIM card case
    var pad_mcc = Customize.zfill(Customize.iccSettings.mcc, 3);
    var pad_mnc = Customize.zfill(Customize.iccSettings.mnc, 3);
    if (data[pad_mcc + pad_mnc]) {
      codename = pad_mcc + pad_mnc;
    } else if (data[pad_mcc + DEFAULT_MNC]) {
      codename = pad_mcc + DEFAULT_MNC;
    }
    Customize.addDefaultBookmarks(data[codename]);
    Customize.addDefaultSearchEngines(data[codename]);
  }

};
