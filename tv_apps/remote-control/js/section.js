/* global SpatialNavigator */
'use strict';

(function(exports) {
  function Section(id) {
    this.id = id;
    this._dom = document.getElementById(this.id);

    var focusables = this._dom.querySelectorAll('.focusable');
    Array.from(focusables).forEach(function(elem) {
      elem.setAttribute('tabindex', -1);
    });

    this._spatialNav = new SpatialNavigator(
      focusables,
      {
        ignoreHiddenElement: true,
        rememberSource: true
      }
    );
    this._spatialNav.on('focus', (elem) => {
      elem.focus();
    });

    this._childSections = {};
    this._activeChildSectionId = '';
    this._defaultFocusElement = undefined;
    this._focusableElementCount = focusables.length;
  }

  Section.prototype = {
    uninit: function() {
      if (this._uninit) {
        this._uninit();
      }

      this._defaultFocusElement = undefined;
      this._activeChildSectionId = '';
      this._childSections = {};
      this._parentSection = undefined;
      this._spatialNav = undefined;
      this._dom = undefined;
    },

    addChild: function(id, section) {
      this._childSections[id] = section;
      section._parentSection = this;
    },

    removeChild: function(id) {
      this._childSections[id]._parentSection = undefined;
      delete this._childSections[id];
    },

    focus: function(elem) {
      if (typeof elem === 'string') {
        elem = document.getElementById(elem);
      }
      return this._spatialNav.focus(elem);
    },

    unfocus: function() {
      return this._spatialNav.unfocus();
    },

    handleMove: function(direction) {
      var activeChildSection = this.getActiveChildSection();
      if (activeChildSection) {
        activeChildSection.handleMove(direction);
      } else {
        if (this._handleMove) {
          var nextElement = this._handleMove(direction);
          if (nextElement) {
            if (this._spatialNav.focus(nextElement)) {
              return;
            }
          }
        }
        if (!this._spatialNav.move(direction)) {
          // If failed to move, re-focus the current one.
          this._spatialNav.focus();
        }
      }
    },

    handleClick: function() {
      var activeChildSection = this.getActiveChildSection();
      if (activeChildSection) {
        activeChildSection.handleClick();
      } else if (this._handleClick) {
        this._handleClick();
      } else if (!this._focusableElementCount) {
        // If there is no focusable element in this section, just close it.
        this.backToParent();
      }
    },

    handleBack: function() {
      var activeChildSection = this.getActiveChildSection();
      if (activeChildSection) {
        if (!activeChildSection.handleBack()) {
          // Hide the child section if it doesn't handle BACK key.
          this.hideChildSection();
          return true;
        }
      } else if (this._handleBack) {
        return this._handleBack();
      }
      // Returning false can let BACK key to be bubbled to its parent.
      return false;
    },

    getFocusedElement: function() {
      return this._spatialNav.getFocusedElement();
    },

    getActiveChildSection: function() {
      if (!this._activeChildSectionId) {
        return undefined;
      }
      return this._childSections[this._activeChildSectionId];
    },

    backToParent: function() {
      if (this._parentSection) {
        this._parentSection.hideChildSection();
        return true;
      }
      return false;
    },

    show: function(previousId) {
      document.activeElement.blur();

      if (this._readyToShow) {
        this._readyToShow(previousId);
      }

      this._dom.classList.add('visible');
      this._dom.removeAttribute('aria-hidden');

      this._spatialNav.focus(this._defaultFocusElement);
    },

    hide: function() {
      this._dom.classList.remove('visible');
      this._dom.setAttribute('aria-hidden', true);
      return this;
    },

    showChildSection: function(id) {
      var child = this._childSections[id];
      if (child) {
        this.hide();
        this._childSections[id].show();
        this._activeChildSectionId = id;
      }
    },

    hideChildSection: function() {
      var activeChildSection = this.getActiveChildSection();
      if (activeChildSection) {
        var previousId = this._activeChildSectionId;
        this._activeChildSectionId = '';
        activeChildSection.hide();
        this.show(previousId);
      }
    },

    setDefaultFocusElement: function(elem) {
      if (typeof elem === 'string') {
        elem = document.getElementById(elem);
      }
      if (elem) {
        this._defaultFocusElement = elem;
      } else {
        this._defaultFocusElement = undefined;
      }
    }
  };

  exports.Section = Section;
}(window));
