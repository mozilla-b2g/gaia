'use strict';

function renderThreadListHeader() {
  return '<menu type="toolbar">' +
            '<a href="#new" id="icon-add">' +
              '<span class="icon icon-compose"></span>' +
            '</a>' +
            '<a href="#edit" id="threads-edit-icon">' +
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
              '<h1 id="threads-edit-mode" data-l10n-id="editMode">' +
                  'Edit mode</h1>' +
            '</header>' +
          '</section>' +
          '<menu>' +
            '<button id="threads-uncheck-all-button" ' +
              'class="edit-button disabled" ' +
              'data-l10n-id="deselect-all">' +
              'None' +
            '</button>' +
            '<button id="threads-check-all-button" class="edit-button" ' +
              'data-l10n-id="select-all">' +
              'All' +
            '</button>' +
          '</menu>';
}

function renderThreadMsgHeader() {
  return '<header>' +
            '<a role="link" id="messages-back-button">' +
              '<span class="icon icon-back"></span>' +
            '</a>' +
            '<menu type="toolbar">' +
              '<a id="messages-contact-pick-button">' +
                '<span class="icon icon-user"></span>' +
              '</a>' +
              '<a href="#edit" id="icon-edit">' +
                '<span class="icon icon-edit"></span>' +
              '</a>' +
            '</menu>' +
            '<h1 id="messages-header-text" ' +
              'data-l10n-id="messages" aria-hidden="true">' +
              'Messages</h1>' +
          '</header>' +
          '<article id="messages-composer-to-field">' +
            '<label data-l10n-id="to" id="to-label">' +
              'To:' +
            '</label>' +
            '<section id="messages-recipients-container">' +
            '</section>' +
            '<section id="messages-live-search-container">' +
              '<ul id="messages-live-search-results"' +
                'class="contactList" data-type="list">' +
              '</ul>' +
            '</section>' +
          '</article>' +
          '<article id="messages-container" ' +
          'class="view-body" data-type="list">' +
          '</article>';
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
              '<h1 id="messages-edit-mode" data-l10n-id="editMode">' +
                'Edit mode</h1>' +
            '</header>' +
          '</section>' +
          '<menu>' +
            '<button id="messages-uncheck-all-button" ' +
              'class="edit-button disabled"' +
              ' data-l10n-id="deselect-all">' +
              'None' +
            '</button>' +
            '<button id="messages-check-all-button" class="edit-button"' +
              ' data-l10n-id="select-all">' +
              'All' +
            '</button>' +
          '</menu>';
}

function renderThreadMsgInputBar() {
  return '<button id="messages-send-button" disabled data-l10n-id="send"' +
            ' type="submit">Send</button>' +
          '<p>' +
            '<textarea type="text" id="messages-input"' +
              ' name="messages-input" placeholder="Message"' +
              ' data-l10n-id="composeMessage"></textarea>' +
          '</p>';
}
