/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This is a traditional Vietnamese typewriter layout.
Keyboards['vi-Typewriter'] = {
  label: 'Vietnamese',
  shortLabel: 'Vi',
  menuLabel: 'Tiếng Việt',
  imEngine: 'vietnamese',
  needsCandidatePanel: true,
  width: 10,
  types: ['text', 'url', 'email'],
  lang: 'vi',
  alt: {
    'đ': 'z',
    'ư': 'f',
    'ơ': 'j',
    'ă': 'w',
    '.': ',?!-;:'
  },
  keys: [
    [
      { value: 'a' }, { value: 'đ' }, { value: 'e' }, { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' }, { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'q' }, { value: 's' }, { value: 'd' }, { value: 'ư' },
      { value: 'g' } , { value: 'h' }, { value: 'ơ' }, { value: 'k' },
      { value: 'l' }, { value: 'm' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ă' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: '^', keyCode: 94 },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
