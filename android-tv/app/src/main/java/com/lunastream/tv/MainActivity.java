package com.lunastream.tv;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private WebView webView;

    // The web app is served from this virtual https origin instead of file://.
    // An https origin keeps fetch()/CORS and localStorage working reliably on
    // all WebView versions (file:// needs deprecated flags and breaks fetch()).
    private static final String VIRTUAL_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + VIRTUAL_HOST + "/assets/index.html";

    // MIME types for common file extensions
    private static final Map<String, String> MIME_TYPES = new HashMap<>();
    static {
        MIME_TYPES.put("html", "text/html");
        MIME_TYPES.put("htm", "text/html");
        MIME_TYPES.put("js", "application/javascript");
        MIME_TYPES.put("mjs", "application/javascript");
        MIME_TYPES.put("css", "text/css");
        MIME_TYPES.put("json", "application/json");
        MIME_TYPES.put("txt", "text/plain");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("webp", "image/webp");
        MIME_TYPES.put("ico", "image/x-icon");
        MIME_TYPES.put("woff", "font/woff");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("ttf", "font/ttf");
        MIME_TYPES.put("map", "application/json");
        MIME_TYPES.put("webmanifest", "application/manifest+json");
        MIME_TYPES.put("wasm", "application/wasm");
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        setContentView(webView);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);

        // Present as a DESKTOP browser (keep the real WebView Chrome version,
        // swap only the platform tokens). Embedded stream providers serve
        // their most aggressive redirect/pop-up ad variants to mobile user
        // agents; the desktop variant is the one that plays cleanly.
        String ua = webSettings.getUserAgentString();
        if (ua != null && ua.contains("; Android")) {
            try {
                ua = ua.replaceFirst("\\(.*?\\)", "(X11; Linux x86_64)").replace("Mobile ", "");
                webSettings.setUserAgentString(ua);
            } catch (Exception ignored) {
                // keep the default UA on any regex surprise
            }
        }

        // TV: D-pad navigation inside the web UI is handled by the bundled
        // tv-navigation.js script (spatial focus movement), which is part of
        // the web app itself and works on every WebView version.

        // Serve the embedded static web app from APK assets under an https://
        // virtual host. Every request to that host is mapped to a bundled
        // asset; everything else (stream sources, APIs, embeds) hits the
        // network normally.
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!request.isForMainFrame() || VIRTUAL_HOST.equals(url.getHost())) {
                    return false;
                }
                String scheme = url.getScheme() == null ? "" : url.getScheme();
                boolean webScheme = "http".equals(scheme) || "https".equals(scheme);

                String current = view.getUrl();
                String currentHost = current != null ? Uri.parse(current).getHost() : null;
                boolean fromOurApp = VIRTUAL_HOST.equals(currentHost);

                if (webScheme && fromOurApp) {
                    // A real link tapped in the app UI (add-on pages etc.) ->
                    // open in the system browser, keep the app running
                    // (same behaviour as the desktop app).
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, url));
                    } catch (Exception ignored) {
                        // no browser available - just block the navigation
                    }
                    return true;
                }
                // Navigation pushed from INSIDE an embedded player (frame
                // buster ads), or a non-web scheme (intent://, market://,
                // javascript: ...) -> ad hijack: block it silently.
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!VIRTUAL_HOST.equals(request.getUrl().getHost())) {
                    return null; // external request - let it through
                }

                String path = request.getUrl().getPath();
                if (path == null) path = "/";

                String assetPath = resolveAssetPath(path);
                if (assetPath == null) return null;

                WebResourceResponse res = openAsset(assetPath);
                if (res == null && assetPath.endsWith(".txt")) {
                    // RSC payload for a route without its own export
                    res = openAsset("index.txt");
                }
                if (res == null) {
                    // SPA fallback - serve index.html for unknown routes
                    res = openAsset("index.html");
                }
                return res;
            }
        });

        // Support separate popup windows so that window.open()/target=_blank
        // (used heavily by embedded players' ads) goes through
        // onCreateWindow. Without this, Android's WebView navigates ITSELF to
        // the ad URL without even calling shouldOverrideUrlLoading - the
        // classic full-screen ad takeover.
        webSettings.setSupportMultipleWindows(true);

        // Native torrent streaming engine bridge (jlibtorrent + local HTTP
        // server). window.LunaTorrent.play(magnet, id) + window.LunaTorrent.status(id)
        webView.addJavascriptInterface(new LunaTorrentManager.Bridge(this), "LunaTorrent");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                // Mirror the desktop app (Electron setWindowOpenHandler ->
                // deny): capture the popup into a throwaway WebView and never
                // display or load it. The player underneath keeps playing.
                WebView popup = new WebView(view.getContext());
                popup.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                        return true; // never load popups - they are ads
                    }
                });
                ((WebView.WebViewTransport) resultMsg.obj).setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });

        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();

        webView.loadUrl(START_URL);
    }

    /**
     * Maps a request path to an asset path.
     *  /assets/<path>            -> <path>        (the app itself)
     *  /<path with extension>    -> <path>        (/_next/..., /manifest.json, /watchlist/index.txt ...)
     *  / or /<route>             -> index.html or <route>/index.html   (SPA routes)
     */
    private String resolveAssetPath(String path) {
        if (path.startsWith("/assets/")) {
            return path.substring("/assets/".length());
        }
        if ("/".equals(path) || path.isEmpty()) {
            return "index.html";
        }
        String lastSegment = path.substring(path.lastIndexOf('/') + 1);
        boolean isFile = lastSegment.contains(".");
        if (isFile) {
            return path.substring(1);
        }
        // Directory-style route from the static export (trailingSlash: true)
        String route = path.substring(1);
        while (route.endsWith("/")) {
            route = route.substring(0, route.length() - 1);
        }
        return route.isEmpty() ? "index.html" : route + "/index.html";
    }

    private WebResourceResponse openAsset(String assetPath) {
        try {
            InputStream is = getAssets().open(assetPath);
            String mimeType = getMimeType(assetPath);
            // IMPORTANT: the mimeType field must be the BARE MIME type
            // (e.g. "text/html"). Appending "; charset=utf-8" here made
            // Chromium treat the response as an unknown type and render the
            // HTML source as plain text. Charset goes in the encoding param.
            String encoding = null;
            if (mimeType.startsWith("text/") || mimeType.contains("javascript") || mimeType.contains("json")) {
                encoding = "utf-8";
            }
            return new WebResourceResponse(mimeType, encoding, is);
        } catch (IOException e) {
            return null;
        }
    }

    private String getMimeType(String path) {
        int dot = path.lastIndexOf('.');
        if (dot >= 0) {
            String ext = path.substring(dot + 1).toLowerCase();
            String mime = MIME_TYPES.get(ext);
            if (mime != null) return mime;
        }
        return "application/octet-stream";
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_DPAD_UP ||
            keyCode == KeyEvent.KEYCODE_DPAD_DOWN ||
            keyCode == KeyEvent.KEYCODE_DPAD_LEFT ||
            keyCode == KeyEvent.KEYCODE_DPAD_RIGHT ||
            keyCode == KeyEvent.KEYCODE_DPAD_CENTER) {
            webView.dispatchKeyEvent(event);
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
