package com.lunastream.tv;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    
    // Production URL - update this when you deploy
    private static final String APP_URL = "https://lunastream.vercel.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Fullscreen
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        setContentView(webView);

        // Configure WebView for TV
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

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                // If the URL fails, show a helpful page
                if (failingUrl.contains(APP_URL)) {
                    view.loadData(
                        "<html><body style='background:#0b0b1a;color:white;text-align:center;padding:20px;'>" +
                        "<h1>🌙 LunaStream TV</h1>" +
                        "<p>The web app is not yet deployed.</p>" +
                        "<p>Please deploy the web app first:</p>" +
                        "<ol style='text-align:left;max-width:300px;margin:0 auto;'>" +
                        "<li>Visit: <a href='https://vercel.com' style='color:#7c3aed;'>vercel.com</a></li>" +
                        "<li>Sign up / Log in</li>" +
                        "<li>Import your GitHub repository</li>" +
                        "<li>Deploy!</li>" +
                        "</ol>" +
                        "<p style='margin-top:20px;'>Or visit: <a href='https://github.com/Mylittlestories/lunastream' style='color:#7c3aed;'>GitHub Repo</a></p>" +
                        "</body></html>",
                        "text/html",
                        "UTF-8"
                    );
                }
            }
        });
        
        webView.setWebChromeClient(new WebChromeClient());
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);

        // Load the web app with TV-optimized URL parameter
        webView.loadUrl(APP_URL + "?mode=tv");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Handle D-pad navigation
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
