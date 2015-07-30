'use strict';

/* global EmojiKeyView */

require('/js/views/base_view.js');
require('/js/views/emoji_key_view.js');

suite('Views > KeyView', function() {
  var emojiKeyView = null;
  var viewManager = {
    registerView: sinon.stub()
  };

  suite('some basic functions',  function() {
    setup(function() {
      var target = {};
      var options = {};
      emojiKeyView = new EmojiKeyView(target, options, viewManager);
    });

    test(' > render()', function() {
      assert.equal(emojiKeyView.element, null);

      emojiKeyView.render();
      assert.notEqual(emojiKeyView.element, null);
      assert.isTrue(emojiKeyView.element.classList.contains('emoji'));
    });

    test('additional class name', function() {
      var key = {
        value: 'k',
      };

      var options = {
       classNames: ['another-className']
      };

      var keyView = new EmojiKeyView(key, options, viewManager);
      keyView.render();

      options.classNames.forEach(function(className) {
        assert.isTrue(keyView.element.classList.contains(className));
      });
    });

    test('invoke viewManager.registerView', function() {
      var mockViewManager = {
        registerView: this.sinon.stub()
      };

      var target = {};
      var keyView = new EmojiKeyView(target, {}, mockViewManager);
      keyView.render();

      assert.isTrue(mockViewManager.registerView.calledOnce);
      assert.isTrue(mockViewManager.registerView.calledWith(target,
                                                            keyView));
    });
  });
});
