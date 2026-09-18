if(NOT TARGET oboe::oboe)
add_library(oboe::oboe SHARED IMPORTED)
set_target_properties(oboe::oboe PROPERTIES
    IMPORTED_LOCATION "C:/Users/udhay/.gradle/caches/9.3.1/transforms/2cd81c268779897f9290f429231ea61c/workspace/transformed/oboe-1.9.3/prefab/modules/oboe/libs/android.arm64-v8a/liboboe.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/udhay/.gradle/caches/9.3.1/transforms/2cd81c268779897f9290f429231ea61c/workspace/transformed/oboe-1.9.3/prefab/modules/oboe/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

