import sys
import asyncio
import os
import edge_tts


def split_text_at_sentences(text, max_chars=500):
    """Split text into chunks at clean sentence boundaries for parallel TTS processing."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    remaining = text

    while len(remaining) > max_chars:
        sub = remaining[:max_chars]
        # Find the last sentence-ending punctuation within the chunk
        last_period = -1
        for punct in ['. ', '? ', '! ', '.\n', '?\n', '!\n']:
            idx = sub.rfind(punct)
            if idx > last_period:
                last_period = idx

        if last_period > 200:
            # Cut at sentence boundary
            chunks.append(remaining[:last_period + 1].strip())
            remaining = remaining[last_period + 1:].strip()
        else:
            # No good sentence boundary — cut at last space
            last_space = sub.rfind(' ')
            if last_space > 200:
                chunks.append(remaining[:last_space].strip())
                remaining = remaining[last_space:].strip()
            else:
                chunks.append(sub.strip())
                remaining = remaining[max_chars:].strip()

    if remaining.strip():
        chunks.append(remaining.strip())

    return chunks


async def generate_chunk(text, voice_id, rate, pitch, output_path):
    """Generate TTS audio for a single text chunk with TV News anchor tuning."""
    try:
        clean_text = text.replace('"', '').replace('“', '').replace('”', '').replace("'", '').replace("`", '').strip()
        if not clean_text:
            return
        communicate = edge_tts.Communicate(clean_text, voice_id, rate=rate, pitch=pitch)
        await communicate.save(output_path)
    except Exception as e:
        sys.stderr.write(f"Chunk error: {e}\n")
        try:
            communicate = edge_tts.Communicate(text, voice_id)
            await communicate.save(output_path)
        except Exception:
            pass


async def main():
    if len(sys.argv) < 4:
        print("Usage: python generate_tts.py <text_file_path> <output_mp3_path> <voice_id> [rate] [pitch]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    voice_id = sys.argv[3]
    rate = sys.argv[4] if len(sys.argv) > 4 else "+10%"
    pitch = sys.argv[5] if len(sys.argv) > 5 else ("-2Hz" if "Ardi" in voice_id else "+0Hz")

    with open(input_path, 'r', encoding='utf-8') as f:
        text = f.read().strip()

    if not text:
        print("Empty text")
        sys.exit(1)

    # Clean quotes and unwanted symbols
    clean_all_text = text.replace('"', '').replace('“', '').replace('”', '').replace("'", '').replace("`", '').strip()

    # Split long text into chunks for parallel processing
    chunks = split_text_at_sentences(clean_all_text, max_chars=500)

    if len(chunks) == 1:
        # Single chunk — direct generation (fastest path)
        try:
            communicate = edge_tts.Communicate(chunks[0], voice_id, rate=rate, pitch=pitch)
            await communicate.save(output_path)
        except Exception:
            communicate = edge_tts.Communicate(chunks[0], voice_id)
            await communicate.save(output_path)
    else:
        # Multiple chunks — generate all in parallel with asyncio.gather
        chunk_paths = []
        tasks = []
        for i, chunk_text in enumerate(chunks):
            chunk_path = f"{output_path}.chunk_{i}.mp3"
            chunk_paths.append(chunk_path)
            tasks.append(generate_chunk(chunk_text, voice_id, rate, pitch, chunk_path))

        await asyncio.gather(*tasks)

        # Concatenate MP3 chunks (MP3 is a streaming format — binary concat works)
        with open(output_path, 'wb') as outfile:
            for chunk_path in chunk_paths:
                if os.path.exists(chunk_path):
                    with open(chunk_path, 'rb') as infile:
                        outfile.write(infile.read())
                    try:
                        os.unlink(chunk_path)
                    except Exception:
                        pass


if __name__ == "__main__":
    asyncio.run(main())
