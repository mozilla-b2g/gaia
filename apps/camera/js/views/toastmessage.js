define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var find = require('lib/find');
var orientation = require('lib/orientation');
/**
 * Exports
 */

module.exports = View.extend({
  className: 'lowbattery ',
  divId: 'messageDiv',
  showBottomToast:function(message){
    this.removeMessage();
    var mshDiv = document.createElement('div');
    mshDiv.id= this.divId;
    mshDiv.classList.add('bottomToastmsg');
    var span = document.createElement('span');
    span.innerHTML = message;
    mshDiv.appendChild(span);
    document.body.appendChild(mshDiv);
    this.setOrientation(orientation.get());
    orientation.on('orientation', this.setOrientation);
   },
  showToastMsg:function(message){
    this.removeMessage();
    var mshDiv = document.createElement('div');
    mshDiv.id= this.divId;
    mshDiv.classList.add('toastmessage');
    var span = document.createElement('span');
    span.innerHTML = message;
    mshDiv.appendChild(span);
    document.body.appendChild(mshDiv);
    this.setOrientation(orientation.get());
    orientation.on('orientation', this.setOrientation);
   },
  showFullScreenMessage:function(title,message){
    this.removeMessage();
    var mshDiv = document.createElement('div');
    mshDiv.id= this.divId;
    mshDiv.classList.add('fullscreenmsg');
    var titlediv = document.createElement('div');
    mshDiv.appendChild(titlediv);
    titlediv.classList.add('msgTitle');
    titlediv.innerHTML = title;
    var messagediv = document.createElement('div');
    mshDiv.appendChild(messagediv);
    messagediv.classList.add('message');
    messagediv.innerHTML = message;
    document.body.appendChild(mshDiv);
  },
  showBlinkToastMsg:function(msg){
    this.removeMessage();
    var mshDiv = document.createElement('div');
    mshDiv.id= this.divId;
    mshDiv.classList.add('blinkToast');
    var span = document.createElement('span');
    span.innerHTML = msg;
    mshDiv.appendChild(span);
    document.body.appendChild(mshDiv);
    this.setOrientation(orientation.get());
    orientation.on('orientation', this.setOrientation);
  },
  removeMessage:function(){
    var elm = find('#'+this.divId,document);
    if (elm){
      elm.innerHTML = '';
      elm.parentElement.removeChild(elm);
    }
  },
  setOrientation: function(orientation) {
  var elm = find('#'+this.divId,document);
  if (elm){
    elm.dataset.orientation = orientation;
  }
  },
  setLowBatteryMesg:function(value){
    var msg =  this.lowBatteryMsg(value);
    if (value <= 15 && value >6){
      this.showBottomToast(msg);
    }
    else if (value == 6){
      this.showBlinkToastMsg(msg);
    }
    else if (value <= 5){
      var title = ' Low Battery ';
      msg = 'The battery is too low to use the Camera';
      this.showFullScreenMessage(title,msg);
    }
  },
  lowBatteryMsg:function(value){
    var msg = null;
    if (value <=15 && value >10){
      msg = '<img class="lowbattery" '+
      ' src = "style/images/Battery_15_Percent.svg"/>'+
      ' <br/>You have '+value+'% battery remaining';
    }else if (value <= 10 && value >6){
      msg = '<img class="lowbattery" '+
      ' src = "style/images/Battery_10_Percent.svg"/>'+
      ' <br/>You have '+value+'% battery remaining';
    }else if (value == 6){
      msg = '<img class="lowbattery" '+
      ' src = "style/images/Battery_10_Percent.svg" />'+
      ' <br/>Critically low battery';
    }
    return msg;
}

});

});