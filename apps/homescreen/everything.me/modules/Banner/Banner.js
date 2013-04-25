Evme.Banner = new function Evme_Banner() {
    var NAME = 'Banner', self = this,
        el = null, timerId = null,
        
        LATENCY = 4000;

    this.init = function init(options) {
        !options && (options = {});

        Evme.EventHandler.trigger(NAME, 'init');
    };
    
    this.show = function show(property, args, elContainer) {
        if (timerId) {
            window.clearTimeout(timerId);
        }
        
        if (el) {
          el.parentNode.removeChild(el);
        }
        
        el = Evme.$create('section', {
          'id': 'evmeBanner',
          'role': 'status'
        }, '<p ' + Evme.Utils.l10nAttr(NAME, property, args) + '></p>');
        
        (elContainer || Evme.Utils.getContainer()).appendChild(el);
        
        window.setTimeout(function onShow(){
          el && el.classList.add('visible');
        }, 0);
        
        timerId = window.setTimeout(self.hide, LATENCY);
        
        Evme.EventHandler.trigger(NAME, 'show');
    };

    this.hide = function hide() {
        timerId = null;
        
        if (!el) {
          return false;
        }
        
        el.addEventListener('transitionend', function onTransitionEnd() {
          if (el) {
            el.removeEventListener('transitionend', onTransitionEnd);
            el.parentNode.removeChild(el);
            el = null;
          }
        });
        
        el.classList.remove('visible');
        
        Evme.EventHandler.trigger(NAME, 'hide');
        
        return true;
    };

    this.getElement = function getElement() {
        return el;
    };
}