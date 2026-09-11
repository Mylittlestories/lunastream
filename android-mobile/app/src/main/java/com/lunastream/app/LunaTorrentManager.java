package com.lunastream.app;

import android.content.Context;
import android.webkit.JavascriptInterface;

import com.frostwire.jlibtorrent.FileStorage;
import com.frostwire.jlibtorrent.Priority;
import com.frostwire.jlibtorrent.SessionManager;
import com.frostwire.jlibtorrent.TorrentHandle;
import com.frostwire.jlibtorrent.TorrentInfo;
import com.frostwire.jlibtorrent.swig.libtorrent;

import org.json.JSONObject;

import java.io.File;
import java.io.RandomAccessFile;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLEncoder;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Native torrent streaming for the Android app.
 *
 * Runs a real libtorrent engine (jlibtorrent) with full TCP/uTP swarm access,
 * downloads the largest video file sequentially and serves it over a local
 * HTTP endpoint (127.0.0.1) with Range support. The WebView's <video> element
 * plays that local URL through OUR OWN player - no third-party embed players,
 * no popups, no ads.
 *
 * JS bridge: window.LunaTorrent.play(magnet, id) then poll window.LunaTorrent.status(id)
 */
public final class LunaTorrentManager {

    private static final Pattern RANGE_RE = Pattern.compile("bytes=(\\d+)-(\\d*)");
    private static final String[] VIDEO_EXT = {".mp4", ".mkv", ".webm", ".m4v", ".avi", ".mov", ".ts"};
    private static final long MAX_WAIT_FOR_BYTES_MS = 45_000;

    private static volatile LunaTorrentManager instance;

    public static LunaTorrentManager get(Context ctx) {
        if (instance == null) {
            synchronized (LunaTorrentManager.class) {
                if (instance == null) instance = new LunaTorrentManager(ctx.getApplicationContext());
            }
        }
        return instance;
    }

    private final Context appContext;
    private final Object lock = new Object();

    private SessionManager session;
    private ServerSocket serverSocket;
    private Thread serverThread;
    private int port = -1;

    private String currentReqId;
    private String state = "idle"; // idle | starting | metadata | downloading | ready | error
    private String message = "";
    private String playUrl;
    private String errorText;

    private TorrentHandle handle;
    private TorrentInfo info;
    private int videoFileIndex = -1;
    private long videoFileSize = 0;
    private File videoFile;

    private LunaTorrentManager(Context ctx) {
        this.appContext = ctx;
    }

    // ===================== JS BRIDGE =====================

    public static final class Bridge {
        private final Context ctx;

        public Bridge(Context ctx) { this.ctx = ctx; }

        @JavascriptInterface
        public void play(String magnet, String reqId) {
            LunaTorrentManager.get(ctx).startPlay(magnet, reqId);
        }

        @JavascriptInterface
        public String status(String reqId) {
            return LunaTorrentManager.get(ctx).statusJson(reqId);
        }

        @JavascriptInterface
        public void stop() {
            LunaTorrentManager.get(ctx).stopAll();
        }
    }

    // ===================== PUBLIC CONTROL =====================

    public void startPlay(final String magnet, final String reqId) {
        new Thread(() -> {
            synchronized (lock) {
                try {
                    currentReqId = reqId;
                    state = "starting";
                    message = "Connecting to torrent network…";
                    playUrl = null;
                    errorText = null;

                    ensureSession();
                    ensureServer();

                    state = "metadata";
                    message = "Fetching torrent metadata…";

                    File saveDir = new File(appContext.getFilesDir(), "torrents");
                    if (!saveDir.exists()) saveDir.mkdirs();

                    byte[] data = session.fetchMagnet(magnet, 60, saveDir);
                    if (data == null) throw new Exception("No metadata received (no peers found). Try another source.");
                    TorrentInfo ti = TorrentInfo.bdecode(data);
                    info = ti;

                    // pick largest video file
                    FileStorage fs = ti.files();
                    int n = fs.numFiles();
                    int best = -1;
                    long bestSize = -1;
                    for (int i = 0; i < n; i++) {
                        String p = fs.filePath(i).toLowerCase();
                        for (String ext : VIDEO_EXT) {
                            if (p.endsWith(ext) && fs.fileSize(i) > bestSize) {
                                best = i;
                                bestSize = fs.fileSize(i);
                                break;
                            }
                        }
                    }
                    if (best < 0) throw new Exception("No video file found in this torrent.");
                    videoFileIndex = best;
                    videoFileSize = fs.fileSize(best);

                    state = "downloading";
                    message = "Buffering… 0%";

                    // download only the video file, sequentially
                    Priority[] prio = new Priority[n];
                    for (int i = 0; i < n; i++) prio[i] = (i == best) ? Priority.NORMAL : Priority.IGNORE;
                    session.download(ti, saveDir);
                    handle = session.find(ti.infoHashV1());
                    if (handle == null) throw new Exception("Could not start torrent.");
                    try {
                        handle.prioritizeFiles(prio);
                        handle.setFlags(libtorrent.getSequential_download());
                    } catch (Throwable ignored) {
                        // flags are an optimization; streaming still works without them
                    }

                    String relPath = fs.filePath(best);
                    videoFile = new File(saveDir, relPath);

                    // wait for first bytes so playback starts instantly
                    waitForBytes(0);
                    state = "ready";
                    message = "";
                    playUrl = "http://127.0.0.1:" + port + "/file?f=" + URLEncoder.encode(relPath, "UTF-8");
                } catch (Throwable t) {
                    state = "error";
                    errorText = t.getMessage() != null ? t.getMessage() : "Torrent engine error";
                }
            }
        }, "LunaTorrent-play").start();
    }

    public String statusJson(String reqId) {
        synchronized (lock) {
            try {
                JSONObject o = new JSONObject();
                if (reqId != null && currentReqId != null && !reqId.equals(currentReqId)) {
                    o.put("state", "stale");
                    return o.toString();
                }
                o.put("state", state);
                if ("downloading".equals(state) && handle != null) {
                    long done = 0;
                    try {
                        long[] fp = handle.fileProgress();
                        if (videoFileIndex >= 0 && videoFileIndex < fp.length) done = fp[videoFileIndex];
                    } catch (Throwable ignored) {
                    }
                    double pct = videoFileSize > 0 ? (done * 100.0 / videoFileSize) : 0;
                    o.put("progress", pct);
                    o.put("message", "Buffering… " + String.format("%.1f", pct) + "%");
                } else if ("ready".equals(state)) {
                    o.put("url", playUrl);
                    o.put("size", videoFileSize);
                } else if ("error".equals(state)) {
                    o.put("message", errorText);
                } else {
                    o.put("message", message);
                }
                return o.toString();
            } catch (Throwable t) {
                return "{\"state\":\"error\",\"message\":\"status error\"}";
            }
        }
    }

    public void stopAll() {
        synchronized (lock) {
            state = "idle";
            playUrl = null;
            try {
                if (handle != null && session != null) session.remove(handle);
            } catch (Throwable ignored) {
            }
            handle = null;
        }
    }

    // ===================== INTERNALS =====================

    private void ensureSession() {
        if (session == null) {
            session = new SessionManager();
            session.start();
        }
    }

    private void ensureServer() throws Exception {
        if (serverSocket != null && !serverSocket.isClosed()) return;
        serverSocket = new ServerSocket(0, 8, java.net.InetAddress.getByName("127.0.0.1"));
        port = serverSocket.getLocalPort();
        serverThread = new Thread(this::serverLoop, "LunaTorrent-server");
        serverThread.setDaemon(true);
        serverThread.start();
    }

    private void serverLoop() {
        while (serverSocket != null && !serverSocket.isClosed()) {
            try {
                Socket s = serverSocket.accept();
                new Thread(() -> handleConnection(s), "LunaTorrent-conn").start();
            } catch (Throwable t) {
                return; // socket closed
            }
        }
    }

    private void handleConnection(Socket socket) {
        try {
            socket.setSoTimeout(70_000);
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();

            String requestLine = readLine(in);
            if (requestLine == null || !requestLine.startsWith("GET")) {
                socket.close();
                return;
            }
            String rangeHeader = null;
            String line;
            while ((line = readLine(in)) != null && !line.isEmpty()) {
                if (line.toLowerCase().startsWith("range:")) {
                    rangeHeader = line.substring(6).trim();
                }
            }

            long total = videoFileSize;
            long start = 0, end = total - 1;
            boolean partial = false;
            if (rangeHeader != null) {
                Matcher m = RANGE_RE.matcher(rangeHeader);
                if (m.find()) {
                    start = Long.parseLong(m.group(1));
                    if (m.group(2) != null && !m.group(2).isEmpty()) {
                        end = Math.min(Long.parseLong(m.group(2)), total - 1);
                    } else {
                        // open-ended range: cap the served window so we don't
                        // wait for the whole file before answering
                        end = Math.min(start + 8L * 1024 * 1024, total - 1);
                    }
                    partial = true;
                }
            }
            if (start >= total) {
                out.write(("HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */" + total + "\r\nConnection: close\r\n\r\n").getBytes());
                out.flush();
                socket.close();
                return;
            }

            // wait until the requested byte range is on disk (sequential download)
            if (!waitForBytes(end + 1)) {
                out.write(("HTTP/1.1 504 Timeout\r\nConnection: close\r\n\r\n").getBytes());
                out.flush();
                socket.close();
                return;
            }

            String ext = videoFile.getName().toLowerCase();
            String type = "application/octet-stream";
            if (ext.endsWith(".mp4") || ext.endsWith(".m4v")) type = "video/mp4";
            else if (ext.endsWith(".webm")) type = "video/webm";
            else if (ext.endsWith(".mkv")) type = "video/x-matroska";
            else if (ext.endsWith(".avi")) type = "video/x-msvideo";
            else if (ext.endsWith(".mov")) type = "video/quicktime";

            long length = end - start + 1;
            StringBuilder head = new StringBuilder();
            head.append(partial ? "HTTP/1.1 206 Partial Content\r\n" : "HTTP/1.1 200 OK\r\n");
            head.append("Content-Type: ").append(type).append("\r\n");
            head.append("Content-Length: ").append(length).append("\r\n");
            head.append("Accept-Ranges: bytes\r\n");
            head.append("Connection: close\r\n");
            if (partial) head.append("Content-Range: bytes ").append(start).append("-").append(end).append("/").append(total).append("\r\n");
            head.append("\r\n");
            out.write(head.toString().getBytes());
            out.flush();

            if ("HEAD".equals(requestLine.split(" ")[0])) {
                socket.close();
                return;
            }

            RandomAccessFile raf = new RandomAccessFile(videoFile, "r");
            try {
                raf.seek(start);
                byte[] buf = new byte[64 * 1024];
                long remaining = length;
                while (remaining > 0) {
                    int n = raf.read(buf, 0, (int) Math.min(buf.length, remaining));
                    if (n < 0) break;
                    out.write(buf, 0, n);
                    remaining -= n;
                }
                out.flush();
            } finally {
                try { raf.close(); } catch (Throwable ignored) {
                }
                socket.close();
            }
        } catch (Throwable t) {
            try { socket.close(); } catch (Throwable ignored) {
            }
        }
    }

    private static String readLine(InputStream in) throws java.io.IOException {
        StringBuilder sb = new StringBuilder();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') break;
            if (c != '\r') sb.append((char) c);
        }
        return (c == -1 && sb.length() == 0) ? null : sb.toString();
    }

    /** Blocks until at least byteCount bytes of the video file are on disk. */
    private boolean waitForBytes(long byteCount) {
        long deadline = System.currentTimeMillis() + MAX_WAIT_FOR_BYTES_MS;
        boolean boosted = false;
        while (System.currentTimeMillis() < deadline) {
            try {
                long[] fp = handle.fileProgress();
                if (videoFileIndex < fp.length && fp[videoFileIndex] >= byteCount) return true;
                // boost the requested range's pieces so seeks resolve faster
                if (!boosted && info != null) {
                    try {
                        int pieceLen = info.pieceLength();
                        long offset = info.files().fileOffset(videoFileIndex);
                        int first = (int) ((offset) / pieceLen);
                        int last = (int) ((offset + Math.min(byteCount + 16L * 1024 * 1024, videoFileSize - 1)) / pieceLen);
                        for (int p = first; p <= last && p < info.numPieces(); p++) {
                            handle.piecePriority(p, Priority.SEVEN);
                        }
                    } catch (Throwable ignored) {
                    }
                    boosted = true;
                }
            } catch (Throwable t) {
                return false;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                return false;
            }
        }
        return false;
    }
}
