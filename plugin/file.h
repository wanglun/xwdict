#ifndef _FILE_H_
#define _FILE_H_

#include <algorithm>
#include <glib.h>
#include <list>
#include <string>


typedef std::list<std::string> List;

template<typename Function>
void __for_each_file(const std::string& dirname, const std::string& suff, Function f)
{
    GDir *dir = g_dir_open(dirname.c_str(), 0, NULL);
    if(dir) {
        const gchar *filename;

        while((filename = g_dir_read_name(dir))!=NULL) {
            std::string fullfilename(dirname+G_DIR_SEPARATOR_S+filename);
            if(g_file_test(fullfilename.c_str(), G_FILE_TEST_IS_DIR))
                __for_each_file(fullfilename, suff, f);
            else if(g_str_has_suffix(filename, suff.c_str())) {
                f(fullfilename);
            }
        }
        g_dir_close(dir);
    }
}

template<typename Function>
void for_each_file(const List& dirs_list, const std::string& suff, Function f)
{
    List::const_iterator it;
    for(it=dirs_list.begin(); it!=dirs_list.end(); ++it)
        __for_each_file(*it, suff, f);
}

#endif//!_FILE_H_
