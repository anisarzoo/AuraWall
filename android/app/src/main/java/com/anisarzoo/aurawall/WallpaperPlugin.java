package com.anisarzoo.aurawall;

import android.app.WallpaperManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "Wallpaper")
public class WallpaperPlugin extends Plugin {

    @PluginMethod
    public void setWallpaper(PluginCall call) {
        String base64 = call.getString("base64");
        String urlString = call.getString("url");

        if (base64 != null) {
            setWallpaperFromBase64(base64, call);
        } else if (urlString != null) {
            setWallpaperFromUrl(urlString, call);
        } else {
            call.reject("Must provide base64 or url");
        }
    }

    private void setWallpaperFromBase64(String base64, PluginCall call) {
        try {
            byte[] decodedString = Base64.decode(base64, Base64.DEFAULT);
            Bitmap decodedByte = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);
            WallpaperManager wallpaperManager = WallpaperManager.getInstance(getContext());
            wallpaperManager.setBitmap(decodedByte);
            call.resolve();
        } catch (IOException e) {
            call.reject("Failed to set wallpaper", e);
        }
    }

    private void setWallpaperFromUrl(String urlString, PluginCall call) {
        new Thread(() -> {
            try {
                URL url = new URL(urlString);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.connect();
                InputStream input = connection.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(input);
                WallpaperManager wallpaperManager = WallpaperManager.getInstance(getContext());
                wallpaperManager.setBitmap(bitmap);
                call.resolve();
            } catch (IOException e) {
                call.reject("Failed to set wallpaper from URL", e);
            }
        }).start();
    }
}
