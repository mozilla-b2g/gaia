'use strict';
define(function () {
  /**
   * domEvt can be used with data-event="" to translate internal template
   * events into custom events emitted from the custom element that contains
   * the template element that triggered the event. Use like so in the template:
   *
   * <a href="#" data-event="click:domEvt" data-domevt-name="headerClose">
   *
   * When that a tag receives a click event (from itself or its children) then
   * domEvt will convert that to a custom event "headerClose", dispatched on the
   * custom element.
   *
   * data-domevt-detail="something" allows passing a "detail" string in the
   * custom event that will have the value of "something".
   */
  return {
    domEvt: function (event) {
      var target = event.currentTarget,
          eventName = target.dataset.domevtName,
          eventData = {},
          eventDetail = target.dataset.domevtDetail;

      event.preventDefault();
      event.stopPropagation();

      if (!eventName) {
        throw new Error('No data-domevt-name on element <' +
                        target.nodeName + ' class="' + target.className + '">');
      }

      if (eventDetail) {
        eventData.detail = eventDetail;
      }

      this.dispatchEvent(new CustomEvent(eventName, eventData));
    }
  };
});
