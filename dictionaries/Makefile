# After building a dictionary here, move the resulting .dict file to
# apps/keyboard/js/imes/latin/dictionaries/ and check it in.
#
# Available:
# cs.dict, de.dict, en_gb.dict, en_us.dict, es.dict, fr.dict,
# hr.dict, it.dict, nb.dict, pt_pt.dict, pt_br.dict, ca.dict

WHITELIST = \
 de.dict \
 en_us.dict \
 pl.dict \
 pt_br.dict \
 fr.dict \
 es.dict \
 ca.dict

%.dict: %_wordlist.xml xml2dict.py
	python3 xml2dict.py -o $@ $<

all: $(WHITELIST)
