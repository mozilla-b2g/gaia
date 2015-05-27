# After building a dictionary here, move the resulting .dict file to
# apps/keyboard/js/imes/latin/dictionaries/ and check it in.
#
# Available:
# af.dict, bg.dict, bs.dict, ca.dict, cs.dict, da.dict, de.dict, el.dict, en.dict, en_gb.dict, en_us.dict, es.dict, eu.dict, ff.dict,
# fi.dict, fr.dict, fy.dict, ga.dict, gd.dict, gl.dict, gv.dict, hr.dict, hu.dict, it.dict, lt.dict, lv.dict, nb.dict, nl.dict, pl.dict,
# pt_br.dict, pt_pt.dict, ro.dict, ru.dict, sk.dict, sl.dict, sq.dict, sr.dict, sr-Cyrl.dict, sr-Latn.dict, sr.dict, sv.dict, tr.dict

WHITELIST = \
 af.dict \
 bg.dict \
 bs.dict \
 ca.dict \
 cs.dict \
 da.dict \
 de.dict \
 el.dict \
 en.dict \
 en_gb.dict \
 en_us.dict \
 es.dict \
 eu.dict \
 fi.dict \
 ff.dict \
 fr.dict \
 fy.dict \
 ga.dict \
 gd.dict \
 gl.dict \
 gv.dict \
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
 sq.dict \
 sr.dict \
 sr-Cyrl.dict \
 sr-Latn.dict \
 sv.dict \
 tr.dict

%.dict: %_wordlist.xml xml2dict.js dependency
	node --harmony xml2dict.js -o $@ $<

dependency:
	npm install xml2js yargs

all: $(WHITELIST)
