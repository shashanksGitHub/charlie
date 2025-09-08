# YouTube Processing for CHARLEY's Godmodel AI

## Overview

We've enhanced the CHARLEY godmodel training system with the ability to learn from YouTube videos about relationships, psychology, and human behavior. This transformation makes the godmodel a multimodal learning platform capable of extracting valuable knowledge from educational video content.

## Key Features

- **Video Content Processing**: Extract and analyze transcripts from relationship psychology videos
- **Timestamped Transcripts**: Process video content with precise timing information
- **Topic Segmentation**: Automatically detect topic transitions within videos
- **Speaker Identification**: Identify different speakers in multi-person videos
- **Psychological Concept Extraction**: Detect mentions of relationship theories and concepts
- **Knowledge Integration**: Seamlessly combine video-derived knowledge with text-based content

## Technical Implementation

The YouTube processing system consists of several key components:

1. **youtube-api-config.ts**: Configuration for YouTube API integration
2. **transcript_processor.ts**: Specialized transcript processing with timestamp support
3. **youtube_processor.ts**: Core video extraction and analysis
4. **DocumentChunk (extended)**: Updated document types supporting video-specific metadata

## Usage Instructions

### Processing YouTube Videos

To process a YouTube video and extract relationship knowledge:

```bash
godmodel_trainer process-youtube https://www.youtube.com/watch?v=VIDEO_ID
```

For batch processing, use the provided script:

```bash
cd godmodel_trainer/examples
chmod +x process-relationship-videos.sh
./process-relationship-videos.sh
```

### API Key Setup

For production use, a YouTube API key is required:

1. Create a Google Cloud Project
2. Enable the YouTube Data API v3
3. Create an API key
4. Set it as an environment variable: `export YOUTUBE_API_KEY=your-key-here`

## Troubleshooting

### Application Port Conflicts

If you encounter port conflicts when starting the application, use the cleanup script:

```bash
# Kill any processes using ports 5000 and 5001
./cleanup.sh

# Then start the application
npm run dev
```

### Common Issues

1. **Missing video ID**: Ensure you're using a valid YouTube URL
2. **Transcript unavailable**: Some videos may not have captions available
3. **API rate limits**: If using the YouTube API, you may hit rate limits

## Documentation

Detailed documentation is available in:

- `godmodel_trainer/docs/youtube-processing.md`: Overview of YouTube processing
- `godmodel_trainer/docs/youtube-setup-guide.md`: Setting up the YouTube API
- `godmodel_trainer/docs/youtube-integration-guide.md`: Integrating YouTube processing

## Example Code

Example code for processing YouTube videos is available in:

- `godmodel_trainer/examples/process-relationship-videos.sh`: Batch processing script

## Future Development

Planned enhancements include:

- Full YouTube API integration
- Advanced speech recognition
- Multi-language support
- Visual content analysis
- Audio sentiment analysis

---

For more information, see the [godmodel_trainer README](godmodel_trainer/README.md).