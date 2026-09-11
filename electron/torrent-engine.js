/**
 * LunaStream desktop torrent engine (Electron main process).
 *
 * Pure Node module (no electron imports) so it can be tested standalone.
 * Uses WebTorrent with full TCP/uTP swarm access (unlike the browser build,
 * which only reaches WebRTC peers) and serves the selected file over a local
 * HTTP endpoint with Range support, so the app's own <video> player can
 * stream it directly - our player, zero third-party embeds, zero ads.
 */
const http = require('http');
const path = require('path');

const VIDEO_EXT = /\.(mp4|mkv|avi|webm|m4v|mov|ts)$/i;
const METADATA_TIMEOUT = 60 * 1000;
const STREAM_STALL_TIMEOUT = 45 * 1000;

class TorrentEngine {
  // Extra public trackers appended to every magnet - many TPB magnets carry
  // few or dead trackers, this substantially improves peer discovery.
  static EXTRA_TRACKERS = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.demonii.com:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://tracker.moeking.me:6969/announce',
    'udp://explodie.org:6969/announce',
    'udp://tracker1.bt.moack.co.kr:80/announce',
    'udp://tracker.dler.org:6969/announce',
    'udp://opentracker.i2p.rocks:6969/announce',
  ];

  /**
   * @param {object} opts
   * @param {string} opts.downloadPath  directory for torrent data
   * @param {(p: {progress:number, downloaded:number, speed:number, peers:number, name:string, done:boolean}) => void} [opts.onProgress]
   */
  constructor(opts) {
    this.downloadPath = opts.downloadPath;
    this.onProgress = opts.onProgress || (() => {});
    this.client = null;
    this.torrent = null;
    this.server = null;
    this.currentFile = null;
    this.progressTimer = null;
    this._loading = null;
  }

  /** Append extra trackers to a magnet URI (no-op for other inputs). */
  _withTrackers(input) {
    if (typeof input === 'string' && input.startsWith('magnet:')) {
      const extra = TorrentEngine.EXTRA_TRACKERS
        .filter((t) => !input.includes(encodeURIComponent(t) + '&') && !input.includes(t + '&'))
        .map((t) => `&tr=${encodeURIComponent(t)}`)
        .join('');
      return input + extra;
    }
    return input;
  }


  async _ensureClient() {
    if (this.client) return this.client;
    // webtorrent is ESM-only -> dynamic import (Electron 28+ main supports it)
    const mod = await import('webtorrent');
    const WebTorrent = mod.default;
    this.client = new WebTorrent({ downloadLimit: -1, uploadLimit: -1 });
    return this.client;
  }

  /**
   * Start streaming a magnet. Resolves when the file can be served.
   * @param {string} magnetUri
   * @returns {Promise<{url:string, name:string, size:number, infoHash:string}>}
   */
  async play(magnetUri) {
    // Restart cleanly if something is already playing
    this.stop();

    const client = await this._ensureClient();

    const torrent = await new Promise((resolve, reject) => {
      let to = setTimeout(() => reject(new Error('No metadata received (no peers found). Try a different source.')), METADATA_TIMEOUT);
      try {
        this.client.add(this._withTrackers(magnetUri), { path: this.downloadPath }, (t) => {
          clearTimeout(to);
          to = setTimeout(() => reject(new Error('Timed out while looking for sources.')), STREAM_STALL_TIMEOUT);
          const onReady = () => { clearTimeout(to); resolve(t); };
          if (t.ready) return onReady();
          t.once('ready', onReady);
          t.once('error', (err) => { clearTimeout(to); reject(err); });
        });
      } catch (err) { clearTimeout(to); reject(err); }
    });

    const video = torrent.files
      .filter((f) => VIDEO_EXT.test(f.name))
      .sort((a, b) => b.length - a.length)[0];
    if (!video) {
      torrent.destroy();
      throw new Error('No video file found in this torrent.');
    }

    this.torrent = torrent;
    this.currentFile = video;

    // Progress reporting (throttled)
    if (!this.progressTimer) {
      this.progressTimer = setInterval(() => {
        if (!this.torrent) return;
        this.onProgress({
          progress: this.torrent.progress,
          downloaded: this.torrent.downloaded,
          speed: this.torrent.downloadSpeed,
          peers: this.torrent.numPeers,
          name: this.torrent.name,
          done: this.torrent.progress >= 1,
        });
      }, 1000);
    }

    await new Promise((resolve) => {
      this.server = http.createServer((req, res) => this._serve(req, res));
      this.server.listen(0, '127.0.0.1', resolve);
    });

    const port = this.server.address().port;
    return {
      url: `http://127.0.0.1:${port}/`,
      name: video.name,
      size: video.length,
      infoHash: torrent.infoHash,
    };
  }

  /** HTTP handler: serves the selected file with Range support. */
  _serve(req, res) {
    const file = this.currentFile;
    if (!file || !this.torrent) { res.writeHead(503); res.end(); return; }

    const total = file.length;
    const m = req.headers.range ? req.headers.range.match(/bytes=(\d+)-(\d*)/) : null;
    let start = 0;
    let end = total - 1;
    let partial = false;
    if (m) {
      start = parseInt(m[1], 10) || 0;
      if (m[2]) end = Math.min(parseInt(m[2], 10), total - 1);
      if (start > end || start >= total) {
        res.writeHead(416, { 'Content-Range': `bytes */${total}` });
        res.end();
        return;
      }
      partial = true;
    }

    const ext = path.extname(file.name).toLowerCase();
    const types = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime', '.ts': 'video/mp2t' };

    res.writeHead(partial ? 206 : 200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Content-Length': end - start + 1,
      'Accept-Ranges': 'bytes',
      ...(partial ? { 'Content-Range': `bytes ${start}-${end}/${total}` } : {}),
      'Connection': 'close',
      'Access-Control-Allow-Origin': '*',
    });

    if (req.method === 'HEAD') { res.end(); return; }

    let stream;
    try {
      stream = file.createReadStream({ start, end });
    } catch (e) {
      res.destroy();
      return;
    }
    stream.pipe(res);
    stream.on('error', () => res.destroy());
    res.on('close', () => { try { stream.destroy(); } catch (e) { /* noop */ } });
  }

  /** Stop current playback (keeps the client for reuse). */
  stop() {
    if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null; }
    if (this.server) { try { this.server.close(); } catch (e) { /* noop */ } this.server = null; }
    if (this.torrent) { try { this.torrent.destroy(); } catch (e) { /* noop */ } this.torrent = null; }
    this.currentFile = null;
  }

  /** Fully tear down (app quit). */
  async destroy() {
    this.stop();
    if (this.client) {
      try { await this.client.destroy(); } catch (e) { /* noop */ }
      this.client = null;
    }
  }
}

module.exports = { TorrentEngine };
