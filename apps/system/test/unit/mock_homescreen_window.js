var MockHomescreenWindow = function(value) {
  this.isHomescreen = true;
  this.ensure = function() {};
  this.kill = function() {};
  this.toggle = function() {};
  this.fadeIn = function() {};
  this.fadeOut = function() {};
  this.manifestURL = value;
  this.origin = 'home';
};
