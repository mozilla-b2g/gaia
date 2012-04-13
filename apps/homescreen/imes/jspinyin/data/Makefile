.PHONY: deploydata clean

deploydata: data.txt
	./cook.sh data.txt
        
data.txt: rawdict.txt 
	awk '$$3="0"{print $$0}' rawdict.txt > $@
clean:
	rm -f data.txt
