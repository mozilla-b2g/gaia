
function HUDHooks(hooks) {
  Cu.import('resource:///modules/HUDService.jsm');
  Cu.import("resource:///modules/PropertyPanel.jsm");
      PropertyPanel.getChildItems = function(aItem, aRootElement) {
        dump('rejrker');
      };

  this._init(HUDService.currentContext(), hooks);
}

HUDHooks.prototype = {
  _init: function hudHooks_init(context, hooks) {
    HUDService.wakeup();

    let browser = context.gBrowser.selectedBrowser;
    let notificationBoxId = browser.parentNode.parentNode.id;
    HUDService.registerActiveContext(notificationBoxId);

    HUDService.windowInitializer(window);

    let hudId = 'hud_' + notificationBoxId;
    HUDService.disableAnimation(hudId);

    // install the hooks
    let hudRef = HUDService.getHudReferenceById(hudId);
    for (let prop in hooks) {
      let root = hudRef[prop];
      for (let method in hooks[prop])
        root[method] = hooks[prop][method].bind(root);
    }

    // Ensure the hud takes all the window available height
    let toolbar = context.document.getElementById('viewGroup');
    toolbar.classList.add('remote-console');

    let hud = browser.ownerDocument.getElementById(hudId);
    context.addEventListener('resize', function resizeHandler() {
      hud.style.height = context.innerHeight + 'px';
    });
  }
};

