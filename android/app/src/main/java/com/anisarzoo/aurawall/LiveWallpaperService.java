package com.anisarzoo.aurawall;

import android.service.wallpaper.WallpaperService;
import android.view.MotionEvent;
import android.view.SurfaceHolder;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Canvas;
import android.os.Handler;
import android.os.Looper;

public class LiveWallpaperService extends WallpaperService {

    @Override
    public Engine onCreateEngine() {
        return new WebviewEngine();
    }

    private class WebviewEngine extends Engine {
        private WebView webView;
        private final Handler handler = new Handler(Looper.getMainLooper());
        private boolean visible = false;

        private final Runnable drawRunnable = new Runnable() {
            @Override
            public void run() {
                draw();
            }
        };

        @Override
        public void onCreate(SurfaceHolder surfaceHolder) {
            super.onCreate(surfaceHolder);
            handler.post(() -> {
                webView = new WebView(LiveWallpaperService.this);
                webView.getSettings().setJavaScriptEnabled(true);
                webView.getSettings().setDomStorageEnabled(true);
                webView.setWebViewClient(new WebViewClient());
                // Load the local Capacitor web assets
                webView.loadUrl("file:///android_asset/public/index.html");
            });
        }

        @Override
        public void onVisibilityChanged(boolean visible) {
            this.visible = visible;
            if (visible) {
                handler.post(drawRunnable);
            } else {
                handler.removeCallbacks(drawRunnable);
            }
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            super.onSurfaceDestroyed(holder);
            this.visible = false;
            handler.removeCallbacks(drawRunnable);
        }

        @Override
        public void onTouchEvent(MotionEvent event) {
            super.onTouchEvent(event);
            if (webView != null) {
                webView.dispatchTouchEvent(event);
            }
        }

        private void draw() {
            SurfaceHolder holder = getSurfaceHolder();
            Canvas canvas = null;
            try {
                canvas = holder.lockCanvas();
                if (canvas != null && webView != null) {
                    webView.draw(canvas);
                }
            } finally {
                if (canvas != null) {
                    holder.unlockCanvasAndPost(canvas);
                }
            }

            if (visible) {
                handler.postDelayed(drawRunnable, 16); // ~60fps
            }
        }
    }
}
