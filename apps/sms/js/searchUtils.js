'use strict';

// We move the search utility function to independent js to retain the search
// ablity. Developer can include this search util when needed.
// How to use :
//   SearchUtils.renderResultView(keyword, target_view, contact_updater)
// and it will replace the view with search result list.

var SearchUtils = {
  createHighlightHTML: function su_createHighlightHTML(text, regExp, style) {
    var sliceStrs = text.split(regExp);
    var patterns = text.match(regExp);
    if (!patterns) {
      return Utils.escapeHTML(text);
    }
    var str = '';
    for (var i = 0; i < patterns.length; i++) {
      str = str +
          Utils.escapeHTML(sliceStrs[i]) + '<span class="'+ style + '">' +
          Utils.escapeHTML(patterns[i]) + '</span>';
    }
    str += Utils.escapeHTML(sliceStrs.pop());
    return str;
  },

  createNewConversation: function su_createNewConversation(conversation, reg) {
    var dataName = escapeHTML(conversation.name || conversation.num, true);
    var name = escapeHTML(conversation.name);
    var bodyText = conversation.body.split('\n')[0];
    var bodyHTML = this.createHighlightHTML(bodyText, reg);

    return '<div class="item">' +
           '  <label class="fake-checkbox">' +
           '    <input data-num="' +
                conversation.num + '"' + 'type="checkbox"/>' +
           '    <span></span>' +
           '  </label>' +
           '  <a href="#num=' + conversation.num + '"' +
           '     data-num="' + conversation.num + '"' +
           '     data-name="' + dataName + '"' +
           '     data-notempty="' +
                 (conversation.timestamp ? 'true' : '') + '"' +
           '     class="' +
                 (conversation.unreadCount > 0 ? 'unread' : '') + '">' +
           '    <span class="unread-mark">' +
           '      <i class="i-unread-mark"></i>' +
           '    </span>' +
           '    <div class="name">' + name + '</div>' +
                (!conversation.timestamp ? '' :
           '    <div class="time ' +
                  (conversation.unreadCount > 0 ? 'unread' : '') +
           '      " data-time="' + conversation.timestamp + '">' +
                  giveHourMinute(conversation.timestamp) +
           '    </div>') +
           '    <div class="msg">"' + bodyHTML + '"</div>' +
           '    <div class="unread-tag"></div>' +
           '    <div class="photo"></div>' +
           '  </a>' +
           '</div>';
  },

  renderResultView: function su_renderResultView(str, view, contactUpdater) {
    if (!str) {
      // Leave the empty view when no text in the input.
      view.innerHTML = '';
      return;
    }

    var self = this;
    MessageManager.getMessages(function getMessagesCallback(messages) {
      str = str.replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&');
      var fragment = '';
      var searchedNum = {};
      for (var i = 0; i < messages.length; i++) {
        var reg = new RegExp(str, 'ig');
        var message = messages[i];
        var htmlContent = message.body.split('\n')[0];
        var num = message.delivery == 'received' ?
                  message.sender : message.receiver;
        var read = message.read;

        if (searchedNum[num])
          searchedNum[num].unreadCount += !message.read ? 1 : 0;

        if (!reg.test(htmlContent) || searchedNum[num])
          continue;

        var msgProperties = {
          'hidden': false,
          'body': message.body,
          'name': num,
          'num': num,
          'timestamp': message.timestamp.getTime(),
          'unreadCount': !read ? 1 : 0,
          'id': i
        };
        searchedNum[num] = msgProperties;
        var msg = self.createNewConversation(msgProperties, reg);
        fragment += msg;

      }
      view.innerHTML = fragment;

      // Update the conversation sender/receiver name with contact data.
      if (contactUpdater) {
        var conversationList = view.querySelectorAll('a');
        for (var i = 0; i < conversationList.length; i++) {
          contactUpdater(conversationList[i]);
        }
      }
    }, null);
  }
};
