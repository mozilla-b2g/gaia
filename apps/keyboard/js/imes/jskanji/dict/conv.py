#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import codecs

from jcconv import kata2hira

file_list = ['dict.utf8',]

temp_obj = dict()
total_freq = 0

# Converting from EUC-JP to UTF-8 makes unexpected code change for some characters.
# This table recovers them to its original code.
utf8_fix_table = {
    u'‾': u'￣',
    u'—': u'―',
    u'〜': u'～',
    u'‖': u'∥',
    u'−': u'－',
    u'¥': u'￥',
    u'¢': u'￠',
    u'£': u'￡',
    u'¬': u'￢',
    u'¦': u'￤'
}

naistjdic_fix_table = {
    u'海・島': u'海鱸島',
    u'茶・山': u'茶荃山',
    u'吐・喇列島': u'吐噶喇列島',
    u'屋那・島': u'屋那覇島',
    u'流・': u'流硑',
    u'辰ケ・': u'辰ケ硑',
    u'穴・湾': u'穴澗湾',
    u'海・の峰': u'海驢の峰',
    u'下・島': u'下甑島',
    u'出来・崎': u'出来澗崎',
    u'横・岬': u'横澗岬',
    u'穴・岬': u'穴澗岬',
    u'京の上・島': u'京の上臈島',
    u'吐・喇海峡': u'吐噶喇海峡',
    u'辰ヶ・': u'辰ヶ硑',
    u'滝ノ・ノ岬': u'滝ノ澗ノ岬',
    u'中・湾': u'中甑湾',
    u'丸・ノ鼻': u'丸硑ノ鼻',
    u'勝・山': u'勝澗山',
    u'狼・山': u'狼乢山',
    u'赤・鼻': u'赤硑鼻',
    u'中ノ・崎': u'中ノ澗崎',
    u'大松・': u'大松硑',
    u'中・島': u'中甑島',
    u'螺・島': u'螺蠑島',
    u'上・島': u'上甑島'
}

naistjdic_correction_table = {
    u'赤硑鼻': u'あかばえはな',
    u'与那・岳': '',
    u'村碆・': '',
    u'笠・岳': ''
}

def naistjdic_patch(kanji, kana):
    # Fix encoding convert error by iconv.
    for c in utf8_fix_table:
        kanji = kanji.replace(c, utf8_fix_table[c])
        kana = kana.replace(c, utf8_fix_table[c])

    # Fix some lacked kanji in naist-jdic 0.4.3.
    if u'・' in kanji:
        if kanji in naistjdic_fix_table:
            kanji_key = kanji
            kanji = naistjdic_fix_table[kanji]
            del naistjdic_fix_table[kanji_key]

    # Correct kana or remove the item.
    if kanji in naistjdic_correction_table:
        kanji_key = kanji
        kana = naistjdic_correction_table[kanji]
        del naistjdic_correction_table[kanji_key]
    return [kanji, kana]


# Main loop.
for file_name in file_list:
    print file_name

    with codecs.open(file_name, 'r', 'utf-8') as f:
        for line in f:
            arr = line.split()

            base = 0
            for i, e in enumerate(arr):
                if e[0] <= '9' and e[0] >= '0':
                    base = i
            kanji = arr[base-1][1:]
            freq = arr[base][:-2]
            kana = kata2hira(arr[base+2][:-1])

            kanji, kana = naistjdic_patch(kanji, kana)
            if kana == '':
              # Remove current item from dic.
              continue

            print kanji.encode('utf-8'), freq, kana

            if len(kana) == 0:
                continue
            elif len(kana) > 1 and kana[0] == '{':
                ks = kana[1:kana.index('}')].split('/')
                ks = [k + kana[kana.index('}')+1:] for k in ks if len(k) > 0]
            else:
                ks = [kana, ]

            freq = int(freq)
            for k in ks:

                if k not in temp_obj:
                    temp_obj[k] = [[freq, kanji], ]
                    total_freq += freq
                else:
                    kanji_exist = False
                    for ele in temp_obj[k]:
                        if ele[1] == kanji:
                            kanji_exist = True
                            if ele[0] > freq:
                                ele[0] = freq

                    if not kanji_exist:
                        temp_obj[k].append([freq, kanji])
                        total_freq += freq


print 'Total frequence %d.' % total_freq

json_obj = []

for k, value in temp_obj.iteritems():
    json_obj.append({'kana' : k, 'terms': [{'kanji': v[1], 'freq': v[0],
            'kana': k} for v in value]})

print 'Writing to ../dict.json.'

df = codecs.open('../dict.json', 'w', 'utf-8')
df.write(json.dumps(json_obj, ensure_ascii=False).replace(" {\"terms\":", "\n{\"terms\":"))
df.close()

print 'Done!'
