
const Gaia = {
  startup: function () {
    try {
      Components.utils.import("resource:///modules/HUDService.jsm");
      var xulWindow = HUDService.currentContext();

      // These objects are what and where to attach the web console
      var browser = xulWindow.gBrowser;
      var linkedBrowser = browser.selectedTab.linkedBrowser;
      var ownerDocument = browser.selectedTab.ownerDocument;

      // XXX In the future linkedBrowser should be a proxy to be
      // able to autocomplete from the content of the remote page
      let context = {
        linkedBrowser: linkedBrowser,
        ownerDocument: ownerDocument,
      };
      HUDService.activateHUDForContext(context);

      // Ensure the hud takes all the window available height
      let tabId = browser.getNotificationBox(linkedBrowser).id;
      let hud = ownerDocument.getElementById('hud_' + tabId);
      hud.style.height = xulWindow.innerHeight + 'px';
    } catch (e) {
      dump(e);
    }
  }
};

