# Live Transcription Feature

## Overview

The live transcription feature provides real-time speech-to-text conversion during video consultations, helping overcome language dialect barriers and improving communication between doctors and patients.

## Features

### ✅ Real-Time Transcription
- Live speech-to-text conversion using Web Speech API
- Displays interim (in-progress) and final transcripts
- Auto-scrolls to show latest transcriptions
- Timestamps for each transcript entry

### ✅ Multi-Language Support
Supports 13+ languages and dialects:
- English (US, UK, India)
- Spanish
- French
- German
- Italian
- Portuguese (Brazil)
- Hindi
- Chinese (Mandarin)
- Japanese
- Korean
- Arabic
- And more...

### ✅ User Controls
- **Start/Stop**: Toggle transcription on/off
- **Language Selection**: Change language during consultation
- **Download**: Export transcripts as text file
- **Clear**: Remove all transcripts

### ✅ Visual Indicators
- Red pulse indicator when actively listening
- Real-time typing animation for interim text
- Entry counter showing total transcripts
- Speaker identification with timestamps

## How to Use

### For Users

1. **Start Video Consultation**
   - Click on an appointment to join the consultation
   - The transcription panel appears on the right side by default

2. **Enable Transcription**
   - Click the **"Start"** button in the transcription panel
   - Grant microphone permission when prompted by browser
   - Begin speaking - your speech will be converted to text in real-time

3. **Change Language**
   - Select your preferred language from the dropdown
   - The system will restart transcription with the new language
   - Note: Stop transcription before changing language for best results

4. **Download Transcript**
   - Click the **Download** icon (⬇) to save the full transcript
   - File is saved as: `consultation-transcript-[timestamp].txt`

5. **Clear Transcripts**
   - Click the **Trash** icon (🗑) to clear all transcripts
   - Useful for starting fresh during the same session

6. **Toggle Panels**
   - **Hide Video**: Button to hide/show video panel
   - **Hide Transcript**: Button to hide/show transcript panel
   - Customize your layout based on needs

## Technical Details

### Browser Support

The Web Speech API is supported in:
- ✅ Chrome/Edge (Best support)
- ✅ Safari (Good support)
- ❌ Firefox (Limited support)

**Note**: If browser doesn't support speech recognition, a friendly message will be displayed.

### How It Works

1. **Audio Capture**: Captures audio from user's microphone
2. **Speech Recognition**: Uses browser's built-in Web Speech API
3. **Real-Time Processing**: Converts speech to text continuously
4. **Display**: Shows interim and final results with timestamps
5. **Export**: Allows downloading complete transcript

### Privacy & Security

- All speech processing happens **locally in the browser**
- No audio data is sent to external servers
- Transcripts are stored only in component state (not persisted)
- Cleared when consultation ends

## Implementation Details

### Files Added/Modified

#### New Files:
- `client/src/components/video/LiveTranscription.tsx` - Main transcription component

#### Modified Files:
- `client/src/components/stream/StreamConsultation.tsx` - Integrated transcription panel

### Component Structure

```tsx
<StreamConsultation>
  ├── Header (Controls)
  ├── Main Content
  │   ├── Chat Panel (25%)
  │   ├── Video Panel (50%) [Optional]
  │   └── Transcript Panel (25%) [Optional]
  └── LiveTranscription
      ├── Header (Language, Controls)
      ├── Transcript List
      └── Status Footer
```

### State Management

```typescript
const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
const [isListening, setIsListening] = useState(false);
const [selectedLanguage, setSelectedLanguage] = useState("en-US");
const [interimTranscript, setInterimTranscript] = useState("");
```

### Key Functions

- `toggleListening()` - Start/stop speech recognition
- `changeLanguage()` - Switch recognition language
- `downloadTranscript()` - Export transcripts to file
- `clearTranscripts()` - Clear all entries

## Configuration

### Default Language
Change default language in `StreamConsultation.tsx`:

```tsx
<LiveTranscription
  userId={currentUser.id}
  userName={currentUser.name}
  language="hi-IN" // Change to desired default
/>
```

### Supported Language Codes

| Language | Code |
|----------|------|
| English (US) | en-US |
| English (UK) | en-GB |
| English (India) | en-IN |
| Spanish | es-ES |
| French | fr-FR |
| German | de-DE |
| Italian | it-IT |
| Portuguese (Brazil) | pt-BR |
| Hindi | hi-IN |
| Chinese (Mandarin) | zh-CN |
| Japanese | ja-JP |
| Korean | ko-KR |
| Arabic | ar-SA |

## Troubleshooting

### Issue: "Speech recognition is not supported"
**Solution**: Use Chrome, Edge, or Safari browser

### Issue: Transcription not starting
**Solution**: 
1. Check microphone permissions in browser settings
2. Ensure HTTPS connection (required for microphone access)
3. Try refreshing the page and starting again

### Issue: Wrong language detected
**Solution**:
1. Stop transcription
2. Select correct language from dropdown
3. Start transcription again

### Issue: Transcription stops unexpectedly
**Solution**: 
- Component automatically restarts recognition
- If issue persists, manually stop and start again

### Issue: Poor accuracy
**Solution**:
1. Speak clearly and at moderate pace
2. Reduce background noise
3. Use a good quality microphone
4. Ensure selected language matches spoken language

## Future Enhancements

Potential improvements for future versions:

1. **Cloud-Based Services**
   - Integration with Azure Speech Services for better accuracy
   - Support for more languages and dialects
   - Real-time translation between languages

2. **Advanced Features**
   - Automatic punctuation
   - Speaker diarization (identify who's speaking)
   - Medical terminology recognition
   - Transcript sharing between participants

3. **Storage & History**
   - Save transcripts to database
   - Access past consultation transcripts
   - Search within transcripts

4. **AI Enhancements**
   - Automatic summary generation
   - Key points extraction
   - Medical term highlighting

## Cost

**Current Implementation: FREE** ✅
- Uses browser's built-in Web Speech API
- No API keys required
- No usage limits
- No external dependencies

**Alternative (Future):**
- Azure Speech Services: ~$1 per hour of audio
- Google Cloud Speech-to-Text: ~$1.44 per hour

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify microphone permissions
3. Test in different browser (Chrome recommended)
4. Check network connection for video consultation

## Demo

Try it out:
1. Book a test appointment
2. Join the consultation room
3. Click "Start" in the transcription panel
4. Start speaking - see your words appear in real-time!

---

**Last Updated**: November 8, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
