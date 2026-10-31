# NYAVERIS AI — device voice acceptance

Status: browser control regressions PASS; **audible device acceptance pending**. No paid speech service was added. Text remains usable when speech is unavailable. Speech synthesis is provided by the device/browser and can use its own local or network voice processing; no offline/privacy guarantee is implied.

## Implemented controls

- Read aloud and Stop speech, including repeat play and completion/error feedback.
- Cancel when the assistant closes or its explanation/language changes; release event listeners and utterance references.
- Select English (`en-IN`, or another English region), Tamil (`ta-IN`, or another Tamil region) or Hindi (`hi-IN`, or another Hindi region). Prefer a local exact voice. Never substitute a different language silently.
- React to asynchronously arriving device voices. A missing voice gives installation/retry guidance; an unsupported browser leaves readable text and explains unavailability. Playback exceptions and synthesis errors show recoverable feedback.
- Six Playwright cases use a deterministic **test-only device API adapter** for English/Tamil/Hindi play-stop-close, absent APIs, delayed voices, errors, completion, topic cancellation and thrown exceptions. They do not play real audio or prove a speaker works. Six pure voice-selection tests also passed.

## Manual procedure — perform on each device

Use a synthetic workplace and non-sensitive explanations. Record device/OS/browser version, chosen voice, language, pass/fail and any error; do not record account credentials, invitation links or safety tracking secrets.

| Check | Windows desktop | Android Chrome | iPhone Safari |
| --- | --- | --- | --- |
| Update browser/OS; verify speaker or headset and volume; choose the intended audio output | PENDING | PENDING | PENDING |
| Open NYAVERIS AI, choose English, ask Saarthi AI for pay guidance; confirm complete readable text | PENDING | PENDING | PENDING |
| Click/tap Read aloud after a user gesture; hear the correct English text and intelligible pronunciation | PENDING | PENDING | PENDING |
| Stop mid-sentence; ensure audio stops promptly, then replay without overlapping voices | PENDING | PENDING | PENDING |
| Close assistant while speaking; confirm audio stops and reopening works | PENDING | PENDING | PENDING |
| Change assistant topic while speaking; old speech stops; play the new explanation | PENDING | PENDING | PENDING |
| Switch to Tamil and Hindi separately; verify translated text and matching spoken language | PENDING | PENDING | PENDING |
| With the requested voice unavailable, see language-specific guidance; never hear another language instead | PENDING | PENDING | PENDING |
| Enable/download the language voice in OS accessibility/speech settings, reopen/retry and verify recovery | PENDING | PENDING | PENDING |
| Test a voice that requires a network with network unavailable; feedback/text remain usable | PENDING | PENDING | PENDING |
| Navigate/log out or refresh during speech; check for lingering audio and successful subsequent playback | PENDING | PENDING | PENDING |
| Test keyboard/screen-reader control labels and status announcements; no focus trap | PENDING | PENDING | PENDING |
| Check mobile portrait, landscape, background/foreground and locked-screen behavior | N/A or PENDING | PENDING | PENDING |

Windows: inspect Settings → Time & language → Speech / Language options for installed voices; exact labels vary by OS version. Android: inspect accessibility or text-to-speech engine/language settings; Chrome's available voice list depends on the engine/device. iPhone: inspect Accessibility → Spoken Content/Read & Speak voice settings; Safari availability can differ from OS settings. Installation alone is not a pass—verify the browser exposes and plays the chosen voice.

If playback fails, retain readable guidance, retry after enabling the correct voice/output and record the limitation. Do not mark automated API simulation as real audible acceptance.

Reference: [SpeechSynthesis API and voice events](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis), [Web Speech specification](https://webaudio.github.io/web-speech-api/#tts-section).
