package com.lunastream.app;

import android.app.Activity;
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

    // MIME types for common file extensions
    private static final Map<String, String> MIME_TYPES = new HashMap<>();
    static {
        MIME_TYPES.put("html", "text/html");
        MIME_TYPES.put("htm", "text/html");
        MIME_TYPES.put("js", "application/javascript");
        MIME_TYPES.put("mjs", "application/javascript");
        MIME_TYPES.put("css", "text/css");
        MIME_TYPES.put("json", "application/json");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("webp", "image/webp");
        MIME_TYPES.put("woff", "font/woff");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("ttf", "font/ttf");
        MIME_TYPES.put("txt", "text/plain");
        MIME_TYPES.put("map", "application/json");
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
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setAllowFileAccessFromFileURLs(true);

        // CRITICAL FIX: Intercept ALL requests for /_next/ and serve from APK assets
        // This fixes the hardcoded absolute paths in Next.js JS bundles
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                
                // Intercept Next.js assets, manifest, and any other app resources
                if (path != null && (path.startsWith("/_next/") || path.equals("/manifest.json") || path.startsWith("/favicon"))) {
                    // Remove leading /
                    String assetPath = path.substring(1);
                    try {
                        InputStream is = getAssets().open(assetPath);
                        String mimeType = getMimeType(assetPath);
                        // Return 200 OK with the asset content
                        return new WebResourceResponse(mimeType, "UTF-8", is);
                    } catch (IOException e) {
                        // Asset not found - let the request through
                    }
                }
                
                // For navigation requests to app pages, serve index.html
                String url = request.getUrl().toString();
                if (url.startsWith("file:///") && !url.contains("index.html") && 
                    !url.contains("_next") && !url.contains(".js") && !url.contains(".css")) {
                    try {
                        InputStream is = getAssets().open("index.html");
                        return new WebResourceResponse("text/html", "UTF-8", is);
                    } catch (IOException e) {
                        // Fall through
                    }
                }
                
                return null; // Let other requests through normally
            }
        });
        
        webView.setWebChromeClient(new WebChromeClient());

        // Load from assets - all /_next/ requests will be intercepted and served from APK
        webView.loadUrl("file:///android_asset/index.html");
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
