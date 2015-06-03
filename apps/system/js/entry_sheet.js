'use strict';
/* global BrowserFrame, BaseUI, Service, ChildWindowFactory */
/* exported EntrySheet */

/* Define a entry sheet.
 * It creates a element provided by container, title, content.
 */

(function(exports) {
  function EntrySheet(container, title, browser) {
    this.container = container;
    this.title = title;
    this.browser = browser;
    this.render();
    this.childWindowFactory = new ChildWindowFactory(this);
    Service.request('registerHierarchy', this);
  }

  EntrySheet.className = 'entrySheet';

  EntrySheet.prototype = Object.create(BaseUI.prototype);

  var instance;
  EntrySheet.instantiate = function(title, url) {
    var frame = new BrowserFrame({
        url: url,
        oop: true
      });
    instance = new EntrySheet(document.getElementById('screen'),
      title, frame);
    instance.open();
  };

  EntrySheet.close = function() {
    instance && instance.close();
  };

  EntrySheet.prototype.name = 'EntrySheet';

  EntrySheet.prototype.EVENT_PREFIX = 'entrysheet';

  EntrySheet.prototype.setTitle = function(title) {
    this.titleElement.textContent = title;
  };

  EntrySheet.prototype.getTopMostWindow = function() {
    return this;
  };

  EntrySheet.prototype.setFrontWindow = function(front) {
    this.frontWindow = front;
  };

  EntrySheet.prototype.unsetFrontWindow = function() {
    this.frontWindow = null;
  };

  EntrySheet.prototype.isActive = function() {
    return this.element && this.element.classList.contains('active');
  };

  EntrySheet.prototype.respondToHierarchyEvent = function(evt) {
    if (this['_handle_' + evt.type]) {
      return this['_handle_' + evt.type](evt);
    }
    return true;
  };

  EntrySheet.prototype._handle_launchactivity = function(evt) {
    if (!this.element) {
      return true;
    }
    this.element.dispatchEvent(new CustomEvent('_launchactivity', {
      detail: evt.detail
    }));
    return false;
  };

  EntrySheet.prototype.open = function() {
    this.publish('-activating');
    // Transtion won't happen if adding class directly
    setTimeout(function() {
      this.element.classList.add('active');
      this.publish('-activated');
    }.bind(this));
  };

  EntrySheet.prototype.close = function() {
    this.publish('-deactivating');
    this.element.addEventListener('transitionend', function onTransitionend() {
      this.publish('-deactivated');
      this.element.removeEventListener('transitionend', onTransitionend);
      this.element.classList.remove('disappearing');
      this.element.classList.remove('active');

      // Here we remove entire element once the close button is pressed.
      this.container.removeChild(this.element);

      Service.request('unregisterHierarchy', this);
      Service.unregister('open', this);
      Service.unregister('close', this);
    }.bind(this));
    this.element.classList.add('disappearing');
  };

  EntrySheet.prototype.view = function() {
    return `<div class="${EntrySheet.className}">
      <div class="wrapper">
        <section role="region" class="skin-organic header">
          <gaia-header action="close">
            <h1 class="title">
              <bdi class="${EntrySheet.className}-title"></bdi>
            </h1>
          </gaia-header>
          <div class="throbber"></div>
        </section>
        <div class="content">
        </div>
      </div>
    </div>`;
  };

  EntrySheet.prototype.render = function() {
    this.container.insertAdjacentHTML('beforeend', this.view());
    this.header =
      this.container.querySelector('.' + EntrySheet.className + ' gaia-header');
    this.titleElement =
      this.container.querySelector('.' + EntrySheet.className + '-title');
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
        this.browser instanceof BrowserFrame) {
      this.browser.element.addEventListener('mozbrowserloadstart',
        function onLoadStart() {
          self.throbberElement.dataset.loading = true;
        });
      this.browser.element.addEventListener('mozbrowserloadend',
        function onLoadEnd() {
          delete self.throbberElement.dataset.loading;
        });
      this.content.appendChild(this.browser.element);
    } else if (this.browser && this.browser.nodeType == 1) {
      // In case the content isn't a browserElement object but a DOM element.
      this.content.appendChild(this.browser);
    }

    this.setTitle(this.title);
    this.header.addEventListener('action', function() {
      self.close();
    });
  };
  exports.EntrySheet = EntrySheet;
  Service.register('instantiate', EntrySheet);
  Service.register('close', EntrySheet);
}(window));
