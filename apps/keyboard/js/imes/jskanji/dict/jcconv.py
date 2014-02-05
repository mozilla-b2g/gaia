# -*- coding: utf-8 -*-

__all__ = ['hira2kata', 'kata2hira', 'half2hira', 'hira2half', 'kata2half',
           'half2kata', 'half2wide', 'wide2half', 'convert',
           'check_hira', 'check_kata', 'check_half']

import re

# convert hiragana to katakana
def hira2kata(text, reserved=[]):
    return convert(text, jcconv.HIRA, jcconv.KATA, reserved)

# convert katakana to hiragana
def kata2hira(text, reserved=[]):
    return convert(text, jcconv.KATA, jcconv.HIRA, reserved)

# convert half-width kana to hiragana
def half2hira(text, reserved=[]):
    return convert(text, jcconv.HALF, jcconv.HIRA, reserved)

# convert hiragana to half-width kana
def hira2half(text, reserved=[]):
    return convert(text, jcconv.HIRA, jcconv.HALF, reserved)

# convert katakana to half-width kana
def kata2half(text, reserved=[]):
    return convert(text, jcconv.KATA, jcconv.HALF, reserved)

# convert half-width kana to katakana
def half2kata(text, reserved=[]):
    return convert(text, jcconv.HALF, jcconv.KATA, reserved)

# expand half width number and alphabet to wide width
def half2wide(text, reserved=[]):
    text = convert(text, jcconv.HNUM, jcconv.WNUM, reserved)
    text = convert(text, jcconv.HALP, jcconv.WALP, reserved)
    return convert(text, jcconv.HSYM, jcconv.WSYM, reserved)

# shrink wide width number and alphabet to half width
def wide2half(text, reserved=[]):
    text = convert(text, jcconv.WNUM, jcconv.HNUM, reserved)
    text = convert(text, jcconv.WALP, jcconv.HALP, reserved)
    return convert(text, jcconv.WSYM, jcconv.HSYM, reserved)

# check if 'text' consists of hiragana
def check_hira(text):
    return check(text, jcconv.HIRA)

# check if 'text' consists of katakana
def check_kata(text):
    return check(text, jcconv.KATA)

# check if 'text' consists of half-width kana
def check_half(text):
    return check(text, jcconv.HALF)

# convert 'frm' charset to 'to' charset
# input text must be unicode or str(utf-8)
# 'frm' and 'to' can be specified with (HIRA, KATA, HALF, WNUM, HNUM, WALP, HALP, WSYM, HSYM)
__regex_storage = {}
def convert(text, frm, to, reserved=[]):
    def _multiple_replace(text, dic):
        key = '|'.join(map(re.escape, dic))
        if key in __regex_storage:
            rx = __regex_storage[key]
        else:
            rx = re.compile(key)
            __regex_storage[key] = rx
        def proc_one(match):
            return dic[match.group(0)]
        return rx.sub(proc_one, text)

    uflag = isinstance(text, unicode)
    f_set = jcconv.char_sets[frm]
    t_set = jcconv.char_sets[to]

    text = uflag and text or text.decode('utf-8')
    if len(f_set[0].split(' ')) == len(t_set[0].split(' ')):
        for i in range(len(f_set)):
            conv_table = dict(zip(f_set[i].split(' '), t_set[i].split(' ')))
            for r in reserved:
                try:
                    del(conv_table[r])
                except:
                    pass
            text = _multiple_replace(text, conv_table)
        return uflag and text or text.encode('utf-8')
    else:
        raise "Invalid Parameter"

def check(text, char_set_type):
    uflag = isinstance(text, unicode)
    text = uflag and text or text.decode('utf-8')
    char_set = []
    for set in jcconv.char_sets[char_set_type]:
        char_set.extend(set.split(' '))
    return all([text_char in char_set for text_char in text])

# define character sets used in japanese
class jcconv:
    (HIRA, KATA, HALF, WNUM, HNUM, WALP, HALP, WSYM, HSYM) = (i for i in range(9))
    hira = [u'が ぎ ぐ げ ご ざ じ ず ぜ ぞ だ ぢ づ で ど ば び ぶ べ ぼ ぱ ぴ ぷ ぺ ぽ',
            u'あ い う え お か き く け こ さ し す せ そ た ち つ て と ' + \
            u'な に ぬ ね の は ひ ふ へ ほ ま み む め も や ゆ よ ら り る れ ろ ' + \
            u'わ を ん ぁ ぃ ぅ ぇ ぉ ゃ ゅ ょ っ']
    kata = [u'ガ ギ グ ゲ ゴ ザ ジ ズ ゼ ゾ ダ ヂ ヅ デ ド バ ビ ブ ベ ボ パ ピ プ ペ ポ',
            u'ア イ ウ エ オ カ キ ク ケ コ サ シ ス セ ソ タ チ ツ テ ト ' + \
            u'ナ ニ ヌ ネ ノ ハ ヒ フ ヘ ホ マ ミ ム メ モ ヤ ユ ヨ ラ リ ル レ ロ ' + \
            u'ワ ヲ ン ァ ィ ゥ ェ ォ ャ ュ ョ ッ']
    half = [u'ｶﾞ ｷﾞ ｸﾞ ｹﾞ ｺﾞ ｻﾞ ｼﾞ ｽﾞ ｾﾞ ｿﾞ ﾀﾞ ﾁﾞ ﾂﾞ ﾃﾞ ﾄﾞ ﾊﾞ ﾋﾞ ﾌﾞ ﾍﾞ ﾎﾞ ﾊﾟ ﾋﾟ ﾌﾟ ﾍﾟ ﾎﾟ',
            u'ｱ ｲ ｳ ｴ ｵ ｶ ｷ ｸ ｹ ｺ ｻ ｼ ｽ ｾ ｿ ﾀ ﾁ ﾂ ﾃ ﾄ ﾅ ﾆ ﾇ ﾈ ﾉ ﾊ ﾋ ﾌ ﾍ ﾎ ﾏ ﾐ ﾑ ﾒ ﾓ ﾔ ﾕ ﾖ ﾗ ﾘ ﾙ ﾚ ﾛ ' + \
            u'ﾜ ｦ ﾝ ｧ ｨ ｩ ｪ ｫ ｬ ｭ ｮ ｯ']
    wnum = [u'０ １ ２ ３ ４ ５ ６ ７ ８ ９']
    hnum = [u'0 1 2 3 4 5 6 7 8 9']
    walp = [u'ａ ｂ ｃ ｄ ｅ ｆ ｇ ｈ ｉ ｊ ｋ ｌ ｍ ｎ ｏ ｐ ｑ ｒ ｓ ｔ ｕ ｖ ｗ ｘ ｙ ｚ ' + \
            u'Ａ Ｂ Ｃ Ｄ Ｅ Ｆ Ｇ Ｈ Ｉ Ｊ Ｋ Ｌ Ｍ Ｎ Ｏ Ｐ Ｑ Ｒ Ｓ Ｔ Ｕ Ｖ Ｗ Ｘ Ｙ Ｚ']
    halp = [u'a b c d e f g h i j k l m n o p q r s t u v w x y z ' + \
            u'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z']
    wsym = [u'！ ” ＃ ＄ ％ ＆ ’ （ ） ＊ ＋ 、 − ． ／ ： ； ＜ ＝ ＞ ？ ＠ 「 ＼ 」 ＾ ＿ ｀ 『 ｜ 』 〜']
    hsym = [u'! \" # $ % & \' ( ) * + , - . / : ; < = > ? @ [ \ ] ^ _ ` { | } ~']
    char_sets = [hira, kata, half, wnum, hnum, walp, halp, wsym, hsym]


if __name__ == '__main__':
    import codecs, sys
    sys.stdout = codecs.getwriter('utf_8')(sys.stdout)
    
    print convert(u'あいうえお', jcconv.HIRA, jcconv.HALF, [u'う'])
    print convert(u'ばいおりん', jcconv.HIRA, jcconv.HALF)
    print convert(u'ﾊﾞｲｵﾘﾝ', jcconv.HALF, jcconv.HIRA)
    print convert(u'12345', jcconv.HNUM, jcconv.WNUM)

    print check_hira(u'ひらがな')
    print check_hira(u'カタカナ')
    print check_kata(u'ひらがな')
    print check_kata(u'カタカナ')
