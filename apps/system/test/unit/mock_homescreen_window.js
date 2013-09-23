var MockHomescreenWindow = function(value) {
  this.isHomescreen = true;
  this.ensure = function() {};
  this.kill = function() {};
  this.manifestURL = value;
};
