/* globals Browser, BrowserDB, MozActivity */
/**
 *  Browser app toolbar
 */
var Toolbar = {

  /**
   * Intialise toolbar.
   */
  init: function toolbar_init() {
    this.backButton = document.getElementById('back-button');
    this.forwardButton = document.getElementById('forward-button');
    this.shareButton = document.getElementById('share-button');
    this.bookmarkButton = document.getElementById('bookmark-button');
    this.shareButton.addEventListener('click',
      this.handleShareButtonClick.bind(this));
    this.backButton.addEventListener('click',
      Browser.goBack.bind(Browser));
    this.forwardButton.addEventListener('click',
      Browser.goForward.bind(Browser));
    this.bookmarkButton.addEventListener('click',
      Browser.showBookmarkMenu.bind(Browser));
  },

  /**
   * Refresh state of bookmark button based on current tab URL.
   */
  refreshBookmarkButton: function toolbar_refreshBookmarkButton() {
    if (!Browser.currentTab.url) {
      this.bookmarkButton.classList.remove('bookmarked');
      return;
    }
    BrowserDB.getBookmark(Browser.currentTab.url, (function(bookmark) {
      if (bookmark) {
        this.bookmarkButton.classList.add('bookmarked');
      } else {
        this.bookmarkButton.classList.remove('bookmarked');
      }
    }).bind(this));
  },

  /**
   * Refresh state of all toolbar buttons.
   */
  refreshButtons: function toolbar_refreshButtons() {
    // When handling window.open we may hit this code
    // before canGoBack etc has been applied to the frame
    if (!Browser.currentTab.dom.getCanGoBack) {
      return;
    }

    Browser.currentTab.dom.getCanGoBack().onsuccess = (function(e) {
      this.backButton.disabled = !e.target.result;
    }).bind(this);
    Browser.currentTab.dom.getCanGoForward().onsuccess = (function(e) {
      this.forwardButton.disabled = !e.target.result;
    }).bind(this);
    this.refreshBookmarkButton();
  },

  _timeWindow: 1000,
  _lastExecution: new Date((new Date()).getTime() - 1000),
  /**
   * Share URL activity
   * Make the activity be called no more than one time every 1000 seconds
   */
  onShare: function toolbar_onShare() {
    if ((this._lastExecution.getTime() + this._timeWindow) <=
      (new Date()).getTime()) {
      this._lastExecution = new Date();
      new MozActivity({
        name: 'share',
        data: {
          type: 'url',
          url: Browser.currentTab.url
        }
      });
    }
  },

  /**
   * Handle share button clicks.
   *
   * @param {Event} evt Click event.
   */
  handleShareButtonClick: function toolbar_handleShareButtonClick(evt) {
    if (this.shareButton.disabled) {
      return;
    }
    this.onShare();
  }
};

window.addEventListener('load', function toolbarOnLoad(evt) {
  window.removeEventListener('load', toolbarOnLoad);
  Toolbar.init();
});
