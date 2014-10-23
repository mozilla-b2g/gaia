'use strict';
/* global SpatialNavigator, KeyEvent, SelectionBorder */

(function(exports) {

  function Home() {}

  Home.prototype = {
    navigableIds: ['search-input'],
    navigableClasses: ['card-thumbnail', 'filter-tab', 'command-button'],

    init: function() {
      var collection = this.getNavigateElements();
      this.spatialNavigator = new SpatialNavigator(collection);
      this.selectionBorder = new SelectionBorder({
          multiple: false,
          container: document.getElementById('main-section'),
          forground: true });

      window.addEventListener('keydown', this.handleKeyEvent.bind(this));

      this.spatialNavigator.on('focus', this.handleSelection.bind(this));
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
      return elements;
    },

    handleSelection: function(elem) {
      if (elem.nodeName) {
        this.selectionBorder.select(elem);
      } else {
        this.selectionBorder.selectRect(elem);
      }
    }
  };

  exports.Home = Home;
}(window));

window.home = new Home();
window.home.init();
