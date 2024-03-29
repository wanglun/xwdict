#include <string>
#include <syslog.h>

#include "libwrapper.h"

/* HP webOS PDK headers */
#include "SDL.h"
#include "PDL.h"

using std::string;

#define DICT_DIR    "/media/internal/xwdict"
static strlist_t ifo_list;
Library lib;

/* Ouput the C string to a FILE in a fully-escaped version.  This should transparently
 * handle UTF-8 character because the multi-byte characters always have the high bit set
 * which means they'll by > 128.  We just pass those through.  Since it's a C string,
 * NUL (0) terminates, and all other low control characters will be escaped either directly 
 * or as a \uXXXX code. */
static void fputs_json(const char *s, FILE *f) 
{
    unsigned int ch;
    if (!s) return;

    fputc('\"', f);
    while ((ch = *s++) != 0) {
        if (ch > 31 && ch != '\"' && ch != '\\') {
            fputc(ch, f);
        }
        else {
            switch (ch) {
                /* escaping forward slash ('/') is allowed in input, 
                   but not required on output */
                case '\\': fputs("\\\\", f); break;
                case '\"': fputs("\\\"", f); break;
                case '\b': fputs("\\b", f); break;
                case '\f': fputs("\\f", f); break;
                case '\n': fputs("<br/>", f); break;
                case '\r': fputs("\\r", f); break;
                case '\t': fputs("\\t", f); break;
                default:   fprintf(f, "\\u%04x", ch); break;
            }
        }
    }
    fputc('\"', f);
}

struct PushIfoFile {
	void operator()(const std::string& filename) {
        ifo_list.push_back(filename);
	}
};

/******************** to JS Layer********************/
static void dict_info(Library &lib)
{
    int i = 0;
    FILE *f = NULL;
    char *buffer;
    size_t bufferLength = 0;
    // output the file listing to our memory buffer, fclose will flush changes
    f = open_memstream(&buffer, &bufferLength);

    fputs("[", f);

    DictInfo dict_info;
    List::const_iterator it;
    for(it = ifo_list.begin(); it != ifo_list.end(); ++it) {
        if (dict_info.load_from_ifo_file(*it, false)) {
            fputs("{ \"bookname\":", f);
            fputs_json(dict_info.bookname.c_str(), f);
            fprintf(f, ", \"wordcount\":%d, \"author\":", dict_info.wordcount);
            fputs_json(dict_info.author.c_str(), f);
            fputs(", \"date\":", f);
            fputs_json(dict_info.date.c_str(), f);
            fputs(", \"description\":", f);
            fputs_json(dict_info.description.c_str(), f);
            fputs("},", f);
        }
    }

    fputs("]", f);
    fclose(f);

    // send data back to the JavaScript side
    syslog(LOG_WARNING, "%d return dictinfo", __LINE__);
    PDL_Err err;
    err = PDL_CallJS("dictInfoResult", (const char **)&buffer, 1);
    if (err) {
        syslog(LOG_ERR, "*** PDL_CallJS failed, %s", PDL_GetError());
        //SDL_Delay(5);
    }

    // now that we're done, free our working memory
    free(buffer);
}

static void query_result(TSearchResultList &res_list)
{
    char *buffer;
    size_t bufferLength = 0;
    // output the file listing to our memory buffer, fclose will flush changes
    FILE *f = open_memstream(&buffer, &bufferLength);

    fputs("[", f);
    for (int i = 0; i < res_list.size(); i++) {
        fputs("{\"dict\": ", f);
        fputs_json(res_list[i].bookname.c_str(), f);
        fputs(", \"word\": ", f);
        fputs_json(res_list[i].def.c_str(), f);
        fputs(", \"data\": ", f);
        fputs_json(res_list[i].exp.c_str(), f);
        fputs("},", f);
    }
    fputs("]", f);
    fclose(f);

    // send data back to the JavaScript side
    syslog(LOG_WARNING, "%d return results", __LINE__);
    PDL_Err err;
    err = PDL_CallJS("dictQueryResult", (const char **)&buffer, 1);
    if (err) {
        syslog(LOG_ERR, "*** PDL_CallJS failed, %s", PDL_GetError());
        //SDL_Delay(5);
    }

    // now that we're done, free our working memory
    free(buffer);
}

static PDL_bool dictInfo(PDL_JSParameters *params)
{
    if (PDL_GetNumJSParams(params) != 0) {
        syslog(LOG_INFO, "**** wrong number of parameters for dictInfo");
        PDL_JSException(params, "wrong number of parameters for dictInfo");
        return PDL_FALSE;
    }

    /* since we don't process this in the method thread, instead post a
     * SDL event that will be received in the main thread and used to 
     * launch the code. */
    SDL_Event event;
    event.user.type = SDL_USEREVENT;
    event.user.code = 1;

    syslog(LOG_WARNING, "*** sending dictInfo event");
    SDL_PushEvent(&event);
    
    return PDL_TRUE;
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

static PDL_bool dictConfig(PDL_JSParameters *params)
{
    if (PDL_GetNumJSParams(params) != 3) {
        syslog(LOG_INFO, "**** wrong number of parameters for dictQuery");
        PDL_JSException(params, "wrong number of parameters for dictQuery");
        return PDL_FALSE;
    }

    /* parameters are directory, pattern */
    int fuzzy = PDL_GetJSParamInt(params, 0);
    int regex = PDL_GetJSParamInt(params, 1);
    int data = PDL_GetJSParamInt(params, 2);
    /* set configs */
    lib.SetFuzzy((bool)fuzzy);
    lib.SetRegex((bool)regex);
    lib.SetData((bool)data);

    syslog(LOG_WARNING, "*** set dict config");
    
    return PDL_TRUE;
}

static PDL_bool pushDict(PDL_JSParameters *params)
{
    if (PDL_GetNumJSParams(params) != 1) {
        syslog(LOG_INFO, "**** wrong number of parameters for dictQuery");
        PDL_JSException(params, "wrong number of parameters for dictQuery");
        return PDL_FALSE;
    }

    /* parameters are directory, pattern */
    int index = PDL_GetJSParamInt(params, 0);
    syslog(LOG_WARNING, "*** push dict %d", index);

    // init the dict lib
    /* load the dicts */
    int i = 0;
    List::const_iterator it;
    strlist_t dict_list;
    for (it = ifo_list.begin(); it != ifo_list.end(); ++it, i++) {
        if (index & (0x1 << i)) {
            dict_list.push_back(*it);
        }
    }
    lib.reload(dict_list);
    
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
    static strlist_t dicts_dir_list;
    dicts_dir_list.push_back(DICT_DIR);

    /* push the ifo files */
    for_each_file(dicts_dir_list, ".ifo", PushIfoFile());

    // look for special -f switch to test getFiles from command line
    if (!PDL_IsPlugin()) {
        return 0;
    }
    else {
    }
    
    // register the js callback
    PDL_RegisterJSHandler("dictQuery", dictQuery);
    PDL_RegisterJSHandler("dictInfo", dictInfo);
    PDL_RegisterJSHandler("dictConfig", dictConfig);
    PDL_RegisterJSHandler("pushDict", pushDict);
    PDL_JSRegistrationComplete();

    openlog("com.xwteam.app.xwdict", 0, LOG_USER);
    // call a "ready" callback to let JavaScript know that we're initialized
    PDL_CallJS("ready", NULL, 0);
    syslog(LOG_INFO, "**** Registered");

    // Event descriptor
    SDL_Event event;
    do {
        SDL_WaitEvent(&event);
        syslog(LOG_INFO, "**** SDL_WaitEvent returned with event type %d", event.type);
        
        if (event.type == SDL_USEREVENT) {
            switch (event.user.code) {
                case 0:
                    {
                        syslog(LOG_WARNING, "*** processing dictQuery event");
                        /* extract our arguments */
                        char *query = (char *)event.user.data1;

                        /* find word */
                        TSearchResultList res_list;
                        lib.process_phrase(query, res_list);
                        query_result(res_list);

                        /* free memory since this event is processed now */
                        free(query);
                    }
                    break;
                case 1:
                    {
                        syslog(LOG_WARNING, "*** processing dictInfo event");
                        dict_info(lib);
                    }
                    break;
            }
        }
        
    } while (event.type != SDL_QUIT);
    // We exit anytime we get a request to quit the app

    // Cleanup
    PDL_Quit();
    SDL_Quit();

    return 0;
}
