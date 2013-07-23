var Rocketbar = {
  nodeNames: [
    'activation-icon',
    'overlay'
  ],

  DOM: {},

  init: function rocketbar_init() {
    this.nodeNames.forEach(function(name) {
      this.DOM[this.toCamelCase(name)] = document.getElementById('rocketbar-' + name);
    }, this);
    
    this.DOM.activationIcon.addEventListener('click', this.show.bind(this));
    this.DOM.overlay.addEventListener('click', this.hide.bind(this));
  },
  
  toCamelCase: function toCamelCase(str) {
     return str.replace(/\-(.)/g, function replacer(str, p1) {
       return p1.toUpperCase();
     });
  },
  
  show: function() {
    this.DOM.overlay.classList.add('active');
  },
  
  hide: function() {
    this.DOM.overlay.classList.remove('active');
  }
}

Rocketbar.init();