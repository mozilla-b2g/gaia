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
  // This event came from a click on e.g. <a href="#foo">, but we don't want to
  // *actually* navigate to #foo (we don't want to instantly scroll the element
  // with id "foo" into view). We have CSS animations that will manage that,
  // and any additional viewport adjustments will only confuse them.
  // So, we use preventDefault() to prevent the navigation from occurring.
  event.preventDefault();

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
