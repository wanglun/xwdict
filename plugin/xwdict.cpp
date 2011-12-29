#include <string>

#include "libwrapper.h"

using std::string;

struct PrintDictInfo {
    void operator()(const std::string& filename, bool) {
        DictInfo dict_info;
        if(dict_info.load_from_ifo_file(filename, false)) {
            string bookname = dict_info.bookname;
            printf("%s    %d\n", bookname.c_str(), dict_info.wordcount);
        }
    }
};

void print_search_result(FILE *out, const TSearchResult & res)
{
    string loc_bookname, loc_def, loc_exp;
    fprintf(out, "-->%s\n-->%s\n%s\n\n",
            res.bookname.c_str(),
            res.def.c_str(),
            res.exp.c_str());
}

int main(int argc, char *argv[])
{
    strlist_t enable_list;
    string data_dir = "res";
    strlist_t dicts_dir_list;
    dicts_dir_list.push_back(data_dir);

    /* print dicts info */
    PrintDictInfo print_dict_info;
    strlist_t order_list, disable_list;
    for_each_file(dicts_dir_list, ".ifo",  order_list,
                  disable_list, print_dict_info);

    /* init the lib */
    Library lib;

    /* load the dicts */
    strlist_t empty_list;
    lib.load(dicts_dir_list, empty_list, disable_list);

    /* find word */
    TSearchResultList res_list;
    lib.process_phrase("hop?", res_list);

    print_search_result(stdout, res_list[0]);

    return 0;
}
