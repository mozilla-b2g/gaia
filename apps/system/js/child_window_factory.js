'use strict';
/* global AppWindow, PopupWindow */

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
   * the generated new app window would be linked to its caller.
   * You could refer to the opener via <code>this.previousWindow</code>
   * and refer the openee via <code>this.nextWindow</code>.
   *
   * On the other hand, if <code>"dialog"</code> feature is specified in
   * window.open, we will open a front window, which is an instance of
   * PopupWindow, on the caller and set it as the rear window of the callee.
   * You could access the dialog's opener via <code>this.rearWindow</code>
   * and access the openee via <code>this.frontWindow</code> in the opener.
   *
   * At most an appWindow instance could have one front window and
   * one next window.
   *
   * @param {AppWindow} app The ordering window of this factory.
   */
  var ChildWindowFactory = function ChildWindowFactory(app) {
    this.app = app;
    this.app.element.addEventListener('mozbrowseropenwindow', this);
  };

  ChildWindowFactory.prototype.handleEvent =
    function cwf_handleEvent(evt) {
      var stopped = false;
      switch (evt.detail.features) {
        case 'dialog':
          // Open PopupWindow
          stopped = this.createPopupWindow(evt);
          break;
        case 'attention':
          // Open attentionWindow
          if (!this.createAttentionWindow(evt)) {
            this.createChildWindow();
          }
          break;
        default:
          stopped = this.createChildWindow(evt);
          // Open appWindow / browserWindow
          break;
      }

      if (stopped && 'stopPropagation' in evt) {
        evt.stopPropagation();
      }
    };

  ChildWindowFactory.prototype.createPopupWindow = function(evt) {
    if (typeof(!self.PopupWindow) == 'undefined') {
      return false;
    }

    var configObject = {
      url: evt.detail.url,
      name: this.app.name,
      iframe: evt.detail.frameElement,
      origin: this.app.origin,
      rearWindow: this.app
    };
    var childWindow = new PopupWindow(configObject);
    childWindow.open();
    return true;
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
      configObject.previousWindow = this.app;
    } else {
      configObject.name = '';
      configObject.origin = evt.detail.url;
    }
    var childWindow = new AppWindow(configObject);
    childWindow.requestOpen();
    return true;
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
