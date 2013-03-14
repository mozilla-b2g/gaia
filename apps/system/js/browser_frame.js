'use strict';

/* Define a basic mozbrowser iframe class.
 * It creates a mozbrowser iframe,
 * and finally returns the DOM element it just created.
 */

var BrowserFrame = (function invocation() {
  function BrowserFrame() { // This constructor function is a local variable.
    this.element = null;
    this.id = nextId++;
    this.callbacks = {};
    // All arguments are values to createFrame
    createFrame.apply(this, arguments);
  }

  BrowserFrame.className = 'browser';

  // These are helper functions and variables used by the methods above
  // They're not part of the public API of the module, but they're hidden
  // within this function scope so we don't have to define them as a
  // property of Browser or prefix them with underscores.
  function createFrame(url, origin, name, manifestURL, oop) {
    var browser = document.createElement('iframe');
    browser.setAttribute('mozallowfullscreen', 'true');

    // Most apps currently need to be hosted in a special 'mozbrowser' iframe.
    // They also need to be marked as 'mozapp' to be recognized as apps by the
    // platform.
    browser.setAttribute('mozbrowser', 'true');

    if (oop)
      browser.setAttribute('remote', 'true');

    if (manifestURL)
      browser.setAttribute('mozapp', manifestURL);

    browser.src = url;

    browser.id = this.className + this.id;

    browser.classList.add(BrowserFrame.className);

    // Store the element
    this.element = browser;
  };

  var nextId = 0;
  // The public API for this module is the Browser() constructor function.
  // We need to export that function from this private namespace so that
  // it can be used on the outside. In this case, we export the constructor
  // by returning it. It becomes the value of the assignment expression
  // on the first line above.
  return BrowserFrame;
}()); // Invoke the function immediately after defining it.

