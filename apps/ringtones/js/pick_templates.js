'use strict';
/* global Sanitizer */
/* exported Templates */
var Templates = {
  soundList: function({l10nID}) {
    return Sanitizer.escapeHTML `
      <section hidden>
        <gaia-subheader skin="organic">
          <span data-l10n-id="${l10nID}"></span>
        </gaia-subheader>
        <section data-type="list">
          <ul data-type="edit"></ul>
        </section>
      </section>`;
  },

  soundItem: function({l10nID, name}) {
    return Sanitizer.escapeHTML `
      <li>
        <label class="pack-radio">
          <input type="radio" name="sounds"/>
          <span></span>
        </label>
        <p class="name"><bdi data-l10n-id="${l10nID}">${name}</bdi></p>
      </li>`;
  }
};
