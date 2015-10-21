/* global _, Browser, BrowserDB, MozActivity */

'use strict';

/**
 * Browser app search_result
 * @namespace SearchResult
 */
var SearchResult = {

  listTemplate: null,
  searchResultTemplate: null,
  allResult: null,
  updateInProgress: false,
  pendingUpdateFilter: null,

  /**
   * Intialise SearchResult.
   */
  init: function result_init() {
    /* get Element */
    this.getAllElements();

    /* Event Listener */
    window.addEventListener('click', this);

    // Create template elements
    this.listTemplate = this.createList();
    this.searchResultTemplate = this.createSearchTemplate();
  },

  /**
   * CamelCase (xxx-yyy -> xxxYyy)
   */
  toCamelCase: function toCamelCase(str) {
    return str.replace(/-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  },

  /**
   * Get All Elements (from id)
   */
  getAllElements: function result_getAllElements() {
    var elementIDs = [
      'search-result', 'search-result-list',
    ];

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[this.toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  show: function result_show() {
    this.searchResult.classList.add('visible');
    this.handleSearchResultFormInput(null);
  },

  hide: function result_hide() {
    var list = this.searchResultList.firstElementChild;
    if( list ) this.searchResultList.removeChild(list);
    this.searchResult.classList.remove('visible');
    Toolbar.setSearchBarStyle('false');
  },

  isDisplayed: function result_isDisplayed() {
    return this.searchResult.classList.contains('visible');
  },

  /**
    * Submit search form
    */
  handleSearchResultFormInput: function result_handleSearchResultFormInput(ev) {
    if( ev ) ev.preventDefault();
    this.resultUpdate(Toolbar.searchInput.value);
  },

  handleSearchResultFormSubmit: function result_handleSearchResultFormSubmit(ev) {
    if( ev ) ev.preventDefault();
  },

  createList: function result_createList() {
    var list = document.createElement('ul');
    list.classList.add('result-box');
    return list;
  },

  createSearchTemplate: function result_createSearchTemplate() {
    var template = document.createElement('li');
    template.classList.add('result-item');
    var link = document.createElement('div');
    link.classList.add('result-base');
    var title = document.createElement('div');
    title.classList.add('result-title');
    var url = document.createElement('div');
    url.classList.add('result-url');

    link.appendChild(title);
    link.appendChild(url);
    template.appendChild(link);

    return template;
  },

  resultUpdate: function result_resultUpdate(filter) {
    // If an update is already in progress enqueue the following ones
    if (this.updateInProgress) {
      this.pendingUpdateFilter = filter;
      return;
    } else {
      this.updateInProgress = true;
    }

    this.allResult = [];
    BrowserDB.getBookmarks((function(bookmarks) {
      this.resultFiltering(filter, bookmarks);
      BrowserDB.getHistory((function(history) {
        this.resultFiltering(filter, history);
        this.populateResults(filter);

        this.updateInProgress = false;
        var pendingUpdateFilter = this.pendingUpdateFilter;
        if (pendingUpdateFilter !== null) {
          this.pendingUpdateFilter = null;
          this.resultUpdate(pendingUpdateFilter);
        }
      }).bind(this));
    }).bind(this));
  },

  resultFiltering: function result_resultFiltering(filter, data) {
    if(( filter == '' ) || ( data == null )) return;

    for( var i = 0 ; i < data.length ; i ++ ) {
      var current = data[i];
      var matched = false;
      if( filter ) {
        matched = this.matchesFilter(current.uri, filter) ||
          this.matchesFilter(current.title, filter);
      }
      if( matched || !filter ) {
        var j = 0;
        for( ; j < this.allResult.length ; j ++ ) {
          if( this.allResult[j].uri === current.uri ) {
            break;
          }
        }
        if( j == this.allResult.length ) {
          this.allResult.push(current);
        }
      }
    }
  },

  /**
   * Check if the URI matches the regular expression filter.
   * @param {String} uri
   * @param {String} filter
   * @returns {Boolean}
   */
  matchesFilter: function result_matchesFilter(uri, filter) {
    if( !uri ) return false;
    return uri.match(new RegExp(filter, 'i')) !== null;
  },

  populateResults: function result_populateResults(filter) {
    var list = this.createList();
    var engine = SearchUtil.getCurrentEngineName();
    if( engine ) {
      var result = this.searchResultTemplate.cloneNode(true);
      var title = result.childNodes[0].childNodes[0];
      // title.innerHTML = 'Search by ' + engine;
      title.innerHTML = _('WB_LT_TIPS_S_SEARCH', {value0:engine});
      var uri = result.childNodes[0].childNodes[1];
      uri.innerHTML = Browser.getSearchFromInput(filter);
      list.appendChild(result);
      result.addEventListener('mouseup',
        this.handleResultSelect.bind(this));
    }

    for( var i = 0 ; i < this.allResult.length ; i ++ ) {
      var result = this.searchResultTemplate.cloneNode(true);
      var title = result.childNodes[0].childNodes[0];
      title.innerHTML = this.allResult[i].title;
      var uri = result.childNodes[0].childNodes[1];
      uri.innerHTML = this.allResult[i].uri;
      list.appendChild(result);
      result.addEventListener('mouseup',
        this.handleResultSelect.bind(this));
    }
    var oldList = this.searchResultList.firstElementChild;

    if (oldList) {
      this.searchResultList.replaceChild(list, oldList);
    } else {
      this.searchResultList.appendChild(list);
    }
  },

  /**
   * handle event
   */
  handleEvent: function result_handleEvent(ev) {
    switch(ev.type) {
      case 'click':
        break;

      default:
        break;
    }
  },

  handleResultSelect: function result_handleResultSelect(ev) {
    if( !ev ) return;
    ev.preventDefault();
    if(( ev.target.lastChild.lastChild.textContent != '' ) ||
       ( ev.target.lastChild.lastChild.textContent != undefined )) {
      var url = ev.target.lastChild.lastChild.textContent;
      Browser.navigate(url);
      this.hide();
    }
  },

  /**
   * Handle Key Event.
   */
  handleKeyEvent: function result_handleKeyEvent(ev) {
    // in the input area focus (= display keyboard)
    if(document.activeElement.nodeName == 'INPUT') {
      return;
    }
    switch( ev.keyCode ) {
      case KeyEvent.DOM_VK_BACK_SPACE :
        this.hide();
        break;
    }
  }
};

