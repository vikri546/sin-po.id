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
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL (1 day auto-cleanup)
const PUBLIC_AUDIO_DIR = path.join(process.cwd(), 'public', 'audio', 'tts');

function ensurePublicAudioDir() {
  if (!fs.existsSync(PUBLIC_AUDIO_DIR)) {
    fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
  }
}

/**
 * Automatically purges audio files on VPS disk and in memory older than 24 hours (1 day).
 * Prevents storage space & traffic inflation on VPS server while retaining daily audio availability for users.
 */
function cleanupExpiredAudioFiles(): { deletedCount: number; remainingCount: number; memoryEvicted: number } {
  let deletedCount = 0;
  let remainingCount = 0;
  let memoryEvicted = 0;
  const now = Date.now();

  try {
    // 1. Purge expired in-memory cache entries (> 24 hours)
    for (const [key, entry] of ttsAudioCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        ttsAudioCache.delete(key);
        memoryEvicted++;
      }
    }

    // 2. Purge expired MP3 files on VPS disk (public/audio/tts/)
    if (fs.existsSync(PUBLIC_AUDIO_DIR)) {
      const files = fs.readdirSync(PUBLIC_AUDIO_DIR);
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const filePath = path.join(PUBLIC_AUDIO_DIR, file);
          try {
            const stats = fs.statSync(filePath);
            const fileAgeMs = now - stats.mtimeMs;
            if (fileAgeMs > CACHE_TTL_MS) {
              fs.unlinkSync(filePath);
              deletedCount++;
            } else {
              remainingCount++;
            }
          } catch {
            // Ignore single file error
          }
        }
      }
    }

    // 3. Purge orphaned /tmp text and audio generation temp files older than 1 hour
    const tmpDir = '/tmp';
    if (fs.existsSync(tmpDir)) {
      const tmpFiles = fs.readdirSync(tmpDir);
      for (const file of tmpFiles) {
        if (file.startsWith('tts_input_') || file.startsWith('tts_out_')) {
          const filePath = path.join(tmpDir, file);
          try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > 60 * 60 * 1000) { // 1 hour threshold for tmp
              fs.unlinkSync(filePath);
            }
          } catch {
            // Ignore single file error
          }
        }
      }
    }
  } catch (err) {
    console.warn('[TTS Storage Cleanup Notice]:', err);
  }

  return { deletedCount, remainingCount, memoryEvicted };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req: Request) {
  // Trigger cleanup on GET request & return status
  const stats = cleanupExpiredAudioFiles();

  return NextResponse.json(
    {
      success: true,
      message: 'TTS Storage Status & Auto-Cleanup',
      ttlHours: 24,
      cleanedFiles: stats.deletedCount,
      remainingFiles: stats.remainingCount,
      evictedMemoryEntries: stats.memoryEvicted,
      audioDirectory: '/audio/tts',
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: Request) {
  try {
    // Proactively clean up expired files (> 24h) on every request in the background
    cleanupExpiredAudioFiles();

    const body = await req.json();
    const { title, author, text, voice, category, isSinpoDulu } = body || {};

    const categoryStr = (category || '').toString().toLowerCase();
    const isSinPoDuluCategory = isSinpoDulu === true || 
      categoryStr.includes('sin po dulu') || 
      categoryStr.includes('sin-po dulu') || 
      categoryStr.includes('sinpodulu');

    let processedText = '';

    if (title || author) {
      // Structured News Order: Title -> Reporter/Wartawan -> Article Content
      processedText = prepareNewsTextForTTS(title || '', author || '', text || '', isSinPoDuluCategory);
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

    // MD5 Hash for Persistent Disk & Memory Cache Key
    const cacheKey = `openvoice_${selectedVoice}_${isSinPoDuluCategory ? 'sinpodulu_' : ''}${title || ''}_${author || ''}_${textForEdge}`;
    const hash = crypto.createHash('md5').update(cacheKey).digest('hex');
    const publicFilePath = path.join(PUBLIC_AUDIO_DIR, `${hash}.mp3`);
    const publicUrl = `/audio/tts/${hash}.mp3`; // Publicly accessible URL
    const now = Date.now();

    // 1. Check Server In-Memory Cache (Instant 0ms response) — verify not expired (> 24h)
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return new NextResponse(cached.buffer.slice(0), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/mpeg',
            'X-TTS-Cache': 'MEMORY_HIT',
            'X-TTS-Url': publicUrl,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'Content-Disposition': 'inline; filename="article-speech.mp3"',
          },
        });
      } else {
        ttsAudioCache.delete(cacheKey); // Evict expired memory entry
      }
    }

    // 2. Check Public Audio Storage (Instant <10ms — file served at /audio/tts/HASH.mp3)
    ensurePublicAudioDir();
    if (fs.existsSync(publicFilePath)) {
      try {
        const stats = fs.statSync(publicFilePath);
        // Auto-delete files older than 24 hours (24 * 60 * 60 * 1000 ms)
        if (now - stats.mtimeMs > CACHE_TTL_MS) {
          fs.unlinkSync(publicFilePath);
          ttsAudioCache.delete(cacheKey);
        } else {
          const audioBuffer = fs.readFileSync(publicFilePath);
          const arrayBuf = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength);
          ttsAudioCache.set(cacheKey, { buffer: arrayBuf, timestamp: stats.mtimeMs });

          return new NextResponse(arrayBuf, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'audio/mpeg',
              'X-TTS-Cache': 'DISK_HIT',
              'X-TTS-Url': publicUrl,
              'Cache-Control': 'public, max-age=86400, s-maxage=86400',
              'Content-Disposition': 'inline; filename="article-speech.mp3"',
            },
          });
        }
      } catch {
        // Fall through to regeneration if file error occurs
      }
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
      
      // Send full article text — generate_tts.py processes 500-char chunks in parallel via asyncio.gather
      const textToGenerate = textForEdge.length > 100000 ? textForEdge.substring(0, 100000) : textForEdge;

      // Write cleaned text to temp input file
      fs.writeFileSync(tmpTxtFilename, textToGenerate, 'utf-8');

      // Vintage Radio Broadcast Tuning for Sin Po Dulu (-4Hz pitch for deep classic radio tone, +0% speed)
      // Standard News Anchor Tuning (-2Hz pitch, +10% speech rate)
      const rate = isSinPoDuluCategory ? '+0%' : '+10%';
      const pitch = isSinPoDuluCategory
        ? '-4Hz'
        : (selectedVoice === 'id-ID-ArdiNeural' ? '-2Hz' : '+0Hz');

      const cmd = `"${pythonBin}" "${scriptPath}" "${tmpTxtFilename}" "${tmpMp3Filename}" "${selectedVoice}" "${rate}" "${pitch}"`;

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
            ...corsHeaders,
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

    // 4. Fallback to ElevenLabs if local OpenVoice engine binary is unreachable
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
