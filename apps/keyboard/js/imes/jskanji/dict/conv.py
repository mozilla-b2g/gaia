#!/usr/bin/env python
# -*- coding: utf-8 -*-

import simplejson as json
import codecs

from jcconv import kata2hira

file_list = ['dict.utf8',]

temp_obj = dict()
total_freq = 0

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

            print kanji, freq, kana

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

df = codecs.open('../dict.json', 'w', 'utf-8')
df.write(json.dumps(json_obj, ensure_ascii=False).replace(" {\"terms\":", "\n{\"terms\":"))
df.close()

