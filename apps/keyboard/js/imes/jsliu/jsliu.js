var JSLiuGlue = function JSLiuGlue() {
  this.keyboard = null;
  this.messageQueue = [];
  this.ready = false;
}

JSLiuGlue.prototype.DEBUG = true;

JSLiuGlue.prototype.init = function(keyboard) {
  this.keyboard = keyboard;
  this.worker = new Worker(this.keyboard.path + '/worker.js');
  this.worker.addEventListener('message', function(e) {
    var data = e.data;

    if (this.DEBUG) {
      console.log(data);
    }

    switch (data.cmd) {
      case 'ready':
        this.ready = true;
        while (msg = this.messageQueue.shift()) {
          keyboard.postMessage(msg);
        }
        this.messageQueue = [];
        break;
      case 'sendCandidates':
        keyboard.sendCandidates(data.value);
        break;
      case 'setComposition':
        keyboard.setComposition(data.value);
        break;
      case 'endComposition':
        keyboard.endComposition(data.value);
        break;
      case 'return':
        if (!data.value) {
          keyboard.sendKey(data.keycode);
        }
        break;
    }
  }, false);
}

JSLiuGlue.prototype.activate = function() {
  if (this.DEBUG) {
    console.log('jsliu:activated');
  }
}

JSLiuGlue.prototype.deactivate = function() {
  if (this.DEBUG) {
    console.log('jsliu:deactivated');
  }
}

JSLiuGlue.prototype.empty = function() {
  this.worker.postMessage({ cmd: 'handle_Escape' });
}

JSLiuGlue.prototype.click = function(keycode, x, y) {
  if (this.DEBUG) {
    console.log('jsliu:key:', keycode);
  }

  var msg = { cmd: 'handle_Key', value: keycode };
  if (!this.ready) {
    this.messageQueue.push(msg);
  }

  this.worker.postMessage(msg);
}

JSLiuGlue.prototype.select = function(word, data) {
  this.keyboard.endComposition(word);
  this.worker.postMessage({ cmd: 'handle_Escape' });
}


var jsliu = new JSLiuGlue();

// Expose the engine to the Gaia keyboard
if (typeof InputMethods !== 'undefined') {
  InputMethods.jsliu = jsliu;
}
