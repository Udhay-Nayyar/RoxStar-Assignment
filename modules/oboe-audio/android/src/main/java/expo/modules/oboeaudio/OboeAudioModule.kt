package expo.modules.oboeaudio

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class OboeAudioModule : Module() {
  companion object {
    init {
      System.loadLibrary("oboe-audio")
    }
  }

  // Thin JNI bridge only. Capture, Echo, WAV writing, and Oboe lifecycle live in C++.
  private external fun nativeStartRecording(path: String): String
  private external fun nativeStopRecording(): String
  private external fun nativeCancelRecording(): String
  private external fun nativeSetEffect(name: String)
  private external fun nativeGetRecordingState(): String
  private external fun nativeOnLifecyclePause()

  override fun definition() = ModuleDefinition {
    Name("OboeAudio")

    OnActivityEntersBackground {
      nativeOnLifecyclePause()
    }

    AsyncFunction("startRecording") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val file = File(context.filesDir, "roxstar-${System.currentTimeMillis()}.wav")
      val error = nativeStartRecording(file.absolutePath)
      if (error.isNotEmpty()) {
        throw Exception(error)
      }
      file.absolutePath
    }

    AsyncFunction("stopRecording") {
      val result = nativeStopRecording()
      if (result.startsWith("ERROR:")) {
        throw Exception(result.removePrefix("ERROR:"))
      }
      result
    }

    AsyncFunction("cancelRecording") {
      val error = nativeCancelRecording()
      if (error.isNotEmpty()) {
        throw Exception(error)
      }
    }

    Function("setEffect") { name: String ->
      nativeSetEffect(name)
    }

    Function("getRecordingState") {
      nativeGetRecordingState()
    }
  }
}
