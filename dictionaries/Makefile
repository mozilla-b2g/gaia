# After building a dictionary here, move the resulting .dict file to
# apps/keyboard/js/imes/latin/dictionaries/ and check it in.
#
# Available:
# cs.dict, de.dict, en_gb.dict, en_us.dict, es.dict, fr.dict,
# hr.dict, it.dict, nb.dict, pt_pt.dict, pt_br.dict, ca.dict

WHITELIST = \
 ca.dict \
 cs.dict \
 de.dict \
 el.dict \
 en_us.dict \
 es.dict \
 fr.dict \
 hr.dict \
 hu.dict \
 nl.dict \
 pl.dict \
 pt_br.dict \
 ro.dict \
 ru.dict \
 sr.dict \
 tr.dict

%.dict: %_wordlist.xml xml2dict.py
	python3 xml2dict.py -o $@ $<

all: $(WHITELIST)
