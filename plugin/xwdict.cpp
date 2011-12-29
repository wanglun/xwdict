#include <string>
#include <syslog.h>

#include "libwrapper.h"

/* HP webOS PDK headers */
#include "SDL.h"
#include "PDL.h"

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

static void do_print_dict_info(strlist_t dicts_dir_list) {
    /* print dicts info */
    PrintDictInfo print_dict_info;
    strlist_t order_list, disable_list;
    for_each_file(dicts_dir_list, ".ifo",  order_list,
                  disable_list, print_dict_info);
}

static void print_search_result(FILE *out, const TSearchResult & res)
{
    string loc_bookname, loc_def, loc_exp;
    fprintf(out, "-->%s\n-->%s\n%s\n\n",
            res.bookname.c_str(),
            res.def.c_str(),
            res.exp.c_str());
}

static void output_result(TSearchResultList res_list)
{
    const char *buffer;
    buffer = res_list[0].exp.c_str();
    // send data back to the JavaScript side
    syslog(LOG_WARNING, "*** returning results");
    PDL_Err err;
    err = PDL_CallJS("dictQueryResult", (const char **)&buffer, 1);
    if (err) {
        syslog(LOG_ERR, "*** PDL_CallJS failed, %s", PDL_GetError());
        //SDL_Delay(5);
    }
}

static PDL_bool dictQuery(PDL_JSParameters *params)
{
    if (PDL_GetNumJSParams(params) != 1) {
        syslog(LOG_INFO, "**** wrong number of parameters for dictQuery");
        PDL_JSException(params, "wrong number of parameters for dictQuery");
        return PDL_FALSE;
    }

    /* parameters are directory, pattern */
    const char *query = PDL_GetJSParamString(params, 0);

    /* since we don't process this in the method thread, instead post a
     * SDL event that will be received in the main thread and used to 
     * launch the code. */
    SDL_Event event;
    event.user.type = SDL_USEREVENT;
    event.user.code = 0;
    event.user.data1 = strdup(query);

    syslog(LOG_WARNING, "*** sending dictQuery event");
    SDL_PushEvent(&event);
    
    return PDL_TRUE;
}

int main(int argc, char *argv[])
{
    // Initialize the SDL library with the Video subsystem
    int result = SDL_Init(SDL_INIT_VIDEO);
   
    if ( result != 0 ) {
        printf("Could not init SDL: %s\n", SDL_GetError());
        exit(1);
    }

    PDL_Init(0);

    /* dict dirs */
    string data_dir = "res";
    strlist_t dicts_dir_list;
    dicts_dir_list.push_back(data_dir);

    // look for special -f switch to test getFiles from command line
    if (!PDL_IsPlugin()) {
        do_print_dict_info(dicts_dir_list);
        return 0;
    }
    else {
    }
    
    // register the js callback
    PDL_RegisterJSHandler("dictQuery", dictQuery);
    PDL_JSRegistrationComplete();

    // init the dict lib
    /* init the lib */
    Library lib;
    /* load the dicts */
    strlist_t empty_list, disable_list;
    lib.load(dicts_dir_list, empty_list, disable_list);

    // call a "ready" callback to let JavaScript know that we're initialized
    PDL_CallJS("ready", NULL, 0);
    syslog(LOG_INFO, "**** Registered");

    // Event descriptor
    SDL_Event event;
    do {
        SDL_WaitEvent(&event);
        syslog(LOG_INFO, "**** SDL_WaitEvent returned with event type %d", event.type);
        
        if (event.type == SDL_USEREVENT && event.user.code == 0) {
            syslog(LOG_WARNING, "*** processing dictQuery event");
            /* extract our arguments */
            char *query = (char *)event.user.data1;

            /* find word */
            TSearchResultList res_list;
            lib.process_phrase(query, res_list);
            output_result(res_list);

            /* free memory since this event is processed now */
            free(query);
        }
        
    } while (event.type != SDL_QUIT);
    // We exit anytime we get a request to quit the app

    // Cleanup
    PDL_Quit();
    SDL_Quit();

    return 0;
}
