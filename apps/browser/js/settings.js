/**
 *  Browser app settings panel
 */
var Settings = {
  searchEnginesFound: false,

  /**
   * Intialise settings panel.
   */
  init: function settings_init() {
    this.settingsDoneButton = document.getElementById('settings-done-button');
    this.clearHistoryButton = document.getElementById('clear-history-button');
    this.clearPrivateDataButton =
      document.getElementById('clear-private-data-button');
    this.aboutBrowserButton = document.getElementById('about-browser-button');
    this.searchEngineHeading = document.getElementById('search-engine-heading');
    this.searchEngineSection = document.getElementById('search-engine-section');
    this.searchEngineButton = document.getElementById('search-engine-button');
    this.searchEngineSelect = document.getElementById('search-engine-select');

    this.settingsDoneButton.addEventListener('click',
      this.hide);
    this.clearHistoryButton.addEventListener('click',
      this.handleClearHistoryClick.bind(this));
    this.clearPrivateDataButton.addEventListener('click',
       this.handleClearPrivateDataClick.bind(this));
    this.searchEngineSelect.addEventListener('change',
      this.handleSearchEngineChange.bind(this));

    this.populateSearchEngines();
  },

  /**
   * Populate the list of search engine <options> from the database.
   */
  populateSearchEngines: function settings_populateSearchEngines() {
    BrowserDB.getSearchEngines((function(engineList) {
      if (engineList.length == 0)
        return;
      this.searchEnginesFound = true;
      // Only show the search engine selection UI if we have more than one
      if (engineList.length <= 1)
        return;
      engineList.forEach(function(engine) {
        var option = document.createElement('option');
        option.value = engine.uri;
        option.text = engine.title;
        if (engine.uri == Browser.searchEngine.uri) {
          option.selected = true;
          this.searchEngineButton.textContent = engine.title;
        }
        this.searchEngineSelect.add(option);
      }, this);
      this.searchEngineHeading.classList.remove('hidden');
      this.searchEngineSection.classList.remove('hidden');
    }).bind(this));
  },

  /**
   * Show settings panel.
   */
  show: function settings_show() {
    document.body.classList.add(Browser.SETTINGS_SCREEN);
    this.clearHistoryButton.disabled = false;
    this.clearPrivateDataButton.disabled = false;
    // If search engines weren't found on startup, try again.
    if (!this.searchEnginesFound)
      this.populateSearchEngines();
  },

  /**
   * Hide settings panel.
   */
  hide: function settings_hide() {
    document.body.classList.remove(Browser.SETTINGS_SCREEN);
  },

  /**
   * Handle clear history button click.
   */
  handleClearHistoryClick: function settings_handleclearHistoryClick() {
    Browser.showDangerDialog('confirm-clear-browsing-history',
      this.clearHistoryButton, this.clearHistory.bind(this));
  },

  /**
   * Handle clear private data button click.
   */
  handleClearPrivateDataClick: function settings_handleClearPrivateDataClick() {
    Browser.showDangerDialog('confirm-clear-cookies-and-stored-data',
      this.clearPrivateDataButton, this.clearPrivateData.bind(this));
  },

  /**
   * Clear browser history.
   */
  clearHistory: function settings_clearHistory() {
    BrowserDB.clearHistory(function() {
      BrowserDB.getTopSites(Browser.MAX_TOP_SITES, null,
                         Browser.showTopSiteThumbnails.bind(Browser));
    });
    Browser.clearTabsSessionHistory();
  },

  /**
   * Clear private data.
   */
  clearPrivateData: function settings_clearPrivateData() {
    var request = navigator.mozApps.getSelf();
    request.onsuccess = function() {
      request.result.clearBrowserData();
    };
  },

  /**
   * Handle search engine change.
   */
  handleSearchEngineChange: function settingshandleSearchEngineChange() {
    var select = this.searchEngineSelect;
    var button = this.searchEngineButton;
    var selection = select.options[select.selectedIndex];
    button.textContent = selection.textContent;
    BrowserDB.updateSetting(selection.value, 'defaultSearchEngine');
    BrowserDB.getSearchEngine(selection.value, function(engine) {
       Browser.searchEngine = engine;
    });
  }

};
