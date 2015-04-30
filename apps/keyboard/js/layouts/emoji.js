Keyboards.emoji = {
  label: 'Emoji',
  types: ['text', 'url', 'email'],
  menuLabel: 'Emoji',
  pages: [{   // Page 0 - People
    panelKeys: [ { compositeKey: '😄', type: 'emoji' }, { compositeKey: '😃', type: 'emoji' },
                 { compositeKey: '😀', type: 'emoji' }, { compositeKey: '😊', type: 'emoji' },
                 { compositeKey: '☺', type: 'emoji' }, { compositeKey: '😉', type: 'emoji' },
                 { compositeKey: '😍', type: 'emoji' }, { compositeKey: '😘', type: 'emoji' },
                 { compositeKey: '😚', type: 'emoji' }, { compositeKey: '😗', type: 'emoji' },
                 { compositeKey: '😙', type: 'emoji' }, { compositeKey: '😜', type: 'emoji' },
                 { compositeKey: '😝', type: 'emoji' }, { compositeKey: '😛', type: 'emoji' },
                 { compositeKey: '😳', type: 'emoji' }, { compositeKey: '😁', type: 'emoji' },
                 { compositeKey: '😔', type: 'emoji' }, { compositeKey: '😌', type: 'emoji' },
                 { compositeKey: '😒', type: 'emoji' }, { compositeKey: '😞', type: 'emoji' },
                 { compositeKey: '😣', type: 'emoji' }, { compositeKey: '😢', type: 'emoji' },
                 { compositeKey: '😂', type: 'emoji' }, { compositeKey: '😭', type: 'emoji' },
                 { compositeKey: '😪', type: 'emoji' }, { compositeKey: '😥', type: 'emoji' },
                 { compositeKey: '😰', type: 'emoji' }, { compositeKey: '😅', type: 'emoji' },
                 { compositeKey: '😓', type: 'emoji' }, { compositeKey: '😩', type: 'emoji' },
                 { compositeKey: '😫', type: 'emoji' }, { compositeKey: '😨', type: 'emoji' },
                 { compositeKey: '😱', type: 'emoji' }, { compositeKey: '😠', type: 'emoji' },
                 { compositeKey: '😡', type: 'emoji' }, { compositeKey: '😤', type: 'emoji' },
                 { compositeKey: '😖', type: 'emoji' }, { compositeKey: '😆', type: 'emoji' },
                 { compositeKey: '😋', type: 'emoji' }, { compositeKey: '😷', type: 'emoji' },
                 { compositeKey: '😎', type: 'emoji' }, { compositeKey: '😴', type: 'emoji' },
                 { compositeKey: '😵', type: 'emoji' }, { compositeKey: '😲', type: 'emoji' },
                 { compositeKey: '😟', type: 'emoji' }, { compositeKey: '😦', type: 'emoji' },
                 { compositeKey: '😧', type: 'emoji' }, { compositeKey: '😈', type: 'emoji' },
                 { compositeKey: '👿', type: 'emoji' }, { compositeKey: '😮', type: 'emoji' },
                 { compositeKey: '😬', type: 'emoji' }, { compositeKey: '😐', type: 'emoji' },
                 { compositeKey: '😕', type: 'emoji' }, { compositeKey: '😯', type: 'emoji' },
                 { compositeKey: '😶', type: 'emoji' }, { compositeKey: '😇', type: 'emoji' },
                 { compositeKey: '😏', type: 'emoji' }, { compositeKey: '😑', type: 'emoji' },
                 { compositeKey: '👲', type: 'emoji' }, { compositeKey: '👳', type: 'emoji' },
                 { compositeKey: '👮', type: 'emoji' }, { compositeKey: '👷', type: 'emoji' },
                 { compositeKey: '💂', type: 'emoji' }, { compositeKey: '👶', type: 'emoji' },
                 { compositeKey: '👦', type: 'emoji' }, { compositeKey: '👧', type: 'emoji' },
                 { compositeKey: '👨', type: 'emoji' }, { compositeKey: '👩', type: 'emoji' },
                 { compositeKey: '👴', type: 'emoji' }, { compositeKey: '👵', type: 'emoji' },
                 { compositeKey: '👱', type: 'emoji' }, { compositeKey: '👼', type: 'emoji' },
                 { compositeKey: '👸', type: 'emoji' }, { compositeKey: '😺', type: 'emoji' },
                 { compositeKey: '😸', type: 'emoji' }, { compositeKey: '😻', type: 'emoji' },
                 { compositeKey: '😽', type: 'emoji' }, { compositeKey: '😼', type: 'emoji' },
                 { compositeKey: '🙀', type: 'emoji' }, { compositeKey: '😿', type: 'emoji' },
                 { compositeKey: '😹', type: 'emoji' }, { compositeKey: '😾', type: 'emoji' },
                 { compositeKey: '👹', type: 'emoji' }, { compositeKey: '👺', type: 'emoji' },
                 { compositeKey: '🙈', type: 'emoji' }, { compositeKey: '🙉', type: 'emoji' },
                 { compositeKey: '🙊', type: 'emoji' }, { compositeKey: '💀', type: 'emoji' },
                 { compositeKey: '👽', type: 'emoji' }, { compositeKey: '💩', type: 'emoji' }
    ],
    keys: [
      [
        {
          value: '',
          keyCode: -3,
          className: 'emoji-ime-switch'
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-recent',
          targetPage: 5
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-people active',
          targetPage: 0
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-nature',
          targetPage: 1
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-object',
          targetPage: 2
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-place',
          targetPage: 3
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-symbol',
          targetPage: 4
        },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ]
    ]}, {     // Page 1 - Nature
    panelKeys: [ { compositeKey: '🐶', type: 'emoji' }, { compositeKey: '🐺', type: 'emoji' },
                 { compositeKey: '🐱', type: 'emoji' }, { compositeKey: '🐭', type: 'emoji' },
                 { compositeKey: '🐹', type: 'emoji' }, { compositeKey: '🐰', type: 'emoji' },
                 { compositeKey: '🐸', type: 'emoji' }, { compositeKey: '🐯', type: 'emoji' },
                 { compositeKey: '🐨', type: 'emoji' }, { compositeKey: '🐻', type: 'emoji' },
                 { compositeKey: '🐷', type: 'emoji' }, { compositeKey: '🐽', type: 'emoji' },
                 { compositeKey: '🐮', type: 'emoji' }, { compositeKey: '🐗', type: 'emoji' },
                 { compositeKey: '🐵', type: 'emoji' }, { compositeKey: '🐒', type: 'emoji' },
                 { compositeKey: '🐴', type: 'emoji' }, { compositeKey: '🐑', type: 'emoji' },
                 { compositeKey: '🐘', type: 'emoji' }, { compositeKey: '🐼', type: 'emoji' },
                 { compositeKey: '🐧', type: 'emoji' }, { compositeKey: '🐦', type: 'emoji' },
                 { compositeKey: '🐤', type: 'emoji' }, { compositeKey: '🐥', type: 'emoji' },
                 { compositeKey: '🐣', type: 'emoji' }, { compositeKey: '🐔', type: 'emoji' },
                 { compositeKey: '🐍', type: 'emoji' }, { compositeKey: '🐢', type: 'emoji' },
                 { compositeKey: '🐛', type: 'emoji' }, { compositeKey: '🐝', type: 'emoji' },
                 { compositeKey: '🐜', type: 'emoji' }, { compositeKey: '🐞', type: 'emoji' },
                 { compositeKey: '🐌', type: 'emoji' }, { compositeKey: '🐙', type: 'emoji' },
                 { compositeKey: '🐚', type: 'emoji' }, { compositeKey: '🐠', type: 'emoji' },
                 { compositeKey: '🐟', type: 'emoji' }, { compositeKey: '🐬', type: 'emoji' },
                 { compositeKey: '🐳', type: 'emoji' }, { compositeKey: '🐋', type: 'emoji' },
                 { compositeKey: '🐄', type: 'emoji' }, { compositeKey: '🐏', type: 'emoji' },
                 { compositeKey: '🐀', type: 'emoji' }, { compositeKey: '🐃', type: 'emoji' },
                 { compositeKey: '🐅', type: 'emoji' }, { compositeKey: '🐇', type: 'emoji' },
                 { compositeKey: '🐉', type: 'emoji' }, { compositeKey: '🐎', type: 'emoji' },
                 { compositeKey: '🐐', type: 'emoji' }, { compositeKey: '🐓', type: 'emoji' },
                 { compositeKey: '🐕', type: 'emoji' }, { compositeKey: '🐖', type: 'emoji' },
                 { compositeKey: '🐁', type: 'emoji' }, { compositeKey: '🐂', type: 'emoji' },
                 { compositeKey: '🐲', type: 'emoji' }, { compositeKey: '🐡', type: 'emoji' },
                 { compositeKey: '🐊', type: 'emoji' }, { compositeKey: '🐫', type: 'emoji' },
                 { compositeKey: '🐪', type: 'emoji' }, { compositeKey: '🐆', type: 'emoji' },
                 { compositeKey: '🐈', type: 'emoji' }, { compositeKey: '🐩', type: 'emoji' },
                 { compositeKey: '🐾', type: 'emoji' }, { compositeKey: '💐', type: 'emoji' },
                 { compositeKey: '🌸', type: 'emoji' }, { compositeKey: '🌷', type: 'emoji' },
                 { compositeKey: '🍀', type: 'emoji' }, { compositeKey: '🌹', type: 'emoji' },
                 { compositeKey: '🌻', type: 'emoji' }, { compositeKey: '🌺', type: 'emoji' },
                 { compositeKey: '🍁', type: 'emoji' }, { compositeKey: '🍃', type: 'emoji' },
                 { compositeKey: '🍂', type: 'emoji' }, { compositeKey: '🌿', type: 'emoji' },
                 { compositeKey: '🌾', type: 'emoji' }, { compositeKey: '🍄', type: 'emoji' },
                 { compositeKey: '🌵', type: 'emoji' }, { compositeKey: '🌴', type: 'emoji' },
                 { compositeKey: '🌲', type: 'emoji' }, { compositeKey: '🌳', type: 'emoji' },
                 { compositeKey: '🌰', type: 'emoji' }, { compositeKey: '🌱', type: 'emoji' },
                 { compositeKey: '🌼', type: 'emoji' }, { compositeKey: '🌐', type: 'emoji' },
                 { compositeKey: '🌞', type: 'emoji' }, { compositeKey: '🌝', type: 'emoji' },
                 { compositeKey: '🌚', type: 'emoji' }, { compositeKey: '🌑', type: 'emoji' },
                 { compositeKey: '🌒', type: 'emoji' }, { compositeKey: '🌓', type: 'emoji' },
                 { compositeKey: '🌔', type: 'emoji' }, { compositeKey: '🌕', type: 'emoji' },
                 { compositeKey: '🌖', type: 'emoji' }, { compositeKey: '🌗', type: 'emoji' },
                 { compositeKey: '🌘', type: 'emoji' }, { compositeKey: '🌜', type: 'emoji' },
                 { compositeKey: '🌛', type: 'emoji' }, { compositeKey: '🌙', type: 'emoji' },
                 { compositeKey: '🌍', type: 'emoji' }, { compositeKey: '🌎', type: 'emoji' },
                 { compositeKey: '🌏', type: 'emoji' }, { compositeKey: '🌋', type: 'emoji' },
                 { compositeKey: '🌌', type: 'emoji' }, { compositeKey: '🌠', type: 'emoji' },
                 { compositeKey: '⭐', type: 'emoji' }, { compositeKey: '☀', type: 'emoji' },
                 { compositeKey: '⛅', type: 'emoji' }, { compositeKey: '☁', type: 'emoji' },
                 { compositeKey: '⚡', type: 'emoji' }, { compositeKey: '☔', type: 'emoji' },
                 { compositeKey: '❄', type: 'emoji' }, { compositeKey: '⛄', type: 'emoji' },
                 { compositeKey: '🌀', type: 'emoji' }, { compositeKey: '🌁', type: 'emoji' },
                 { compositeKey: '🌈', type: 'emoji' }, { compositeKey: '🌊', type: 'emoji' }
    ],
    keys: [
      [
        {
          value: '',
          keyCode: -3,
          className: 'alternate-indicator emoji-ime-switch'
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-recent',
          targetPage: 5
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-people',
          targetPage: 0
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-nature active',
          targetPage: 1
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-object',
          targetPage: 2
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-place',
          targetPage: 3
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-symbol',
          targetPage: 4
        },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ]
    ]}, {    // Page 2 - Object
    panelKeys: [{ compositeKey: '🎍', type: 'emoji' }, { compositeKey: '💝', type: 'emoji' },
                { compositeKey: '🎎', type: 'emoji' }, { compositeKey: '🎒', type: 'emoji' },
                { compositeKey: '🎓', type: 'emoji' }, { compositeKey: '🎏', type: 'emoji' },
                { compositeKey: '🎆', type: 'emoji' }, { compositeKey: '🎇', type: 'emoji' },
                { compositeKey: '🎐', type: 'emoji' }, { compositeKey: '🎑', type: 'emoji' },
                { compositeKey: '🎃', type: 'emoji' }, { compositeKey: '👻', type: 'emoji' },
                { compositeKey: '🎅', type: 'emoji' }, { compositeKey: '🎄', type: 'emoji' },
                { compositeKey: '🎁', type: 'emoji' }, { compositeKey: '🎋', type: 'emoji' },
                { compositeKey: '🎉', type: 'emoji' }, { compositeKey: '🎊', type: 'emoji' },
                { compositeKey: '🎈', type: 'emoji' }, { compositeKey: '🎌', type: 'emoji' },
                { compositeKey: '🔮', type: 'emoji' }, { compositeKey: '🎥', type: 'emoji' },
                { compositeKey: '📷', type: 'emoji' }, { compositeKey: '📹', type: 'emoji' },
                { compositeKey: '📼', type: 'emoji' }, { compositeKey: '💿', type: 'emoji' },
                { compositeKey: '📀', type: 'emoji' }, { compositeKey: '💽', type: 'emoji' },
                { compositeKey: '💾', type: 'emoji' }, { compositeKey: '💻', type: 'emoji' },
                { compositeKey: '📱', type: 'emoji' }, { compositeKey: '☎', type: 'emoji' },
                { compositeKey: '📞', type: 'emoji' }, { compositeKey: '📟', type: 'emoji' },
                { compositeKey: '📠', type: 'emoji' }, { compositeKey: '📡', type: 'emoji' },
                { compositeKey: '📺', type: 'emoji' }, { compositeKey: '📻', type: 'emoji' },
                { compositeKey: '🔊', type: 'emoji' }, { compositeKey: '🔉', type: 'emoji' },
                { compositeKey: '🔈', type: 'emoji' }, { compositeKey: '🔇', type: 'emoji' },
                { compositeKey: '🔔', type: 'emoji' }, { compositeKey: '🔕', type: 'emoji' },
                { compositeKey: '📢', type: 'emoji' }, { compositeKey: '📣', type: 'emoji' },
                { compositeKey: '⏳', type: 'emoji' }, { compositeKey: '⌛', type: 'emoji' },
                { compositeKey: '⏰', type: 'emoji' }, { compositeKey: '⌚', type: 'emoji' },
                { compositeKey: '🔓', type: 'emoji' }, { compositeKey: '🔒', type: 'emoji' },
                { compositeKey: '🔏', type: 'emoji' }, { compositeKey: '🔐', type: 'emoji' },
                { compositeKey: '🔑', type: 'emoji' }, { compositeKey: '🔎', type: 'emoji' },
                { compositeKey: '💡', type: 'emoji' }, { compositeKey: '🔦', type: 'emoji' },
                { compositeKey: '🔆', type: 'emoji' }, { compositeKey: '🔅', type: 'emoji' },
                { compositeKey: '🔌', type: 'emoji' }, { compositeKey: '🔋', type: 'emoji' },
                { compositeKey: '🔍', type: 'emoji' }, { compositeKey: '🛁', type: 'emoji' },
                { compositeKey: '🛀', type: 'emoji' }, { compositeKey: '🚿', type: 'emoji' },
                { compositeKey: '🚽', type: 'emoji' }, { compositeKey: '🔧', type: 'emoji' },
                { compositeKey: '🔩', type: 'emoji' }, { compositeKey: '🔨', type: 'emoji' },
                { compositeKey: '🚪', type: 'emoji' }, { compositeKey: '🚬', type: 'emoji' },
                { compositeKey: '💣', type: 'emoji' }, { compositeKey: '🔫', type: 'emoji' },
                { compositeKey: '🔪', type: 'emoji' }, { compositeKey: '💊', type: 'emoji' },
                { compositeKey: '💉', type: 'emoji' }, { compositeKey: '💰', type: 'emoji' },
                { compositeKey: '💴', type: 'emoji' }, { compositeKey: '💵', type: 'emoji' },
                { compositeKey: '💷', type: 'emoji' }, { compositeKey: '💶', type: 'emoji' },
                { compositeKey: '💳', type: 'emoji' }, { compositeKey: '💸', type: 'emoji' },
                { compositeKey: '📲', type: 'emoji' }, { compositeKey: '📧', type: 'emoji' },
                { compositeKey: '📥', type: 'emoji' }, { compositeKey: '📤', type: 'emoji' },
                { compositeKey: '✉', type: 'emoji' }, { compositeKey: '📩', type: 'emoji' },
                { compositeKey: '📨', type: 'emoji' }, { compositeKey: '📯', type: 'emoji' },
                { compositeKey: '📫', type: 'emoji' }, { compositeKey: '📪', type: 'emoji' },
                { compositeKey: '📬', type: 'emoji' }, { compositeKey: '📭', type: 'emoji' },
                { compositeKey: '📮', type: 'emoji' }, { compositeKey: '📦', type: 'emoji' },
                { compositeKey: '📝', type: 'emoji' }, { compositeKey: '📄', type: 'emoji' },
                { compositeKey: '📃', type: 'emoji' }, { compositeKey: '📑', type: 'emoji' },
                { compositeKey: '📊', type: 'emoji' }, { compositeKey: '📈', type: 'emoji' },
                { compositeKey: '📉', type: 'emoji' }, { compositeKey: '📜', type: 'emoji' },
                { compositeKey: '📋', type: 'emoji' }, { compositeKey: '📅', type: 'emoji' },
                { compositeKey: '📆', type: 'emoji' }, { compositeKey: '📇', type: 'emoji' },
                { compositeKey: '📁', type: 'emoji' }, { compositeKey: '📂', type: 'emoji' },
                { compositeKey: '✂', type: 'emoji' }, { compositeKey: '📌', type: 'emoji' },
                { compositeKey: '📎', type: 'emoji' }, { compositeKey: '✒', type: 'emoji' },
                { compositeKey: '✏', type: 'emoji' }, { compositeKey: '📏', type: 'emoji' },
                { compositeKey: '📐', type: 'emoji' }, { compositeKey: '📕', type: 'emoji' },
                { compositeKey: '📗', type: 'emoji' }, { compositeKey: '📘', type: 'emoji' },
                { compositeKey: '📙', type: 'emoji' }, { compositeKey: '📓', type: 'emoji' },
                { compositeKey: '📔', type: 'emoji' }, { compositeKey: '📒', type: 'emoji' },
                { compositeKey: '📚', type: 'emoji' }, { compositeKey: '📖', type: 'emoji' },
                { compositeKey: '🔖', type: 'emoji' }, { compositeKey: '📛', type: 'emoji' },
                { compositeKey: '🔬', type: 'emoji' }, { compositeKey: '🔭', type: 'emoji' },
                { compositeKey: '📰', type: 'emoji' }, { compositeKey: '🎨', type: 'emoji' },
                { compositeKey: '🎬', type: 'emoji' }, { compositeKey: '🎤', type: 'emoji' },
                { compositeKey: '🎧', type: 'emoji' }, { compositeKey: '🎼', type: 'emoji' },
                { compositeKey: '🎵', type: 'emoji' }, { compositeKey: '🎶', type: 'emoji' },
                { compositeKey: '🎹', type: 'emoji' }, { compositeKey: '🎻', type: 'emoji' },
                { compositeKey: '🎺', type: 'emoji' }, { compositeKey: '🎷', type: 'emoji' },
                { compositeKey: '🎸', type: 'emoji' }
    ],
    keys: [
      [
        {
          value: '',
          keyCode: -3,
          className: 'alternate-indicator emoji-ime-switch'
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-recent',
          targetPage: 5
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-people',
          targetPage: 0
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-nature',
          targetPage: 1
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-object active',
          targetPage: 2
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-place',
          targetPage: 3
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-symbol',
          targetPage: 4
        },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ]
    ]
    }, {      // Page 3 - Places
    panelKeys: [ { compositeKey: '🏠', type: 'emoji' }, { compositeKey: '🏡', type: 'emoji' },
                 { compositeKey: '🏫', type: 'emoji' }, { compositeKey: '🏢', type: 'emoji' },
                 { compositeKey: '🏣', type: 'emoji' }, { compositeKey: '🏥', type: 'emoji' },
                 { compositeKey: '🏦', type: 'emoji' }, { compositeKey: '🏪', type: 'emoji' },
                 { compositeKey: '🏩', type: 'emoji' }, { compositeKey: '🏨', type: 'emoji' },
                 { compositeKey: '💒', type: 'emoji' }, { compositeKey: '⛪', type: 'emoji' },
                 { compositeKey: '🏬', type: 'emoji' }, { compositeKey: '🏤', type: 'emoji' },
                 { compositeKey: '🌇', type: 'emoji' }, { compositeKey: '🌆', type: 'emoji' },
                 { compositeKey: '🏯', type: 'emoji' }, { compositeKey: '🏰', type: 'emoji' },
                 { compositeKey: '⛺', type: 'emoji' }, { compositeKey: '🏭', type: 'emoji' },
                 { compositeKey: '🗼', type: 'emoji' }, { compositeKey: '🗾', type: 'emoji' },
                 { compositeKey: '🗻', type: 'emoji' }, { compositeKey: '🌄', type: 'emoji' },
                 { compositeKey: '🌅', type: 'emoji' }, { compositeKey: '🌃', type: 'emoji' },
                 { compositeKey: '🗽', type: 'emoji' }, { compositeKey: '🌉', type: 'emoji' },
                 { compositeKey: '🎠', type: 'emoji' }, { compositeKey: '🎡', type: 'emoji' },
                 { compositeKey: '⛲', type: 'emoji' }, { compositeKey: '🎢', type: 'emoji' },
                 { compositeKey: '🚢', type: 'emoji' }, { compositeKey: '⛵', type: 'emoji' },
                 { compositeKey: '🚤', type: 'emoji' }, { compositeKey: '🚣', type: 'emoji' },
                 { compositeKey: '⚓', type: 'emoji' }, { compositeKey: '🚀', type: 'emoji' },
                 { compositeKey: '✈', type: 'emoji' }, { compositeKey: '💺', type: 'emoji' },
                 { compositeKey: '🚁', type: 'emoji' }, { compositeKey: '🚂', type: 'emoji' },
                 { compositeKey: '🚊', type: 'emoji' }, { compositeKey: '🚉', type: 'emoji' },
                 { compositeKey: '🚞', type: 'emoji' }, { compositeKey: '🚆', type: 'emoji' },
                 { compositeKey: '🚄', type: 'emoji' }, { compositeKey: '🚅', type: 'emoji' },
                 { compositeKey: '🚈', type: 'emoji' }, { compositeKey: '🚇', type: 'emoji' },
                 { compositeKey: '🚝', type: 'emoji' }, { compositeKey: '🚋', type: 'emoji' },
                 { compositeKey: '🚃', type: 'emoji' }, { compositeKey: '🚎', type: 'emoji' },
                 { compositeKey: '🚌', type: 'emoji' }, { compositeKey: '🚍', type: 'emoji' },
                 { compositeKey: '🚙', type: 'emoji' }, { compositeKey: '🚘', type: 'emoji' },
                 { compositeKey: '🚗', type: 'emoji' }, { compositeKey: '🚕', type: 'emoji' },
                 { compositeKey: '🚖', type: 'emoji' }, { compositeKey: '🚛', type: 'emoji' },
                 { compositeKey: '🚚', type: 'emoji' }, { compositeKey: '🚨', type: 'emoji' },
                 { compositeKey: '🚓', type: 'emoji' }, { compositeKey: '🚔', type: 'emoji' },
                 { compositeKey: '🚒', type: 'emoji' }, { compositeKey: '🚑', type: 'emoji' },
                 { compositeKey: '🚐', type: 'emoji' }, { compositeKey: '🚲', type: 'emoji' },
                 { compositeKey: '🚡', type: 'emoji' }, { compositeKey: '🚟', type: 'emoji' },
                 { compositeKey: '🚠', type: 'emoji' }, { compositeKey: '🚜', type: 'emoji' },
                 { compositeKey: '💈', type: 'emoji' }, { compositeKey: '🚏', type: 'emoji' },
                 { compositeKey: '🎫', type: 'emoji' }, { compositeKey: '🚦', type: 'emoji' },
                 { compositeKey: '🚥', type: 'emoji' }, { compositeKey: '⚠', type: 'emoji' },
                 { compositeKey: '🚧', type: 'emoji' }, { compositeKey: '🔰', type: 'emoji' },
                 { compositeKey: '⛽', type: 'emoji' }, { compositeKey: '🏮', type: 'emoji' },
                 { compositeKey: '🎰', type: 'emoji' }, { compositeKey: '♨', type: 'emoji' },
                 { compositeKey: '🗿', type: 'emoji' }, { compositeKey: '🎪', type: 'emoji' },
                 { compositeKey: '🎭', type: 'emoji' }, { compositeKey: '📍', type: 'emoji' },
                 { compositeKey: '🚩', type: 'emoji' }
    ],
    keys: [
      [
        {
          value: '',
          keyCode: -3,
          className: 'alternate-indicator emoji-ime-switch'
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-recent',
          targetPage: 5
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-people',
          targetPage: 0
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-nature',
          targetPage: 1
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-object',
          targetPage: 2
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-place active',
          targetPage: 3
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-symbol',
          targetPage: 4
        },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ]
    ]
    }, {     // Page 4 - Symbols
    panelKeys: [ { compositeKey: '🆗', type: 'emoji' }, { compositeKey: '🔀', type: 'emoji' },
                 { compositeKey: '🔁', type: 'emoji' }, { compositeKey: '🔂', type: 'emoji' },
                 { compositeKey: '🆕', type: 'emoji' }, { compositeKey: '🆙', type: 'emoji' },
                 { compositeKey: '🆒', type: 'emoji' }, { compositeKey: '🆓', type: 'emoji' },
                 { compositeKey: '🆖', type: 'emoji' }, { compositeKey: '📶', type: 'emoji' },
                 { compositeKey: '🎦', type: 'emoji' }, { compositeKey: '🈁', type: 'emoji' }
    ],
    keys: [
      [
        {
          value: '',
          keyCode: -3,
          className: 'alternate-indicator emoji-ime-switch'
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-recent',
          targetPage: 5
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-people',
          targetPage: 0
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-nature',
          targetPage: 1
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-object',
          targetPage: 2
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-place',
          targetPage: 3
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-symbol active',
          targetPage: 4
        },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ]
    ]
    }, {
    dynamicPanelKeys: 'recent',
    keys: [
      [
        {
          value: '',
          keyCode: -3,
          className: 'alternate-indicator emoji-ime-switch'
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-recent active',
          targetPage: 5
        },
        {
          value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-people',
          targetPage: 0
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-nature',
          targetPage: 1
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-object',
          targetPage: 2
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-place',
          targetPage: 3
        },
        { value: '',
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'emoji-symbol',
          targetPage: 4
        },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ]
    ]}
  ]
};
