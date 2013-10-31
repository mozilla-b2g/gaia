
'use strict';

var utils = this.utils || {};

utils.status = (function() {

  // This constant is essential to resolve what is the path of the CSS file
  // that defines the animations
  var FILE_NAME = 'status';

  // How many milliseconds is displayed the status component by default
  var DISPLAYED_TIME = 1500;

  // References to the DOMElement(s) that renders the status UI component
  var section, content;

  // The numerical ID of the timeout in order to hide UI component
  var timeoutID;

  /*
   * Clears the callback in charge of hiding the component after timeout
   */
  function clearHideTimeout() {
    if (timeoutID === null) {
      return;
    }

    window.clearTimeout(timeoutID);
    timeoutID = null;
  }

  /*
   * Shows the status component
   *
   * @param{Object} Message. It could be a string or a DOMFragment that
   *                represents the normal and strong strings
   *
   * @param{int} It defines the time that the status is displayed in ms. This
   *             parameter is optional
   *
   */
  function show(message, duration) {
    clearHideTimeout();
    content.innerHTML = '';

    if (typeof message === 'string') {
      content.textContent = message;
    } else {
      try {
        // Here we should have a DOMFragment
        content.appendChild(message);
      } catch (ex) {
        console.error('DOMException: ' + ex.message);
      }
    }

    section.classList.remove('hidden');
    section.classList.add('onviewport');
    timeoutID = window.setTimeout(hide, duration || DISPLAYED_TIME);
  }

  /*
   * This function is invoked when some animation is ended
   */
  function animationEnd(evt) {
    var eventName = 'status-showed';

    if (evt.animationName === 'hide') {
      clearHideTimeout();
      section.classList.add('hidden');
      eventName = 'status-hidden';
    }

    window.dispatchEvent(new CustomEvent(eventName));
  }

  /*
   * Hides the status component
   */
  function hide() {
    section.classList.remove('onviewport');
  }

  /*
   * Releases memory
   */
  function destroy() {
    section.removeEventListener('animationend', animationEnd);
    document.body.removeChild(section);
    clearHideTimeout();
    section = content = null;
  }

  function getPath() {
    return '/js/components/';
  }

  /*
   * Initializes the library. Basically it creates the markup:
   *
   * <section role="status">
   *   <p>xxx</p>
   * </section>
   */
  function initialize() {
    if (section) {
      return;
    }

    section = document.createElement('section');

    var link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = getPath() + 'status-behavior.css';
    document.head.appendChild(link);

    section.setAttribute('role', 'status');
    section.classList.add('hidden');

    content = document.createElement('p');

    section.appendChild(content);
    section.addEventListener('animationend', animationEnd);

    // to prevent flickering
    setTimeout(function append() {
      document.body.appendChild(section);
    });
  }

  // Initializing the library
  if (document.readyState === 'complete') {
    initialize();
  } else {
    document.addEventListener('DOMContentLoaded', function loaded() {
      document.removeEventListener('DOMContentLoaded', loaded);
      initialize();
    });
  }

  return {
    /*
     * The library is auto-initialized but it is for unit testing purposes
     */
    init: initialize,

    /*
     * Shows the status component
     *
     * @param{Object} Message. It could be a string or a DOMFragment that
     *                represents the normal and strong strings
     *
     * @param{int} It defines the time that the status is displayed in ms
     *
     */
    show: show,

    /*
     * Hides the status component
     */
    hide: hide,

    /*
     * Releases memory
     */
    destroy: destroy,

    /*
     * Sets up the duration in milliseconds that a status is displayed
     *
     * @param{int} The time in milliseconds
     *
     */
    setDuration: function setDuration(time) {
      DISPLAYED_TIME = time || DISPLAYED_TIME;
    }
  };

})();
