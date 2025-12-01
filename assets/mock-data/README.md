# Mock Data for Local Development

This directory contains sample data for testing the Podify app without external dependencies.

## Files

### sample-feed.xml
A mock podcast RSS feed with 3 episodes:
- Episode 42: "The Future of AI Assistants" (45:30)
- Episode 41: "Building Voice-First Applications" (52:15)
- Episode 40: "The Podcast Renaissance" (38:42)

**Usage:** You can serve this file locally or use it as test data for the RSS parser.

To test locally:
```bash
# Serve the file using any HTTP server
npx http-server assets/mock-data -p 8080 --cors

# Then add this feed URL in the app:
# http://localhost:8080/sample-feed.xml
```

### sample-transcript.srt
A sample SRT transcript for Episode 42 covering the first 2 minutes of content.

Topics covered:
- Introduction to AI assistants
- Contextual awareness
- Technical architecture (STT → NLP → TTS)
- Podcast-specific applications

**Usage:** This can be used to test transcript parsing, search, and Q&A features.

## Audio Files

The feed uses public domain audio from SoundHelix as placeholder MP3 files. In production, these would be replaced with actual episode audio.
