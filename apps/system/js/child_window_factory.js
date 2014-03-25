'use strict';
/* global AppWindow */

(function(window) {
  /**
   * ChildWindowFactory is a submodule of AppWindow,
   * its responsbility is to deal with window.open request
   * from mozbrowser iframe to open a proper new window.
   *
   * Note that HomescreenWindow won't have this submodule installed
   * because it has special window.open features to open WrapperWindow.
   * For some reason we don't want AttentionWindow and ActivityWindow
   * to be able to open new window as well.
   *
   * When an app is opening a page within same origin via window.open,
   * the generated new app window would be linked to its parent.
   * You could refer to the opener via <code>this.parentWindow</code>
   * and refer the openee via <code>this.childWindow</code>.
   *
   * The current navigation strategy is to simulate "one way" history,
   * so one window could have at most one child window.
   *
   * @param {AppWindow} app The ordering window of this factory.
   */
  var ChildWindowFactory = function ChildWindowFactory(app) {
    this.app = app;
    this.app.element.addEventListener('mozbrowseropenwindow', this);
  };

  ChildWindowFactory.prototype.handleEvent =
    function cwf_handleEvent(evt) {
      switch (evt.detail.features) {
        case 'dialog':
          // Open dialogWindow / PopupWindow
          this.createDialogWindow();
          break;
        case 'attention':
          // Open attentionWindow
          if (!this.createAttentionWindow(evt)) {
            this.createChildWindow();
          }
          break;
        default:
          this.createChildWindow(evt);
          // Open appWindow / browserWindow
          break;
      }
    };

  ChildWindowFactory.prototype.createDialogWindow = function() {
    // XXX: ChildWindow is not implemented yet.
    // Now PopupManager catches this event.
    if (typeof(!self.DialogWindow) == 'undefined') {
      return false;
    }
  };

  ChildWindowFactory.prototype._sameOrigin = function(url1, url2) {
    var a = url1.split('/');
    var b = url2.split('/');
    return (a[0] === b[0] && a[2] === b[2]);
  };

  ChildWindowFactory.prototype.createChildWindow = function(evt) {
    var configObject = {
      url: evt.detail.url,
      name: this.app.name,
      iframe: evt.detail.frameElement,
      origin: this.app.origin
    };
    if (this._sameOrigin(this.app.origin, evt.detail.url)) {
      configObject.manifestURL = this.app.manifestURL;
      configObject.parentWindow = this.app;
    } else {
      configObject.name = '';
      configObject.origin = evt.detail.url;
    }
    var childWindow = new AppWindow(configObject);
    childWindow.requestOpen();
  };

  ChildWindowFactory.prototype.createAttentionWindow = function(evt) {
    // XXX: AttentionWindow is not implemented yet.
    // Now AttentionScreen catches this event.
    if (typeof(!self.AttentionWindow) == 'undefined') {
      return false;
    }
  };

  window.ChildWindowFactory = ChildWindowFactory;
}(self));
