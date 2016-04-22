/* global Browser */
/* global KeyEvent */
/* global mozIntl */

'use strict';

(function(exports) {
  const DEBUG = false;
  function debug() {
    if (DEBUG) {
      console.log('[FirefoxSyncTabList] ' + Array.slice(arguments).concat());
    }
  }

  /**
   * 1rem equals to 10px
   * @type {Number}
   */
  const PX_TO_REM = 10;

  /**
   * Height of list item element, unit is rem.
   * @type {Number}
   */
  const LIST_ITEM_HEIGHT = 11.2;

  const TAB_LIST_ITEM_TYPE_FOLDER = 'folder';

  const TAB_LIST_ITEM_TYPE_LINK = 'link';

  var FirefoxSyncTabList = {
    init() {
      this.tabContentEl = document.getElementById('sync-tab-content');

      this.listContainerEl =
        this.tabContentEl.querySelector('.tab-list-container');

      this.listViewEl =
        this.tabContentEl.querySelector('.tab-list-view');
      this.listViewEl.style.transform = 'translateY(0rem)';
      this.listViewEl.addEventListener('transitionend',
        this.transitionEndHandler.bind(this));
      this.listViewEl.addEventListener('keydown',
        this.keyDownHandler.bind(this));
      this.listViewEl.addEventListener('keyup',
        this.keyUpHandler.bind(this));
      this.listViewEl.addEventListener('mouseup',
        this.mouseUpHandler.bind(this));

      this.noTabView = this.tabContentEl.querySelector('.no-tabs-view');

      /**
       * current focus element index listItems.
       * @type {Number}
       */
      this.currentFocusIndex = 0;

      /**
       * current focus element in list.
       * @type {Number}
       */
      this.currentFocusItem = null;

      /**
       * Sync tab data.
       * @type {Map}
       */
      this.listData = new Map();

      /**
       * All List Items in tab list.
       * @type {Array}
       */
      this.listItems = [];
    },

    /**
     * render tab list data. If no tab data, display no tab view
     */
    render() {
      if (!this.listData.size || this.isNoTabInListData()) {
        this.switchToNoTabView();
      } else {
        this.switchToListView();

        for (var [id, data] of this.listData) {
          if (!data.tabs.length) {
            continue;
          }
          let itemEl = this.createListFolderItem(id, data);
          this.listViewEl.appendChild(itemEl);
        }

        let focusEl =
          this.listViewEl.firstChild.querySelector('[data-type="folder"]');

        this.focusItem(focusEl);
      }

      this.updateListItems();
    },

    update(tabData) {
      debug(JSON.stringify(tabData));
      this.reset();
      this.parseTabData(tabData);
      this.render();
    },

    updateListItems() {
      var listItemEls = this.listViewEl.querySelectorAll('.list-item');
      this.listItems = Array.from(listItemEls);
      if (this.currentFocusItem) {
        this.currentFocusIndex = this.listItems.indexOf(this.currentFocusItem);
      }
    },

    /**
     * Reset FirefoxSyncTabList parameters
     */
    reset() {
      this.listItems = [];
      this.currentFocusIndex = 0;
      this.currentFocusItem = null;
      while (this.listViewEl.firstChild) {
        this.listViewEl.removeChild(this.listViewEl.firstChild);
      }
      this.listData.clear();
      this.listViewEl.style.transform = 'translateY(0rem)';
    },

    /**
     * Reset tab list variable and switch to no tab view
     */
    clean() {
      this.reset();
      this.switchToNoTabView();
    },

    /**
     * Restore list View to start position and collapse expand folder item
     */
    restoreListView() {
      var activeFolderEl = this.listViewEl.querySelector('.list-item.active');
      if (activeFolderEl) {
        this.closeFolderItem(activeFolderEl);
        activeFolderEl.parentNode.removeChild(activeFolderEl
          .nextElementSibling);
        this.updateListItems();
      }
      this.listViewEl.style.transform = 'translateY(0rem)';
      if (this.listItems.length) {
        this.currentFocusIndex = 0;
        this.currentFocusItem = this.listItems[this.currentFocusIndex];
      }
    },

    /**
     * parse sync tab raw data to listData for rendering
     */
    parseTabData(tabData) {
      this.listData.clear();
      tabData.forEach(data => {this.listData.set(data.id, data);});
    },

    /**
     * Create List Button Item.
     * @param  {String} id - sync client id
     * @param  {Object} data - sync client data
     */

    /**
     *  <li class="list-folder">
     *    <div class="list-item list-item-folder" data-type="folder">
     *      <div class="text-box">
     *        <span class="title"></span>
     *        <span class="text"></span>
     *      </div>
     *      <div class="arrow-icon" data-icon="arrow-right"></div>
     *    </div>
     *  </li>
     */
    createListFolderItem(id, data) {
      var itemEl = document.createElement('li'),
          folderEl = document.createElement('div'),
          textBoxEl = document.createElement('div'),
          titleEl = document.createElement('span'),
          textEl = document.createElement('span'),
          iconEl = document.createElement('div');

      itemEl.classList.add('tab-list-item');

      folderEl.tabIndex = 0;
      folderEl.dataset.client = id;
      folderEl.dataset.type = TAB_LIST_ITEM_TYPE_FOLDER;
      folderEl.classList.add('list-item');

      textBoxEl.classList.add('text-box');
      titleEl.classList.add('title');
      textEl.classList.add('text');
      titleEl.textContent = `${data.clientName} (${data.tabs.length})`;

      let rtf = new mozIntl.RelativeTimeFormat(navigator.languages, {
        unit: 'bestFit'
      });
      rtf.format(data.timestamp).then(val => {
        document.l10n.setAttributes(textEl,
                                    'fxsync-last-updated-in-time-ago',
                                    {'time-ago' : val});
      });

      iconEl.classList.add('arrow-icon');
      iconEl.dataset.icon = 'arrow-right';
      folderEl.appendChild(iconEl);

      textBoxEl.appendChild(titleEl);
      textBoxEl.appendChild(textEl);

      folderEl.appendChild(textBoxEl);
      folderEl.appendChild(iconEl);
      itemEl.appendChild(folderEl);

      folderEl.addEventListener('mouseover',
        this.handleListItemMouseOver.bind(this));
      folderEl.addEventListener('mouseout',
        this.handleListItemMouseOut.bind(this));

      return itemEl;
    },

    /**
     * Create List Link Item.
     * @param  {Object} data - sync tab data
     */

    /**
     *  <li>
     *    <a class="list-item list-item-link">
     *      <div class="favor-icon"></div>
     *      <div class="text-box">
     *        <span class="title"></span>
     *        <span class="text"></span>
     *      </div>
     *    </a>
     *  </li>
     */
    createListLinkItem(data) {
      var itemEl = document.createElement('li'),
          linkEl = document.createElement('div'),
          iconEl = document.createElement('div'),
          textBoxEl = document.createElement('div'),
          titleEl = document.createElement('span'),
          textEl = document.createElement('span'),
          [url] = data.urlHistory;

      linkEl.tabIndex = '0';
      linkEl.dataset.type = TAB_LIST_ITEM_TYPE_LINK;
      linkEl.dataset.url = url;
      linkEl.classList.add('list-item');

      iconEl.classList.add('favor-icon');
      if (data.icon) {
        this.checkImage(
          data.icon,
          () => {
            iconEl.classList.add('icon-image');
            iconEl.style.backgroundImage = `url(${data.icon})`;
          },
          () => {
            iconEl.dataset.icon = 'default-fav';
          });
      } else {
        iconEl.dataset.icon = 'default-fav';
      }

      textBoxEl.classList.add('text-box');
      titleEl.classList.add('title');
      titleEl.textContent = data.title;
      textEl.classList.add('text');
      textEl.textContent = url;
      textBoxEl.appendChild(titleEl);
      textBoxEl.appendChild(textEl);

      linkEl.appendChild(iconEl);
      linkEl.appendChild(textBoxEl);

      itemEl.appendChild(linkEl);

      linkEl.addEventListener('mouseover',
        this.handleListItemMouseOver.bind(this));
      linkEl.addEventListener('mouseout',
        this.handleListItemMouseOut.bind(this));

      return itemEl;
    },

    /**
     * Shift list view transform
     * @param  {Nunber} shift - shift transform, unit is rem
     */
    shiftListView(shift) {
      var style = this.listViewEl.style.transform.split('('),
          transform = Number.parseFloat(style[1]);
      this.listViewEl.style.transform =
        `translateY(${(transform + shift)}rem) translateZ(0.01px)`;
    },

    /**
     * Focus list item.
     * @param  {Node} el - HTML list item to focus.
     */
    focusItem(el) {
      this.currentFocusItem = el;
      el.focus();
    },

    /**
     * Focus currentFocusItem.
     */
    focusCurrentItem() {
      // if there is list item rendered and the current active element not in
      // tab list, focus the currentFocusItem.
      if ( this.listItems.indexOf(document.activeElement) === -1) {
        this.focusItem(this.currentFocusItem);
      }
    },

    handleListItemTransitionEnd(el) {
      debug('handleListItemTransitionEnd');
      if (!el.classList.contains('expand')) {
        var childList = el.querySelector('ul');
        el.removeChild(childList);

        if (this.currentFocusItem.getBoundingClientRect().top <
          this.listContainerEl.getBoundingClientRect().top) {
          let distance = this.listContainerEl.getBoundingClientRect().top -
            this.currentFocusItem.getBoundingClientRect().top;
          let shiftHeight = distance / (LIST_ITEM_HEIGHT * PX_TO_REM);

          this.shiftListView(shiftHeight * LIST_ITEM_HEIGHT);
        }
      }
      this.focusItem(this.currentFocusItem);
      this.updateListItems();
    },

    transitionEndHandler(e) {
      var targetEl = e.target;
      if (targetEl.classList.contains('tab-list-item')) {
        this.handleListItemTransitionEnd(targetEl);
      }
    },

    moveFocusUp() {
      this.currentFocusIndex -= 1;
      var focusEl = this.listItems[this.currentFocusIndex];

      if (focusEl.getBoundingClientRect().top <
        this.listContainerEl.getBoundingClientRect().top) {
        this.shiftListView(LIST_ITEM_HEIGHT);
      }
      this.focusItem(focusEl);
    },

    moveFocusDown() {
      this.currentFocusIndex += 1;
      var focusEl = this.listItems[this.currentFocusIndex];

      if (focusEl.getBoundingClientRect().bottom >
        this.listContainerEl.getBoundingClientRect().bottom) {
        this.shiftListView((-1 * LIST_ITEM_HEIGHT));
      }
      this.focusItem(focusEl);
    },

    handleListItemKeyDown(e) {
      switch (e.keyCode) {
        case KeyEvent.DOM_VK_UP:
          if (this.currentFocusIndex > 0) {
            this.moveFocusUp();
          }
          break;
        case KeyEvent.DOM_VK_DOWN:
          if (this.currentFocusIndex < (this.listItems.length - 1)) {
            this.moveFocusDown();
          }
          break;
        default:
          return;
      }
    },

    keyDownHandler(e) {
      var targetEl = e.target;
      if (targetEl.classList.contains('list-item')) {
        this.handleListItemKeyDown(e);
      }
    },

    openFolderItem(el) {
      if (!el.parentNode.querySelector('ul')) {
        let clientId = el.dataset.client,
            tabData = this.listData.get(clientId),
            tabViewEl = document.createElement('ul');

        tabData.tabs.forEach(function(data){
          let itemEl = this.createListLinkItem(data);
          tabViewEl.appendChild(itemEl);
        }, this);

        el.parentNode.appendChild(tabViewEl);
      }

      el.parentNode.classList.add('expand');
      el.classList.add('active');
    },

    closeFolderItem(el) {
      el.parentNode.classList.remove('expand');
      el.classList.remove('active');
    },

    handleFolderItemKeyReturn(el) {
      if (el.classList.contains('no-tabs')) {
        return;
      }

      if(el.classList.contains('active')) {
        this.closeFolderItem(el);
      } else {
        let activeFolderItem =
          this.listViewEl.querySelector('.list-item.active');
        if (activeFolderItem) {
          this.closeFolderItem(activeFolderItem);
        }
        this.openFolderItem(el);
      }
    },

    handleFolderItemKeyUp(e) {
      switch (e.keyCode) {
        case KeyEvent.DOM_VK_RETURN:
          this.handleFolderItemKeyReturn(e.target);
          break;
        default:
          return;
      }
    },

    displayWebSite(url) {
      Browser.navigate(url);
      Browser.switchCursorMode(true);
    },

    handleLinkItemKeyUp(e) {
      switch (e.keyCode) {
        case KeyEvent.DOM_VK_RETURN:
          this.displayWebSite(e.target.dataset.url);
          break;
        default:
          return;
      }
    },

    keyUpHandler(e) {
      var targetEl = e.target,
          targetType = targetEl.dataset.type;

      if (!targetEl.classList.contains('list-item')) {
        return;
      }

      switch (targetType) {
        case TAB_LIST_ITEM_TYPE_FOLDER:
          this.handleFolderItemKeyUp(e);
          break;
        case TAB_LIST_ITEM_TYPE_LINK:
          this.handleLinkItemKeyUp(e);
          break;
        default:
          return;
      }
    },

    handleFolderItemMouseUp(e) {
      switch(e.button){
        case 0 :
          // left click
          this.handleFolderItemKeyReturn(e.target);
          break;
        default:
          break;
      }
    },

    handleLinkItemMouseUp(e) {
      switch(e.button){
        case 0 :
          // left click
          this.displayWebSite(e.target.dataset.url);
          break;
        default:
          break;
      }
    },

    mouseUpHandler(e) {
      var targetEl = e.target,
          targetType = targetEl.dataset.type;

      if (!targetEl.classList.contains('list-item')) {
        return;
      }

      switch (targetType) {
        case TAB_LIST_ITEM_TYPE_FOLDER:
          this.handleFolderItemMouseUp(e);
          break;
        case TAB_LIST_ITEM_TYPE_LINK:
          this.handleLinkItemMouseUp(e);
          break;
        default:
          return;
      }
    },

    handleListItemMouseOver(e) {
      var targetEl = e.currentTarget;
      targetEl.focus();
      this.currentFocusItem = targetEl;
      this.currentFocusIndex =
        Array.prototype.indexOf.call(this.listItems, targetEl);

    },

    handleListItemMouseOut(e) {
      var targetEl = e.currentTarget;
      targetEl.blur();
    },

    isNoTabInListData() {
      var result = true;
      for (var value of this.listData.values()) {
        if (value.tabs.length > 0) {
          result = false;
          break;
        }
      }
      return result;
    },

    switchToListView() {
      debug('switchToListView');
      this.listContainerEl.hidden = false;
      this.noTabView.hidden = true;
    },

    switchToNoTabView() {
      debug('switchToNoTabView');
      this.listContainerEl.hidden = true;
      this.noTabView.hidden = false;
    },

    isDisplayNoTabView() {
      return !this.noTabView.hidden;
    },

    checkImage(imageSrc, onSuccess, onError) {
      var img = new Image();
      img.onload = onSuccess;
      img.onerror = onError;
      img.src = imageSrc;
    }
  };

  exports.FirefoxSyncTabList = FirefoxSyncTabList;
  FirefoxSyncTabList.init();
})(window);
