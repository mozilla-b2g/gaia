'use strict';

/* Define a entry sheet.
 * It creates a element provided by container, title, content.
 */

var EntrySheet = (function invocation() {
  function EntrySheet() { // This constructor function is a local variable.
    render.apply(this, arguments); // All arguments are values to render
  }

  EntrySheet.className = 'entrySheet';

  EntrySheet.prototype.setTitle = function(title) {
    this.titleElement.textContent = title;
  };

  EntrySheet.prototype.open = function() {
    // Transtion won't happen if adding class directly
    setTimeout(function() {
      this.element.classList.add('active');
    }.bind(this));
  };

  EntrySheet.prototype.close = function() {
    this.element.addEventListener('transitionend', function onTransitionend() {
      this.element.removeEventListener('transitionend', onTransitionend);
      this.element.classList.remove('disappearing');
      this.element.classList.remove('active');

      // Here we remove entire element once the close button is pressed.
      this.container.removeChild(this.element);
    }.bind(this));
    this.element.classList.add('disappearing');
  };

  // These are helper functions and variables used by the methods above
  // They're not part of the public API of the module, but they're hidden
  // within this function scope so we don't have to define them as a
  // property of Browser or prefix them with underscores.
  // Now define instance methods on Set.prototype.
  function view() {
    return '<div class="' + EntrySheet.className + '">' +
      '<section role="region" class="skin-organic header">' +
        '<header>' +
          '<button class="close">' +
              '<span class="icon icon-close">close</span>' +
          '</button>' +
          '<h1 class="title">' + '</h1>' +
          '<div class="throbber"></div>' +
        '</header>' +
      '</section>' +
      '<div class="content">' +
      '</div>' +
    '</div';
  }

  function render(container, title, content) {
    this.container = container;
    this.title = title;
    this.container.insertAdjacentHTML('beforeend', view.apply(this));
    this.closeButton =
      this.container.querySelector('.' + EntrySheet.className + ' .close');
    this.titleElement =
      this.container.querySelector('.' + EntrySheet.className + ' .title');
    this.throbberElement =
      this.container.querySelector('.' + EntrySheet.className + ' .throbber');
    this.content =
      this.container.querySelector('.' + EntrySheet.className + ' .content');
    this.element = this.container.querySelector('.' + EntrySheet.className);
    this.element.dataset.zIndexLevel = 'dialog-overlay';

    var self = this;
    // XXX: We may make entry sheet to generate browser frame by itself,
    // hence we don't need to check the type here.
    if (typeof(BrowserFrame) != 'undefined' &&
        content instanceof BrowserFrame) {
      content.element.addEventListener('mozbrowserloadstart',
        function onLoadStart() {
          self.throbberElement.dataset.loading = true;
        });
      content.element.addEventListener('mozbrowserloadend',
        function onLoadEnd() {
          delete self.throbberElement.dataset.loading;
        });
      this.content.appendChild(content.element);
    } else if (content && content.nodeType == 1) {
      // In case the content isn't a browserElement object but a DOM element.
      this.content.appendChild(content);
    }

    this.setTitle(this.title);
    var self = this;
    this.closeButton.onclick = function() {
      self.close();
    };
  }

  var nextId = 0;
  // The public API for this module is the EntrySheet() constructor function.
  // We need to export that function from this private namespace so that
  // it can be used on the outside. In this case, we export the constructor
  // by returning it. It becomes the value of the assignment expression
  // on the first line above.
  return EntrySheet;
}()); // Invoke the function immediately after defining it.
