'use strict';

(function(exports) {

  const CONFIRM_DIALOG_ID = 'confirmation-message';

  function showConfirm(descriptor) {
    var title = document.getElementById(CONFIRM_DIALOG_ID + '-title');
    title.textContent = descriptor.title;

    var body = document.getElementById(CONFIRM_DIALOG_ID + '-body');
    body.textContent = descriptor.body;

    var dialog = document.getElementById(CONFIRM_DIALOG_ID);

    var cancelButton = document.getElementById(CONFIRM_DIALOG_ID + '-cancel');
    cancelButton.textContent = descriptor.cancel.title;

    var confirmButton = document.getElementById(CONFIRM_DIALOG_ID + '-ok');
    confirmButton.textContent = descriptor.confirm.title;
    confirmButton.className = descriptor.confirm.danger ? 'danger' :
                                                          'recommend';

    var handler = {
      handleEvent: function(e) {
        if (e.type === 'click') {
          var cb = e.target === confirmButton ? descriptor.confirm.cb :
                                                descriptor.cancel.cb;
          typeof cb === 'function' && cb();
        }

        window.removeEventListener('hashchange', handler);
        cancelButton.removeEventListener('click', handler);
        confirmButton.removeEventListener('click', handler);
        dialog.setAttribute('hidden', '');
      }
    };

    cancelButton.addEventListener('click', handler);
    confirmButton.addEventListener('click', handler);
    window.addEventListener('hashchange', handler);

    dialog.removeAttribute('hidden');
  }

  function AppManager() {
    var self = this;
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      self.app = evt.target.result;
      window.dispatchEvent(new CustomEvent('appmanager-ready'));
    };
    window.addEventListener('gaiagrid-uninstall-mozapp', this);
    window.addEventListener('gaiagrid-cancel-download-mozapp', this);
    window.addEventListener('gaiagrid-resume-download-mozapp', this);
  }

  AppManager.prototype = {
    get self() {
      return this.app;
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      var _ = navigator.mozL10n.get;

      var nameObj = {
        name: e.detail && e.detail.name
      };

      switch(e.type) {
        case 'gaiagrid-uninstall-mozapp':
          showConfirm({
            title: _('delete-title', nameObj),
            body: _('delete-body', nameObj),
            cancel: {
              title: _('cancel')
            },
            confirm: {
              title: _('delete'),
              danger: true,
              cb: function() {
                navigator.mozApps.mgmt.uninstall(e.detail.app);
              }
            }
          });
          break;

        case 'gaiagrid-cancel-download-mozapp':
          showConfirm({
            title: _('stop-download-title', nameObj),
            body: _('stop-download-body'),
            cancel: {
              title: _('cancel')
            },
            confirm: {
              title: _('stop-download-action'),
              danger: true,
              cb: function() {
                e.detail.app.cancelDownload();
              }
            }
          });
          break;

        case 'gaiagrid-resume-download-mozapp':
          showConfirm({
            title: _('resume-download-title'),
            body: _('resume-download-body', nameObj),
            cancel: {
              title: _('cancel')
            },
            confirm: {
              title: _('resume-download-action'),
              cb: function() {
                e.detail.app.download();
              }
            }
          });
          break;
      }
    }
  };

  exports.appManager = new AppManager();

}(window));
