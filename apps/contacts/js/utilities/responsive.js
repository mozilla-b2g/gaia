/*
 *  Name: Responsive
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author Ismael González (igonzaleznicolas@gmail.com)
 *
 *  This files is in charge of calculating the amoutn of resizing needed for the device
 *
*/

if(typeof window.responsive === 'undefined') {
  (function(document) {

  var responsive = window.responsive = {};

  //Base config
  responsive.base =  {
    font: 62.5,
    width: 320,
    height: 480,
    pixelRatio: 1,
    ratio: function () {
       return this.height / this.width;
    }
  };

  //Get some information of the device
  responsive.device =  {
    width: function () {
      return window.innerWidth;
    },
    height: function () {
      return window.innerHeight;
    },
    pixelRatio: function () {
      if ( window.devicePixelRatio  ) {
        return window.devicePixelRatio;
      } else {
        return base.pixelRatio;
      }
    },
    ratio: function () {
      var raw = this.height() / this.width();
      decimal_split(raw);
    }
  };

  //Scale function
  function scale(e) {
    //Ratio calculation
    var deviceWidth = this.device.width();
    var deviceHeight = this.device.height();

    var scale_ratio =  deviceWidth / this.base.width;

    scale_ratio = scale_ratio.toFixed(2);

    var root = document.documentElement;
    var font_size = this.base.font;

    //Check for non base width devices
    if (  this.base.width != deviceWidth) {
      font_size = scale_ratio * this.base.font;
    }

    //Check for portrait devices
    if ( deviceWidth === deviceHeight || deviceWidth > deviceHeight ) {
      font_size = deviceWidth / 1000 * this.base.font;
    }

    //Apply final font-size
    font_size = font_size.toFixed(2);
    root.style.fontSize = font_size + "%";

    window.console.log('Responsive has been executed!');
  };

  scale.bind(responsive)();

  })(document);
}
