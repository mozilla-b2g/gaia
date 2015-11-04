/* global App, Pages */
'use strict';

(function(exports) {

  /**
   * Time after receiving a handled hashchange that we ignore hashchange
   * events for.
   */
  const HASH_CHANGE_DEBOUNCE = 100;

  function AppWindow() {
    this.header = document.getElementById('page-indicator-header');
    this.indicator = document.getElementById('page-indicator');
    this.panels = document.getElementById('panels');
    this.shadow = document.getElementById('shadow');

    this.apps = new App();
    this.pages = new Pages();

    // Panel visibility state
    this.appsVisible = undefined;

    // Home-button handling
    this.ignoreHashChangeTimeout = null;

    // Signal handlers
    this.indicator.addEventListener('keypress', this);
    this.panels.addEventListener('scroll', this);
    window.addEventListener('hashchange', this, true);
    window.addEventListener('localized', this);
    document.addEventListener('visibilitychange', this);

    // Update the panel indicator
    this.updatePanelIndicator();

    // Application has finished initialisation
    window.performance.mark('navigationInteractive');
  }

  AppWindow.prototype = {
    updatePanelIndicator: function() {
      var appsVisible = this.panels.scrollLeft <= this.panels.scrollLeftMax / 2;
      if (this.appsVisible !== appsVisible) {
        this.appsVisible = appsVisible;

        this.header.setAttribute('data-l10n-id', appsVisible ?
          'apps-panel' : 'pages-panel');

        this.indicator.children[0].classList.toggle('active', appsVisible);
        this.indicator.children[1].classList.toggle('active', !appsVisible);
        this.indicator.setAttribute('aria-valuenow', appsVisible ? 1 : 2);
        this.indicator.setAttribute('data-l10n-args', JSON.stringify({
          currentPage: appsVisible ? 1 : 2,
          totalPages: 2
        }));

        this.apps.panel.setAttribute('aria-hidden', !appsVisible);
        this.pages.panel.setAttribute('aria-hidden', appsVisible);

        if (appsVisible) {
          this.pages.scrollable.removeEventListener('scroll', this);
          this.apps.scrollable.addEventListener('scroll', this);
        } else {
          this.apps.scrollable.removeEventListener('scroll', this);
          this.pages.scrollable.addEventListener('scroll', this);
        }

        this.updateShadowState();
      }
    },

    updateShadowState: function() {
      var position = this.appsVisible ?
        this.apps.scrollable.scrollTop : this.pages.scrollable.scrollTop;
      var scrolled = position > 1;
      if (this.shadow.classList.contains('visible') !== scrolled) {
        this.shadow.classList.toggle('visible', scrolled);
      }
    },

    handleEvent: function(e) {
      switch (e.type) {
      // Switch between panels
      case 'keypress':
        if (!e.ctrlKey) {
          return;
        }

        switch (e.keyCode) {
          case e.DOM_VK_RIGHT:
            this.panels.scrollTo(
              { left: this.panels.scrollLeftMax, top: 0, behavior: 'smooth' });
            return;
          case e.DOM_VK_LEFT:
            this.panels.scrollTo(
              { left: 0, top: 0, behavior: 'smooth' });
            return;
        }
        return;

      // Display the top shadow when scrolling down
      case 'scroll':
        if (e.target === this.panels) {
          this.updatePanelIndicator();
        } else {
          this.updateShadowState();
        }
        return;

      // Cancel edit modes/scroll to the top/scroll to apps on home-button
      case 'hashchange':
        if (document.hidden || this.ignoreHashChangeTimeout !== null) {
          return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();

        this.ignoreHashChangeTimeout = setTimeout(() => {
          this.ignoreHashChangeTimeout = null;
        }, HASH_CHANGE_DEBOUNCE);

        // If a dialog is showing, cancel the dialog
        for (var dialog of this.apps.dialogs.concat(this.pages.dialogs)) {
          if (!dialog.opened) {
            continue;
          }

          dialog.close();
          return;
        }

        // If we're in edit mode, cancel edit mode
        if (this.apps.editMode) {
          this.apps.exitEditMode();
          return;
        }
        if (this.pages.editMode) {
          this.pages.exitEditMode();
          return;
        }

        // If we're on the pages panel and scrolled to the top, show apps
        if (!this.appsVisible && this.pages.scrollable.scrollTop === 0) {
          this.panels.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
          return;
        }

        // Otherwise, scroll the visible panel to the top
        var visiblePanel = this.appsVisible ?
          this.apps.scrollable : this.pages.scrollable;
        visiblePanel.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
        return;

      case 'localized':
        this.updatePanelIndicator();
        return;

      // Exit edit mode if the user switches away from the home screen (e.g.
      // by locking the phone).
      case 'visibilitychange':
        if (document.hidden) {
          this.apps.exitEditMode();
          this.pages.exitEditMode();
        }
        return;
      }
    }
  };

  exports.AppWindow = AppWindow;

}(window));
