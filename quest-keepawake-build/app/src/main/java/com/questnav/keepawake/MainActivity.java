package com.questnav.keepawake;
import android.app.Activity; import android.content.Intent; import android.os.Bundle; import android.widget.TextView;
public class MainActivity extends Activity {
 @Override public void onCreate(Bundle b){ super.onCreate(b); startForegroundService(new Intent(this, KeepAwakeService.class)); TextView v=new TextView(this); v.setText("KeepAwake service is running.\nprox_close is sent every 2 seconds."); v.setTextSize(20); v.setPadding(32,32,32,32); setContentView(v); }
}
