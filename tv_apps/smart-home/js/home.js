'use strict';
/* global SpatialNavigator, KeyEvent, SelectionBorder, XScrollable */

(function(exports) {

  function Home() {}

  Home.prototype = {
    navigableIds: ['search-input'],
    navigableClasses: ['filter-tab', 'command-button'],
    cardScrollable: new XScrollable({
            frameElem: 'card-list-frame',
            listElem: 'card-list',
            items: 'card-thumbnail'}),
    folderScrollable: new XScrollable({
            frameElem: 'folder-list-frame',
            listElem: 'folder-list',
            items: 'folder-card-thumbnail'}),
    navigableScrollable: [],

    init: function() {
      this.navigableScrollable = [this.cardScrollable, this.folderScrollable];
      var collection = this.getNavigateElements();
      this.spatialNavigator = new SpatialNavigator(collection);
      this.selectionBorder = new SelectionBorder({
          multiple: false,
          container: document.getElementById('main-section'),
          forground: true });

      window.addEventListener('keydown', this.handleKeyEvent.bind(this));

      this.spatialNavigator.on('focus', this.handleFocus.bind(this));

      var handleScrollableItemFocusBound =
                                    this.handleScrollableItemFocus.bind(this);
      this.navigableScrollable.forEach(function(scrollable) {
        scrollable.on('focus', handleScrollableItemFocusBound);
      });
      this.spatialNavigator.focus();
    },

    handleKeyEvent: function(evt) {
      // XXX : It's better to use KeyEvent.Key and use "ArrowUp", "ArrowDown",
      // "ArrowLeft", "ArrowRight" for switching after Gecko synced with W3C
      // KeyboardEvent.Key standard. Here we still use KeyCode and customized
      // string of "up", "down", "left", "right" for the moment.
      var key = this.convertKeyToString(evt.keyCode);
      switch (key) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
          var focus = this.spatialNavigator.getFocusedElement();
          if (focus.CLASS_NAME == 'XScrollable') {
            if (focus.spatialNavigator.move(key)) {
              return;
            }
          }
          this.spatialNavigator.move(key);
      }
    },

    convertKeyToString: function(keyCode) {
      switch (keyCode) {
        case KeyEvent.DOM_VK_UP:
          return 'up';
        case KeyEvent.DOM_VK_RIGHT:
          return 'right';
        case KeyEvent.DOM_VK_DOWN:
          return 'down';
        case KeyEvent.DOM_VK_LEFT:
          return 'left';
        case KeyEvent.DOM_VK_RETURN:
          return 'enter';
        case KeyEvent.DOM_VK_ESCAPE:
          return 'esc';
        case KeyEvent.DOM_VK_BACK_SPACE:
          return 'esc';
        default:// we don't consume other keys.
          return null;
      }
    },

    getNavigateElements: function() {
      var elements = [];
      this.navigableIds.forEach(function(id) {
        var elem = document.getElementById(id);
        if (elem) {
          elements.push(elem);
        }
      });
      this.navigableClasses.forEach(function(className) {
        var elems = document.getElementsByClassName(className);
        if (elems.length) {
          // Change HTMLCollection to array before concatenating
          elements = elements.concat(Array.prototype.slice.call(elems));
        }
      });
      elements = elements.concat(this.navigableScrollable);
      return elements;
    },

    handleFocus: function(elem) {
      if (elem.CLASS_NAME == 'XScrollable') {
        elem.spatialNavigator.focus(elem.spatialNavigator.getFocusedElement());
      } else if (elem.nodeName) {
        this.selectionBorder.select(elem);
      } else {
        this.selectionBorder.selectRect(elem);
      }
    },

    handleScrollableItemFocus: function(scrollable, elem) {
      this.selectionBorder.select(elem, scrollable.getItemRect(elem));
    }
  };

  exports.Home = Home;
}(window));

window.home = new Home();
window.home.init();
