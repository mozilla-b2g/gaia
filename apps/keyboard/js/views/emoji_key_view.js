'use strict';

/* global BaseView */

(function(exports) {

function EmojiKeyView() {
  BaseView.apply(this, arguments);
}

EmojiKeyView.prototype = Object.create(BaseView.prototype);

EmojiKeyView.prototype.render = function() {
  var contentNode = document.createElement('button');
  if (this.options.classNames) {
    contentNode.classList.add.apply(contentNode.classList,
                                    this.options.classNames);
  }

  contentNode.classList.add('emoji');

  contentNode.innerHTML = this.options.outputChar ||
                          this.target.value ||
                          this.target.compositeKey;

  this.element = contentNode;
  this.viewManager.registerView(this.target, this);
};

exports.EmojiKeyView = EmojiKeyView;

})(window);
