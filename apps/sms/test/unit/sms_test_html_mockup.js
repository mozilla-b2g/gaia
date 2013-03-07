'use strict';

function renderThreadListHeader() {
  return '<menu type="toolbar">' +
            '<a href="#new" id="icon-add">' +
              '<span class="icon icon-compose"></span>' +
            '</a>' +
            '<a href="#edit" id="icon-edit-threads">' +
              '<span class="icon icon-edit"></span>' +
            '</a>' +
          '</menu>';
}

function renderThreadListEdit() {
  return '<section>' +
            '<header>' +
              '<button id="threads-cancel-button">' +
                '<span data-l10n-id="cancel" class="icon icon-close">' +
                  'close</span>' +
              '</button>' +
              '<menu type="toolbar">' +
                '<button id="threads-delete-button" data-l10n-id="delete">' +
                  'delete</button>' +
              '</menu>' +
              '<h1 id="list-edit-title" data-l10n-id="editMode">' +
                  'Edit mode</h1>' +
            '</header>' +
          '</section>' +
          '<menu>' +
            '<button id="deselect-all-threads" class="edit-button disabled" ' +
              'data-l10n-id="deselect-all">' +
              'None' +
            '</button>' +
            '<button id="select-all-threads" class="edit-button" ' +
              'data-l10n-id="select-all">' +
              'All' +
            '</button>' +
          '</menu>';
}

function renderThreadMsgHeader() {
  return '<a role="link" id="go-to-threadlist">' +
            '<span class="icon icon-back"></span>' +
          '</a>' +
          '<menu type="toolbar">' +
            '<a id="icon-contact">' +
              '<span class="icon icon-user"></span>' +
            '</a>' +
            '<a href="#edit" id="icon-edit">' +
              '<span class="icon icon-edit"></span>' +
            '</a>' +
          '</menu>' +
          '<h1 id="header-text" data-l10n-id="messages" aria-hidden="true">' +
            'Messages</h1>' +
          '<form id="messages-tel-form">' +
            '<input id="receiver-input" type="text" name="tel" class="tel" />' +
            '<span id="clear-search" role="button" class="icon icon-clear">' +
              '</span>' +
          '</form>';
}

function renderThreadMsgEdit() {
  return '<section>' +
            '<header>' +
              '<button id="messages-cancel-button">' +
                '<span data-l10n-id="cancel" class="icon icon-close">' +
                  'close</span>' +
              '</button>' +
              '<menu type="toolbar">' +
                '<button id="messages-delete-button"  data-l10n-id="delete">' +
                  'delete</button>' +
              '</menu>' +
              '<h1 id="messages-edit-title" data-l10n-id="editMode">' +
                'Edit mode</h1>' +
            '</header>' +
          '</section>' +
          '<menu>' +
            '<button id="deselect-all-messages" class="edit-button disabled"' +
              ' data-l10n-id="deselect-all">' +
              'None' +
            '</button>' +
            '<button id="select-all-messages" class="edit-button"' +
              ' data-l10n-id="select-all">' +
              'All' +
            '</button>' +
          '</menu>';
}

function renderThreadMsgInputBar() {
  return '<button id="send-message" disabled data-l10n-id="send"' +
            ' type="submit">Send</button>' +
          '<p>' +
            '<textarea type="text" id="message-to-send"' +
              ' name="message-to-send" placeholder="Message"' +
              ' data-l10n-id="composeMessage"></textarea>' +
          '</p>';
}
