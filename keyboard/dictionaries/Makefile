# After building a dictionary here, move the resulting .dict file to
# apps/keyboard/js/imes/latin/dictionaries/ and check it in.
#
# Available:
# bg.dict, ca.dict, cs.dict, da.dict, de.dict, el.dict, en.dict, en_gb.dict, en_us.dict, es.dict, fi.dict, fr.dict,
# hr.dict, hu.dict, it.dict, lt.dict, lv.dict, nb.dict, nl.dict, pl.dict, pt_br.dict, pt_pt.dict, ro.dict,
# ru.dict, sk.dict, sl.dict, sr.dict, sr-Cyrl.dict, sr-Latn.dict, sr.dict, sv.dict, tr.dict


WHITELIST = \
 bg.dict \
 ca.dict \
 cs.dict \
 da.dict \
 de.dict \
 el.dict \
 en.dict \
 en_gb.dict \
 en_us.dict \
 es.dict \
 fi.dict \
 fr.dict \
 hr.dict \
 hu.dict \
 it.dict \
 lt.dict \
 lv.dict \
 pl.dict \
 pt_br.dict \
 nb.dict \
 nl.dict \
 pl.dict \
 pt_br.dict \
 pt_pt.dict \
 ro.dict \
 ru.dict \
 sk.dict \
 sl.dict \
 sr.dict \
 sr-Cyrl.dict \
 sr-Latn.dict \
 sv.dict \
 tr.dict

%.dict: %_wordlist.xml xml2dict.py
	python3 xml2dict.py -o $@ $<

all: $(WHITELIST)
