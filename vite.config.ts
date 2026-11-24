import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function youtubeDownloaderPlugin() {
  const cacheDir = path.join(process.cwd(), '.spedia_cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const tasks: Record<string, { pct: number; status: string; file?: string; done: boolean; error?: string }> = {};

  return {
    name: 'youtube-downloader-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // Enable CORS for all API endpoints so deployed Spedia on GitHub Pages can communicate with local runner
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        const urlObj = new URL(req.url, 'http://localhost:5173');

        // 1. Start download task
        if (urlObj.pathname === '/api/start-download') {
          const id = urlObj.searchParams.get('id');
          if (!id) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing video ID' }));
          }

          const outPath = path.join(cacheDir, `${id}.mp4`);
          if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100000) {
            tasks[id] = { pct: 100, status: 'Ready in cache', file: `/api/video/${id}.mp4`, done: true };
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(tasks[id]));
          }

          tasks[id] = { pct: 8, status: 'Connecting and downloading with audio...', done: false };
          let lastError = '';

          const cookiesPath = path.join(process.cwd(), 'cookies.txt');
          const cookieArgs = fs.existsSync(cookiesPath) ? ['--cookies', cookiesPath] : [];

          const ytdlp = spawn('/opt/homebrew/bin/yt-dlp', [
            '--no-playlist',
            '--newline',
            '--progress',
            '-N', '4',
            '-f', 'b/best',
            ...cookieArgs,
            '-o', outPath,
            `https://www.youtube.com/watch?v=${id}`
          ], {
            env: {
              ...process.env,
              PYTHONUNBUFFERED: '1',
              PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}`
            }
          });

          ytdlp.stdout.on('data', (data) => {
            const str = data.toString();
            const match = str.match(/(\d+(?:\.\d+)?)%/);
            if (match) {
              const p = parseFloat(match[1]);
              tasks[id] = {
                pct: Math.min(99, Math.max(tasks[id]?.pct || 8, Math.round(p))),
                status: `Downloading with audio: ${p.toFixed(0)}%`,
                done: false
              };
            }
          });

          ytdlp.stderr.on('data', (data) => {
            const str = data.toString();
            console.error('[yt-dlp]', str);
            if (str.includes('ERROR:') || str.includes('Sign in') || str.includes('challenge')) {
              lastError = str.trim();
            }
          });

          ytdlp.on('close', (code) => {
            if (code === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 100000) {
              tasks[id] = { pct: 100, status: '100% Downloaded with audio', file: `/api/video/${id}.mp4`, done: true };
            } else if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100000) {
              tasks[id] = { pct: 100, status: '100% Downloaded with audio', file: `/api/video/${id}.mp4`, done: true };
            } else {
              tasks[id] = { pct: 0, status: 'YouTube stream protected', done: true, error: lastError || 'Stream protected by YouTube' };
            }
          });

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ status: 'started', id }));
        }

        // 2. Poll progress
        if (urlObj.pathname === '/api/progress-download') {
          const id = urlObj.searchParams.get('id');
          if (!id) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ pct: 0, status: 'Missing ID', done: false }));
          }

          const outPath = path.join(cacheDir, `${id}.mp4`);
          const partPath = path.join(cacheDir, `${id}.mp4.part`);

          // If final file is already on disk and complete
          if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100000) {
            const task = { pct: 100, status: '100% Downloaded with audio', file: `/api/video/${id}.mp4`, done: true };
            tasks[id] = task;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(task));
          }

          const task = tasks[id] || { pct: 8, status: 'Connecting to YouTube stream...', done: false };

          // If .part file exists on disk, reflect real downloaded bytes!
          if (fs.existsSync(partPath) && !task.done) {
            const bytes = fs.statSync(partPath).size;
            const mb = (bytes / (1024 * 1024)).toFixed(1);
            // Dynamic progressive pacing based on downloaded megabytes
            const livePct = Math.min(95, Math.max(task.pct || 8, Math.round(bytes / 600000)));
            task.pct = livePct;
            task.status = `Downloading with audio: ${mb} MB (${livePct}%)`;
          }

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(task));
        }

        // 3. Serve downloaded video file
        if (urlObj.pathname.startsWith('/api/video/')) {
          const filename = path.basename(urlObj.pathname);
          const filePath = path.join(cacheDir, filename);
          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            return res.end('Video not found');
          }
          const stat = fs.statSync(filePath);
          const range = req.headers.range;

          if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunksize = end - start + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${stat.size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': 'video/mp4',
              'Access-Control-Allow-Origin': '*',
            });
            fileStream.pipe(res);
          } else {
            res.writeHead(200, {
              'Content-Length': stat.size,
              'Content-Type': 'video/mp4',
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*',
            });
            fs.createReadStream(filePath).pipe(res);
          }
          return;
        }

        // 4. Delete / Offload video from cache
        if (urlObj.pathname === '/api/delete-video') {
          const id = urlObj.searchParams.get('id');
          if (id) {
            const filePath = path.join(cacheDir, `${id}.mp4`);
            if (fs.existsSync(filePath)) {
              try { fs.unlinkSync(filePath); } catch (e) {}
            }
            delete tasks[id];
          }
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ deleted: true, id }));
        }

        next();
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), youtubeDownloaderPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
