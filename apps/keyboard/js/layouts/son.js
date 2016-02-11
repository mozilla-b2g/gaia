Keyboards.son = {
label: 'Songhay',
shortLabel: 'son',
menuLabel: 'Soŋay senni',
imEngine: 'latin',
types: ['text', 'url', 'email', 'password'],
autoCorrectLanguage: 'son',
autoCorrectPunctuation: false,
lang: 'son',
alt: {
a: 'ãàâæáäåā',
c: 'çćč',
e: 'ẽéèêë€ē',
i: 'ĩîïìíī',
o: 'õôœòóöōø',
u: 'ũùûüúū',
s: 'śşß',
S: 'ŚŞ',
n: 'ñň',
s: 'q',
S: 'Q',
ɲ: 'v',
Ɲ: 'V',
ž: 'x',
Ž: 'X',
'.': ',?!-;:'
},
keys: [
[
{ value: 'a' }, { value: 'ŋ' }, { value: 'e' }, { value: 'r' },
{ value: 't' } , { value: 'y' }, { value: 'u' }, { value: 'i' },
{ value: 'o' }, { value: 'p' }
], [
{ value: 's' }, { value: 'š' }, { value: 'd' }, { value: 'f' },
{ value: 'g' }, { value: 'h' }, { value: 'j' }, { value: 'k' },
{ value: 'l' }
], [
{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
{ value: 'w' }, { value: 'z' }, { value: 'ž' },{ value: 'c' }, { value: 'ɲ' }, 
{ value: 'b' }, { value: 'n' }, { value: 'm' }, { value: "'", keyCode: 39 },
{ value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
], [
{ value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
{ value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
]
]
};
