package com.lunastream.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);

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
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    // A link/ad inside an embedded player tries to leave the
                    // app -> open it in the system browser instead of
                    // hijacking the app window.
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, url));
                    } catch (Exception ignored) {
                        // no browser available - just block the navigation
                    }
                    return true;
                }
                // Block non-web schemes (intent://, market://, javascript: ...)
                // - almost always ad redirections. The app itself only ever
                // uses https:// + the virtual host.
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

        webView.setWebChromeClient(new WebChromeClient());

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
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
