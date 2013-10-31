/**
 *  Browser App Awesomescreen.
 */
var Awesomescreen = {

  DEFAULT_FAVICON: 'style/images/favicon.png',
  TOP_SITES_COUNT: 20,
  RESULT_CACHE_SIZE: 20,

  listTemplate: null,
  resultTemplate: null,
  searchTemplate: null,
  resultCache: {},

  /**
   * Initialise Awesomescreen.
   */
  init: function awesomescreen_init() {
    // DOM elements
    this.cancelButton = document.getElementById('awesomescreen-cancel-button');
    this.tabPanels = document.getElementById('tab-panels');
    this.tabHeaders = document.getElementById('tab-headers');
    this.topSitesTab = document.getElementById('top-sites-tab');
    this.topSites = document.getElementById('top-sites');
    this.bookmarksTab = document.getElementById('bookmarks-tab');
    this.bookmarks = document.getElementById('bookmarks');
    this.historyTab = document.getElementById('history-tab');
    this.history = document.getElementById('history');
    this.results = document.getElementById('results');

    // Add event listeners
    this.topSitesTab.addEventListener('click',
      this.selectTopSitesTab.bind(this));
    this.bookmarksTab.addEventListener('click',
      this.selectBookmarksTab.bind(this));
    this.historyTab.addEventListener('click', this.selectHistoryTab.bind(this));
    this.cancelButton.addEventListener('click',
      this.handleCancel.bind(this));
    this.results.addEventListener('click', this.handleClickResult.bind(this));
    this.tabPanels.addEventListener('click', this.handleClickResult.bind(this));

    // Create template elements
    this.resultTemplate = this.createResultTemplate();
    this.listTemplate = this.createList();
  },

  /**
   * Show Awesomescreen.
   */
  show: function awesomescreen_show() {
    this.results.classList.add('hidden');
    Browser.hideCurrentTab();
    Browser.tabsBadge.innerHTML = '';
    // Ensure the user cannot interact with the browser until the
    // transition has ended, this will not be triggered unless the
    // use is navigating from the tab screen.
    var pageShown = (function() {
      Browser.mainScreen.removeEventListener('transitionend', pageShown, true);
      Browser.inTransition = false;
    });
    Browser.mainScreen.addEventListener('transitionend', pageShown, true);
    Browser.switchScreen(Browser.AWESOME_SCREEN);
    var buttonMode = Browser.urlInput.value === '' ? null : Browser.GO;
    Browser.setUrlButtonMode(buttonMode);
    this.selectTopSitesTab();
  },

  /**
   * Handle clicks on the cancel button.
   *
   * @param {Event} e Click event.
   */
  handleCancel: function awesomescreen_handleCancel(e) {
    if (Browser.previousScreen === Browser.PAGE_SCREEN) {
      Browser.showPageScreen();
    } else {
      Browser.deleteTab(Browser.currentTab.id);
      Browser.showTabScreen();
    }
    Browser.updateSecurityIcon();
    this.clearResultCache();
  },

  /**
   * Select Top Sites tab.
   */
  selectTopSitesTab: function awesomescreen_selectTopSitesTab() {
    this.deselectTabs();
    this.topSitesTab.classList.add('selected');
    this.topSites.classList.add('selected');
    BrowserDB.getTopSites(this.TOP_SITES_COUNT, null,
      this.populateTopSites.bind(this));
  },

  /**
   * Show the list of Top Sites.
   *
   * @param {Array} topSites Array of top site data.
   */
  populateTopSites: function awesomescreen_populateTopSites(topSites) {
    this.topSites.innerHTML = '';
    var list = this.listTemplate.cloneNode(true);
    topSites.forEach(function(data) {
      list.appendChild(this.createListItem(data));
    }, this);
    this.topSites.appendChild(list);
  },

  /**
   * Select History tab.
   */
  selectHistoryTab: function awesomescreen_selectHistoryTab() {
    // Do nothing if we are already in the history tab
    if (this.historyTab.classList.contains('selected') &&
      this.history.classList.contains('selected')) {
      return;
    }

    this.deselectTabs();
    this.historyTab.classList.add('selected');
    this.history.classList.add('selected');
    BrowserDB.getHistory(this.populateHistory.bind(this));
  },

  /**
   * Show the list of history items.
   *
   * @param {Array} visits An array of visit data.
   */
  populateHistory: function awesomescreen_populateHistory(visits) {
    this.history.innerHTML = '';
    var thresholds = [
      new Date().valueOf(),              // 0. Now
      DateHelper.todayStarted(),         // 1. Today
      DateHelper.yesterdayStarted(),     // 2. Yesterday
      DateHelper.thisWeekStarted(),      // 3. This week
      DateHelper.thisMonthStarted(),     // 4. This month
      DateHelper.lastSixMonthsStarted(), // 5. Six months
      0                                  // 6. Epoch!
    ];
    var threshold = 0;
    var month = null;
    var year = null;
    var urls = []; // List of URLs under each heading for de-duplication

    var fragment = document.createDocumentFragment();
    visits.forEach(function awesomescreen_processVisit(visit) {
      var timestamp = visit.timestamp;
      // Draw new heading if new threshold reached
      if (timestamp > 0 && timestamp < thresholds[threshold]) {
        urls = [];
        threshold = this.incrementHistoryThreshold(timestamp, threshold,
          thresholds);
        // Special case for month headings
        if (threshold != 5)
          this.drawHistoryHeading(fragment, threshold);
      }
      if (threshold === 5) {
        var timestampDate = new Date(timestamp);
        if (timestampDate.getMonth() != month ||
          timestampDate.getFullYear() != year) {
          urls = [];
          month = timestampDate.getMonth();
          year = timestampDate.getFullYear();
          this.drawHistoryHeading(fragment, threshold, timestamp);
        }
      }
      // If not a duplicate, draw list item & add to list
      if (urls.indexOf(visit.uri) == -1) {
        urls.push(visit.uri);
        fragment.appendChild(this.createListItem(visit));
      }
    }, this);

    if (fragment.childNodes.length)
      this.history.appendChild(fragment);
  },

  /**
   * Draw heading to divide up history list.
   *
   * @param {Element} parent DOM element to append heading to.
   * @param {number} threshold Index of the current threshold (time period).
   * @param {number} timestamp Number of ms since epoch that page was visited.
   */
  drawHistoryHeading: function awesomescreen_drawHistoryHeading(parent,
    threshold, timestamp) {
    var LABELS = [
      'future',
      'today',
      'yesterday',
      'last-7-days',
      'this-month',
      'last-6-months',
      'older-than-6-months'
    ];

    var text = '';

    // Special case for month headings
    if (threshold == 5 && timestamp) {
      var date = new Date(timestamp);
      var now = new Date();
      text = _('month-' + date.getMonth());
      if (date.getFullYear() != now.getFullYear())
        text += ' ' + date.getFullYear();
    } else {
      text = _(LABELS[threshold]);
    }

    var h3 = document.createElement('h3');
    var textNode = document.createTextNode(text);
    var ul = this.listTemplate.cloneNode(true);
    h3.appendChild(textNode);
    parent.appendChild(h3);
    parent.appendChild(ul);
  },

  /**
   * Increment the history threshold (the next time period).
   *
   * @param {number} timestamp Timestamp of current visit being processed.
   * @param {number} currentThreshold Index of the current threshold.
   * @param {Array} thresholds The list of thresholds.
   * @return {number} New threshold (time period index).
   */
  incrementHistoryThreshold: function awesomescreen_incrementHistoryThreshold(
    timestamp, currentThreshold, thresholds) {
    var newThreshold = currentThreshold += 1;
    if (timestamp < thresholds[newThreshold]) {
      return awesomescreen_incrementHistoryThreshold(timestamp, newThreshold,
        thresholds);
    }
    return newThreshold;
  },

  /**
   * Select the Bookmarks tab.
   */
  selectBookmarksTab: function awesomescreen_selectBookmarksTab() {
    // Do nothing if we are already in the bookmarks tab
    if (this.bookmarksTab.classList.contains('selected') &&
      this.bookmarks.classList.contains('selected')) {
      return;
    }

    this.deselectTabs();
    this.bookmarksTab.classList.add('selected');
    this.bookmarks.classList.add('selected');
    BrowserDB.getBookmarks(this.populateBookmarks.bind(this));
  },

  /**
   * Show the list of bookmarks.
   *
   * @param {Array} bookmarks List of bookmark data objects.
   */
  populateBookmarks: function awesomescreen_populateBookmarks(bookmarks) {
    this.bookmarks.innerHTML = '';
    var list = this.listTemplate.cloneNode(true);
    bookmarks.forEach(function(data) {
      list.appendChild(this.createListItem(data, null, 'bookmarks'));
    }, this);
    this.bookmarks.appendChild(list);
  },

  /**
   * Refresh the list of bookmarks.
   */
   refreshBookmarks: function awesomescreen_refreshBookmarks() {
     BrowserDB.getBookmarks(this.populateBookmarks.bind(this));
   },

  /**
   * Deselect all the Awesomescreen tabs.
   */
  deselectTabs: function awesomescreen_deselectTabs() {
    this.topSites.classList.remove('selected');
    this.topSitesTab.classList.remove('selected');
    this.bookmarks.classList.remove('selected');
    this.bookmarksTab.classList.remove('selected');
    this.history.classList.remove('selected');
    this.historyTab.classList.remove('selected');
  },

  /**
   * Update Awesomescreen results based on the provided filter.
   *
   * @param {string} filter String to filter results by.
   */
  update: function awesomescreen_update(filter) {
    if (!filter) {
      this.results.classList.add('hidden');
      filter = false;
    } else {
      this.results.classList.remove('hidden');
    }
    BrowserDB.getTopSites(this.TOP_SITES_COUNT, filter,
      this.populateResults.bind(this));
  },

  /**
   * Show Awesomescreen results and/or search options.
   *
   * @param {Array} results The list of results to display.
   * @param {string} filter Filter to generate search options if needed.
   */
  populateResults: function awesomescreen_populateResults(results, filter) {
    var list = this.listTemplate.cloneNode(true);
    results.forEach(function(data) {
      list.appendChild(this.createListItem(data, filter, 'results'));
    }, this);

    var oldList = this.results.firstElementChild;

    if (oldList) {
      this.results.replaceChild(list, oldList);
    } else {
      this.results.appendChild(list);
    }

    // If less than two results, show default search option.
    if (results.length < 2 && filter && Browser.searchEngine.uri) {
      var uri = Browser.searchEngine.uri.replace('{searchTerms}',
        filter);
      var data = {
        title: Browser.searchEngine.title,
        uri: uri,
        iconUri: Browser.searchEngine.iconUri,
        description: _('search-for') + ' "' + filter + '"'
      };
      var item = this.createListItem(data, null, 'search');
      this.results.firstElementChild.appendChild(item);
    }
  },

  /**
   * Create a list element to contain results.
   *
   * @return {Element} An unordered list element.
   */
  createList: function awesomescreen_createList() {
    var list = document.createElement('ul');
    list.setAttribute('role', 'listbox');
    return list;
  },

  /**
   * Create a template list item DOM node.
   *
   * @return {Element} List item element.
   */
  createResultTemplate: function awesomescreen_createResultTemplate() {
    var template = document.createElement('li');
    var link = document.createElement('a');
    var title = document.createElement('h5');
    var url = document.createElement('small');
    template.setAttribute('role', 'listitem');

    link.appendChild(title);
    link.appendChild(url);
    template.appendChild(link);

    return template;
  },

  /**
   * Create a list item representing a result.
   *
   * @param {Object} data Result data.
   * @param {string} filter Text to highlight if necessary.
   * @param {string} listType Type of list being generated e.g. 'bookmarks'.
   * @return {Element} List item element representing result.
   */
  createListItem: function awesomescreen_createListItem(data, filter,
    listType) {

    var listItem = null;
    var fromCache = false;

    // Clone list item element from the cache or a template
    if (listType == 'search') {
      if (this.searchTemplate) {
        listItem = this.searchTemplate.cloneNode(true);
        fromCache = true;
      } else {
        listItem = this.resultTemplate.cloneNode(true);
        this.searchTemplate = listItem;
      }
    } else if (this.resultCache[data.uri]) {
      listItem = this.resultCache[data.uri].cloneNode(true);
      fromCache = true;
    } else {
      listItem = this.resultTemplate.cloneNode(true);
      this.cacheResult(data.uri, listItem);
    }

    var link = listItem.firstChild;

    // Set text content of non-cached results or those that may need updating
    if (!fromCache || listType == 'bookmarks' || listType == 'results' ||
      listType == 'search') {
      var title = link.firstChild;
      var url = link.childNodes[1];
      link.href = data.uri;
      var titleText = data.title ? data.title : data.url;
      title.innerHTML = HtmlHelper.createHighlightHTML(titleText, filter);

      if (data.uri == this.ABOUT_PAGE_URL) {
        url.textContent = 'about:';
      } else if (data.description) {
        url.innerHTML = HtmlHelper.createHighlightHTML(data.description);
      } else {
        url.innerHTML = HtmlHelper.createHighlightHTML(data.uri, filter);
      }
    }

    // Add contextmenu event listener for long press on bookmarks
    if (listType === 'bookmarks') {
      link.addEventListener('contextmenu', function() {
        Browser.showBookmarkTabContextMenu(data.uri);
      });
    }

    // If the result was cached, nothing left to do so return it
    if (fromCache)
      return listItem;

    // Set result icon
    var underlay = ',url(./style/images/favicon-underlay.png)';
    if (!data.iconUri) {
      link.style.backgroundImage =
        'url(' + this.DEFAULT_FAVICON + ')' + underlay;
    } else {
      BrowserDB.db.getIcon(data.iconUri, (function(icon) {
        if (icon && icon.failed != true && icon.data) {
          var imgUrl = window.URL.createObjectURL(icon.data);
          link.style.backgroundImage = 'url(' + imgUrl + ')' + underlay;
        } else {
          link.style.backgroundImage =
            'url(' + this.DEFAULT_FAVICON + ')' + underlay;
        }
      }).bind(this));
    }

    return listItem;
  },

  /**
   * Cache an awesomescreen result.
   *
   * Use this.resultCache as a FIFO cache of DOM elements for previous results.
   *
   * @param {string} uri URI of result to cache.
   * @param {Element} listItem DOM element representing result.
   */
  cacheResult: function awesomescreen_cacheResult(uri, listItem) {
    var keys = Object.keys(this.resultCache);
    if (keys.length >= this.RESULT_CACHE_SIZE)
      delete this.resultCache[keys[0]];
    this.resultCache[uri] = listItem;
  },

  /**
   * Clear the cache of awesomescreen results to save memory.
   */
  clearResultCache: function awesomescreen_clearResultCache() {
    this.resultCache = {};
    this.searchTemplate = null;
  },

  /**
   * Handle the user clicking on an awesomescreen result.
   *
   * @param {Event} e Click event.
   */
  handleClickResult: function awesomescreen_handleClickResult(e) {
    this.clearResultCache();
    Browser.followLink(e);
  }
};
