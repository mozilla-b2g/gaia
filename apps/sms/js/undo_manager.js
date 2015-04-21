/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals ThreadListUI, Threads, Thread, Drafts
*/
/*exported UndoManager */
(function(exports) {
  'use strict';

  var UndoManager = {
    UNDO_DURATION: 10000,
    // Used to track timeouts
    timeouts: {
      onUndo: null
    },

    threadDeleteUndo: function undo_threadDeleteUndo (draftIds, threadIds) {
      this.hidetoast(this.threadDeleteUndo(draftIds, threadIds));

      if(draftIds.length) {
        draftIds.forEach(function(threadId) {
          ThreadListUI.appendThread(
            Thread.create(Drafts.get(threadId))
          );
        });
      }
      if(threadIds.length) {
        threadIds.forEach(function(threadId) {
          ThreadListUI.appendThread(Threads.get(threadId));
        });
      }
    },

    messageDeleteUndo: function undo_messageDeleteUndo (delNumList, threadEmpty) {
      this.hidetoast(this.messageDeleteUndo);

      var request = MessageManager.getMessage(delNumList[0]);
      request.onsuccess = (function() {
        var message = request.result;
        toast.lastElementChild.removeEventListener('click', undoAction);
        toast.classList.add('hide');
        ThreadListUI.undoCheck = 0;
        console.log('undo');
        if (threadEmpty) {
          ThreadListUI.appendThread(Threads.get(message.threadId));
        } else {
          delNumList.forEach(function(id) {
            var request = MessageManager.getMessage(id);

            request.onsuccess = (function() {
              ThreadUI.appendMessage(request.result);
            });
          });
        }
      });
    },

    readUnreadUndo: function undo_readUnreadUndo (threadToMark, isRead) {
      this.hidetoast(this.readUnreadUndo);

      threadToMark.forEach((id) => {
        var thread = Threads.get(id);
        thread.unreadCount = isRead ? 1 : 0;
         ThreadListUI.mark(thread.id, isRead ? 'unread' : 'read');
      });
    },

    hidetoast: function function_name (undoAction) {
      toast.classList.add('hide');
      clearTimeout(this.timeouts.onUndo);
      this.timeouts.onUndo = null;
      toast.firstElementChild.removeAttribute('data-l10n-id');
      toast.firstElementChild.textContent = '';
    }
  };

  exports.UndoManager = UndoManager;

}(this));
