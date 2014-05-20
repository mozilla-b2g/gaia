#!/bin/sh

###############################################################################
# Option variables

opt_verbose=no
opt_recursive=no
opt_backup=no
opt_keepgoing=no
opt_optipng_args="-o7 -strip all -clobber -quiet"
opt_optipng_args_nostrip="-o7 -clobber -quiet"
opt_advpng_args="-z -4 -q"
opt_help=no
opt_paths=""

###############################################################################
# Other globals

# Temporary directory and log file used through the script
tmpdir=`mktemp -d -t tmp.XXXXXXXXXX`

if [ $? -ne 0 ]; then
    printf "error: Cannot create a temporary directory"
    exit 1
fi

tmplog=`mktemp -t tmp.XXXXXXXXXX`

if [ $? -ne 0 ]; then
    printf "error: Cannot create a temporary log file"
    exit 1
fi

trap 'rm -rf "$tmpdir $tmplog"' EXIT INT TERM HUP

size_cmd="printf 1" # Command used to obtain the size of a file
total_src_size="0"  # Total size of the source files
total_comp_size="0" # Total size of the compressed files
processed_files="0" # Number of files having been processed

###############################################################################
# Print the help message

print_help() {
    printf "Usage: `basename $0` [OPTION...] [PATH...]
Recompresses PNG files using the 'optipng' and 'advpng' tools.

Application options:
  -v, --verbose         Print information on the files being processed
  -r, --recursive       Recurse into subdirectories and process all files
  -b, --backup          Keep a backup of the modified files
  -k, --keepgoing       Do not stop in case of errors

Compression options:
  --optipng-args        Arguments passed to optipng (default: $opt_optipng_args)
  --advpng-args         Arguments passed to advpng (default: $opt_advpng_args)

Help options:
  -h, --help            Show this help message
"
}

suggest_help() {
    printf "Try \``basename $0` --help' for more information\n"
}

###############################################################################
# Parse the program arguments

parse_args() {
    # Set the options variables depending on the passed arguments
    while [ $# -gt 0 ]; do
        if [ `expr "$1" : "^-"` -eq 1 ]; then
            if [ $1 = "-v" ] || [ $1 = "--verbose" ]; then
                shift
                opt_verbose=yes
            elif [ $1 = "-r" ] || [ $1 = "--recursive" ]; then
                shift
                opt_recursive=yes
            elif [ $1 = "-b" ] || [ $1 = "--backup" ]; then
                shift
                opt_backup=yes
            elif [ $1 = "-k" ] || [ $1 = "--keepgoing" ]; then
                shift
                opt_keepgoing=yes
            elif [ $1 = "--optipng-args" ]; then
                if [ $# -le 1 ]; then
                    printf "error: No argument specified for --optipng-args\n"
                    suggest_help
                    exit 1
                else
                    opt_optipng_args="$2"
                    opt_optipng_args_nostrip=`echo $2 | sed -e 's/-strip all//'`
                    shift 2
                fi
            elif [ $1 = "--advpng-args" ]; then
                if [ $# -le 1 ]; then
                    printf "error: No argument specified for --advpng-args\n"
                    suggest_help
                    exit 1
                else
                    opt_advpng_args="$2"
                    shift 2
                fi
            elif [ $1 = "-h" ] || [ $1 = "--help" ]; then
                opt_help=yes
                shift 1
            else
                printf "error: Unknown option $1\n"
                exit 1
            fi
        else
            # No more arguments, the following parameters will be paths
            break
        fi
    done

    if [ $# -eq 0 ] && [ $opt_help != yes ]; then
        printf "error: no files specified\n"
        suggest_help
        exit 1
    fi

    # Gather all the paths
    while [ $# -gt 0 ]; do
        opt_paths="$opt_paths$1\n"
        shift
    done

    # Adjust the arguments
    if [ $opt_backup = yes ]; then
        opt_optipng_args="$opt_optipng_args -backup"
    fi
}

###############################################################################
# Check for programs

check_programs() {
    which optipng 1>/dev/null 2>/dev/null

    if [ $? -ne 0 ]; then
        printf "error: optipng not found\n"
        exit 1;
    fi

    which advpng 1>/dev/null 2>/dev/null

    if [ $? -ne 0 ]; then
        printf "error: advpng not found\n"
        exit 1;
    fi

    if stat --printf %s . 1>/dev/null 2>/dev/null; then
        size_cmd="stat --printf %s"
    elif stat -f %z . 1>/dev/null 2>/dev/null; then
        size_cmd="stat -f %z"
    fi
}

###############################################################################
# Recompress all files in a directory, if recursive behavior was requested will
# recurse in all subdirectories

recompress_dir() {
    local files

    if [ $opt_recursive = yes ]; then
        files=`find "$1" -iname "*.png" -type f`
    else
        files=`find "$1" -maxdepth 1 -iname "*.png" -type f`
    fi

    mkfifo "$tmpdir/files_pipe"
    printf -- "$files\n" > "$tmpdir/files_pipe" &

    while read -r fd; do
        recompress_file "$fd"
    done < "$tmpdir/files_pipe"
}

###############################################################################
# Recompress a single file using the specified options

recompress_file() {
    local rv=0
    local apng=0
    local src_size=`$size_cmd "$1"`

    if [ $opt_backup = yes ]; then
        if [ -e "$1.bak" ] ; then
            printf "error: backup file $1.bak already exists\n"

            if [ $opt_keepgoing = no ]; then
                exit 1
            fi
        else
            cp -p "$1" "$1.bak"
        fi
    fi

    optipng -o0 -simulate "$1" 1>"$tmplog" 2>"$tmplog"
    grep -q APNG "$tmplog"
    apng=$?

    if [ $apng -eq 0 ]; then
        # Do not strip animated PNG files otherwise the frames will be gone
        optipng $opt_optipng_args_nostrip "$1"
        rv=$?
    else
        optipng $opt_optipng_args "$1"
        rv=$?
    fi

    if [ $rv -ne 0 ]; then
        printf "error: optipng $opt_optipng_args \"$1\" returned $rv\n"

        if [ $opt_keepgoing = no ]; then
            exit 1
        fi
    fi

    if [ $apng -ne 0 ]; then
        # Do not invoke advpng on animated PNG files as it will strip the frames
        advpng $opt_advpng_args "$1"
        rv=$?

        if [ $rv -ne 0 ]; then
            printf "error: advpng $opt_optipng_args \"$1\" returned $rv\n"
            exit 1
        fi
    fi

    local comp_size=`$size_cmd "$1"`
    local ratio=`compression_ratio $src_size $comp_size`

    if [ $opt_verbose = yes ]; then
        printf "$1 $src_size $comp_size $ratio\n"
    fi

    total_src_size=$((total_src_size + src_size))
    total_comp_size=$((total_comp_size + comp_size))
    processed_files=$((processed_files + 1))
}

###############################################################################
# Prints out the compression ratio, $1 is the source file size, $2 is the
# compressed file size

compression_ratio() {
    echo "scale=3;
result = $2.0 / $1.0;
if (result >= 0 && result < 1) {
    print \"0\";
}

if (result == 0) {
    print \".\";
}
print result;" | bc
}

###############################################################################
# Main script

parse_args "$@"
check_programs

if [ $opt_help = yes ] || [ $# -eq 0 ]; then
    print_help
    exit 0
fi

# Process all the specified paths
mkfifo "$tmpdir/paths_pipe"
printf -- "$opt_paths" > "$tmpdir/paths_pipe" &

while read -r fd; do
    if [ -f "$fd" ]; then
        recompress_file "$fd"
    elif [ -d "$fd" ]; then
        recompress_dir "$fd"
    elif ! [ -e "$fd" ]; then
        printf "error: $fd no such file or directory\n"

        if [ $opt_keepgoing = no ]; then
            exit 1
        fi
    else
        printf "warning: skipping $fd, as it is neither a file nor a directory\n"
    fi
done < "$tmpdir/paths_pipe"

if [ $opt_verbose = yes ]; then
    printf "
Number of files processed: $processed_files
Total size of the files prior to recompression: $total_src_size
Total size of the files after recompression: $total_comp_size
Compression ratio: `compression_ratio $total_src_size $total_comp_size`
"
fi
