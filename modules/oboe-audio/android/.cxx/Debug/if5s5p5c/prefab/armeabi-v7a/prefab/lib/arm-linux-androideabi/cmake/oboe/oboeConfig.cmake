if(NOT TARGET oboe::oboe)
add_library(oboe::oboe SHARED IMPORTED)
set_target_properties(oboe::oboe PROPERTIES
    IMPORTED_LOCATION "C:/Users/udhay/.gradle/caches/9.3.1/transforms/f13f7dddd67bc25d3cc8b7a0bf28c840/workspace/transformed/oboe-1.9.3/prefab/modules/oboe/libs/android.armeabi-v7a/liboboe.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/udhay/.gradle/caches/9.3.1/transforms/f13f7dddd67bc25d3cc8b7a0bf28c840/workspace/transformed/oboe-1.9.3/prefab/modules/oboe/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

