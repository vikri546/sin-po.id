import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { prepareNewsTextForTTS, normalizeIndonesianAcronyms, formatIndonesianCurrency, formatQuotesAndPauses } from '../../../src/lib/textNormalizer';

const execAsync = promisify(exec);

// Server-side In-Memory & Public Disk Audio Storage
// Audio files saved to public/audio/tts/ → publicly accessible at /audio/tts/HASH.mp3
const ttsAudioCache = new Map<string, { buffer: ArrayBuffer; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL memory cache
const PUBLIC_AUDIO_DIR = path.join(process.cwd(), 'public', 'audio', 'tts');

function ensurePublicAudioDir() {
  if (!fs.existsSync(PUBLIC_AUDIO_DIR)) {
    fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
  }
}

// Path to Orpheus-TTS virtualenv python
const VENV_PYTHON = path.join(process.cwd(), 'Orpheus-TTS', 'venv', 'bin', 'python');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, author, text, voice } = body || {};

    let processedText = '';

    if (title || author) {
      // Structured News Order: Title -> Reporter/Wartawan -> Article Content
      processedText = prepareNewsTextForTTS(title || '', author || '', text || '');
    } else if (typeof text === 'string' && text.trim().length > 0) {
      // Raw text provided
      const cleanContent = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      processedText = formatQuotesAndPauses(
        normalizeIndonesianAcronyms(formatIndonesianCurrency(cleanContent))
      );
    } else {
      return NextResponse.json({ error: 'Teks artikel tidak boleh kosong' }, { status: 400 });
    }

    // Clean up SSML break tags for edge_tts (plain text only)
    const textForEdge = processedText
      .replace(/<break[^>]*\/>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Primary Voice: id-ID-GadisNeural (Female News Anchor) or id-ID-ArdiNeural (Male News Anchor)
    const selectedVoice = voice === 'male' ? 'id-ID-ArdiNeural' : 'id-ID-GadisNeural';

    // MD5 Hash for Persistent Disk & Memory Cache Key (Hashes full article text so edits automatically trigger new audio generation)
    const cacheKey = `openvoice_${selectedVoice}_${title || ''}_${author || ''}_${textForEdge}`;
    const hash = crypto.createHash('md5').update(cacheKey).digest('hex');
    const publicFilePath = path.join(PUBLIC_AUDIO_DIR, `${hash}.mp3`);
    const publicUrl = `/audio/tts/${hash}.mp3`; // Publicly accessible URL
    const now = Date.now();

    // 1. Check Server In-Memory Cache (Instant 0ms response)
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return new NextResponse(cached.buffer.slice(0), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'X-TTS-Cache': 'MEMORY_HIT',
            'X-TTS-Url': publicUrl,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'Content-Disposition': 'inline; filename="article-speech.mp3"',
          },
        });
      }
    }

    // 2. Check Public Audio Storage (Instant <10ms — file served at /audio/tts/HASH.mp3)
    ensurePublicAudioDir();
    if (fs.existsSync(publicFilePath)) {
      const audioBuffer = fs.readFileSync(publicFilePath);
      const arrayBuf = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength);
      ttsAudioCache.set(cacheKey, { buffer: arrayBuf, timestamp: now });

      return new NextResponse(arrayBuf, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-TTS-Cache': 'DISK_HIT',
          'X-TTS-Url': publicUrl,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          'Content-Disposition': 'inline; filename="article-speech.mp3"',
        },
      });
    }

    // 3. Generate Full-Length Neural Speech using Parallel Chunk Processing
    try {
      const venvPythonPath = path.join(process.cwd(), 'Orpheus-TTS', 'venv', 'bin', 'python');
      const venvPython3Path = path.join(process.cwd(), 'Orpheus-TTS', 'venv', 'bin', 'python3');
      let pythonBin = 'python3';
      if (fs.existsSync(venvPythonPath)) {
        pythonBin = venvPythonPath;
      } else if (fs.existsSync(venvPython3Path)) {
        pythonBin = venvPython3Path;
      }

      const scriptsGenPath = path.join(process.cwd(), 'scripts', 'generate_tts.py');
      const orpheusGenPath = path.join(process.cwd(), 'Orpheus-TTS', 'generate_tts.py');
      const rootGenPath = path.join(process.cwd(), 'generate_tts.py');

      let scriptPath = scriptsGenPath;
      if (fs.existsSync(scriptsGenPath)) {
        scriptPath = scriptsGenPath;
      } else if (fs.existsSync(orpheusGenPath)) {
        scriptPath = orpheusGenPath;
      } else if (fs.existsSync(rootGenPath)) {
        scriptPath = rootGenPath;
      }
      const uid = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const tmpTxtFilename = path.join('/tmp', `tts_input_${uid}.txt`);
      const tmpMp3Filename = path.join('/tmp', `tts_out_${uid}.mp3`);
      
      // Send full article text (up to 10000 chars) — generate_tts.py processes 500-char chunks in parallel via asyncio.gather
      const textToGenerate = textForEdge.length > 100000 ? textForEdge.substring(0, 100000) : textForEdge;

      // Write cleaned text to temp input file
      fs.writeFileSync(tmpTxtFilename, textToGenerate, 'utf-8');

      // TV News Anchor Tuning: -2Hz pitch for deep male broadcast resonance, +0Hz for crisp female anchor
      const pitch = selectedVoice === 'id-ID-ArdiNeural' ? '-2Hz' : '+0Hz';
      const cmd = `"${pythonBin}" "${scriptPath}" "${tmpTxtFilename}" "${tmpMp3Filename}" "${selectedVoice}" "+10%" "${pitch}"`;

      await execAsync(cmd, { timeout: 45000 });

      // Clean up temp text input file
      if (fs.existsSync(tmpTxtFilename)) {
        fs.unlinkSync(tmpTxtFilename);
      }

      if (fs.existsSync(tmpMp3Filename)) {
        const audioBuffer = fs.readFileSync(tmpMp3Filename);
        fs.unlinkSync(tmpMp3Filename); // Clean up temp mp3 file

        // Save to public audio storage → accessible at /audio/tts/HASH.mp3
        ensurePublicAudioDir();
        fs.writeFileSync(publicFilePath, audioBuffer);

        // Store in 24h memory cache
        const arrayBuf = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength);
        ttsAudioCache.set(cacheKey, { buffer: arrayBuf, timestamp: now });

        return new NextResponse(arrayBuf, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'X-TTS-Cache': 'MISS',
            'X-TTS-Engine': 'Edge-Neural-OpenVoice',
            'X-TTS-Url': publicUrl,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'Content-Disposition': 'inline; filename="article-speech.mp3"',
          },
        });
      }
    } catch (openVoiceErr: any) {
      console.warn('OpenVoice Generation Warning:', openVoiceErr?.message || openVoiceErr);
    }

    // 3. Fallback to ElevenLabs if local OpenVoice engine binary is unreachable
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';

    if (apiKey) {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: textForEdge.substring(0, 2500),
            model_id: 'eleven_flash_v2_5',
            language_code: 'id',
          }),
        }
      );

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          },
        });
      }
    }

    return NextResponse.json({ error: 'Gagal memproses audio Text-to-Speech' }, { status: 500 });
  } catch (error: any) {
    console.error('TTS Internal Error:', error);
    return NextResponse.json({ error: error?.message || 'Terjadi kesalahan pada server TTS' }, { status: 500 });
  }
}
