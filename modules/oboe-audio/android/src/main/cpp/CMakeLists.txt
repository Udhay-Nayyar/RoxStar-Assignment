cmake_minimum_required(VERSION 3.22.1)

project(oboe-audio)

add_library(oboe-audio SHARED
    jni-bridge.cpp
    AudioEngine.cpp
    OboeRecorder.cpp
    EchoEffect.cpp
)

target_include_directories(oboe-audio PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
)

find_package(oboe REQUIRED CONFIG)

target_link_libraries(oboe-audio
    log
    oboe::oboe
)
