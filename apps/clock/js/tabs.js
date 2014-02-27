define(function(require) {
'use strict';
/**
 * Abstraction for handling the Tabs links at the bottom of the UI.
 * @param {HTMLElement} element The containing element for the Tabs UI.
 */
function Tabs(element) {
  this.element = element;
  this.links = Array.prototype.slice.call(element.querySelectorAll('a'));
  this.currentIndex = 0;
  this.element.addEventListener('click', this);
}

/**
 * Find the clicked link in the list of links and update selected attributes.
 * Also emit a 'selected' event with the relevant data.
 */
Tabs.prototype.handleEvent = function tabsHandleEvent(event) {
  var index = this.links.indexOf(event.target);
  if (index === -1 || index === this.currentIndex) {
    return;
  }
  this.currentIndex = index;
  this.links.forEach(function toggleLinks(link, linkIndex) {
    if (linkIndex === index) {
      link.parentNode.setAttribute('aria-selected', 'true');
    } else {
      link.parentNode.removeAttribute('aria-selected');
    }
  });
};

return Tabs;

});
