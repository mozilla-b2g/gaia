Evme.Banner = new function Evme_Banner() {
    var NAME = 'Banner', self = this,
        el = null, timerId = null;

    this.init = function init(options) {
        !options && (options = {});

        el = options.el;
        
        Evme.EventHandler.trigger(NAME, 'init');
    };
    
    this.show = function show(property, args, latency) {
        if (timerId) {
            window.clearTimeout(timerId);
        }
        
        latency = latency || 4000;
        timerId = window.setTimeout(self.hide, latency);
        
        el.innerHTML = '<p ' + Evme.Utils.l10nAttr(NAME, property, args) + '></p>';
        el.classList.add('visible');
        
        Evme.EventHandler.trigger(NAME, 'show');
    };

    this.hide = function hide() {
        timerId = null;
        el.classList.remove('visible');
        
        Evme.EventHandler.trigger(NAME, 'hide');
    };

    this.getElement = function getElement() {
        return el;
    };
}