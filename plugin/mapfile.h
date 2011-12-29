#ifndef _MAPFILE_H_
#define _MAPFILE_H_

#include <sys/types.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <glib.h>

class MapFile
{
public:
    MapFile(void) :
        data(NULL),
        mmap_fd(-1) {
    }
    ~MapFile();
    bool open(const char *file_name, unsigned long file_size);
    inline gchar *begin(void) { return data; }
private:
    char *data;
    unsigned long size;
    int mmap_fd;
};

inline bool MapFile::open(const char *file_name, unsigned long file_size)
{
    size=file_size;
    if((mmap_fd = ::open(file_name, O_RDONLY)) < 0) {
        //g_print("Open file %s failed!\n",fullfilename);
        return false;
    }
    data = (gchar *)mmap(NULL, file_size, PROT_READ, MAP_SHARED, mmap_fd, 0);
    if((void *)data == (void *)(-1)) {
        //g_print("mmap file %s failed!\n",idxfilename);
        data=NULL;
        return false;
    }

    return true;
}

inline MapFile::~MapFile()
{
    if(!data)
        return;
    munmap(data, size);
    close(mmap_fd);
}

#endif//!_MAPFILE_H_
