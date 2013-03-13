DICTIONARY_PATH =../../../../../../dictionaries

# Available:
# cs.dict, de.dict, en_gb.dict, en_us.dict, es.dict, fr.dict,
# hr.dict, it.dict, nb.dict, pt_pt.dict, pt_br.dict

WHITELIST = \
 de.dict \
 en_us.dict \
 pt_br.dict \
 fr.dict \
 es.dict

VPATH = $(DICTIONARY_PATH)

%.dict: %_wordlist.xml xml2dict.py
	python3 xml2dict.py -o $@ $<

all: $(WHITELIST)
