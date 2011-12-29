#ifndef _LIBWRAPPER_HPP_
#define _LIBWRAPPER_HPP_

#include <string>
#include <vector>

#include "file.h"
#include "lib.h"

using std::string;
using std::vector;

//this structure is wrapper and it need for unification
//results of search whith return Dicts class
struct TSearchResult {
    string bookname;
    string def;
    string exp;

    TSearchResult(const string& bookname_, const string& def_, const string& exp_)
        : bookname(bookname_), def(def_), exp(exp_) {
    }
};

typedef vector<TSearchResult> TSearchResultList;
typedef TSearchResultList::iterator PSearchResult;

//this class is wrapper around Dicts class for easy use
//of it
class Library : public Libs
{
public:
    Library()
    {}

    bool process_phrase(const char *loc_str, TSearchResultList &res_list);
private:
    void SimpleLookup(const string &str, TSearchResultList& res_list);
    void LookupWithFuzzy(const string &str, TSearchResultList& res_list);
    void LookupWithRule(const string &str, TSearchResultList& res_lsit);
    void LookupData(const string &str, TSearchResultList& res_list);
};

#endif//!_LIBWRAPPER_HPP_
