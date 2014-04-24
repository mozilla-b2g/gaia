'use strict';

(function(exports) {

  var AccessibilityHelper = {
    /**
     * For a set of tab elements, set aria-selected attribute in accordance with
     * the current selection.
     * @param {Object} selectedTab a tab to select object.
     * @param {Array} tabs an array of tabs.
     */
    setAriaSelected: function ah_setAriaSelected(selectedTab, tabs) {
      // In case tabs is a NodeList, that does not have forEach.
      Array.prototype.forEach.call(tabs, function setAriaSelectedAttr(tab) {
        tab.setAttribute('aria-selected',
          tab === selectedTab ? 'true' : 'false');
      });
    }
  };

  exports.AccessibilityHelper = AccessibilityHelper;

})(window);
