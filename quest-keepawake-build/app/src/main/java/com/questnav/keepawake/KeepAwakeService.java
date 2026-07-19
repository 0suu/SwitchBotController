package com.questnav.keepawake;
import android.app.*; import android.content.*; import android.os.*; import android.provider.Settings; import android.util.Log;
public class KeepAwakeService extends Service {
 private static final String TAG="KeepAwakeService", CHANNEL_ID="keepawake_channel"; private static final long INTERVAL_MS=2000;
 private final Handler handler=new Handler(Looper.getMainLooper()); private boolean running; private PowerManager.WakeLock wakeLock;
 private final Runnable keepAwakeRunnable=new Runnable(){ @Override public void run(){ if(!running)return; sendProxClose(); handler.postDelayed(this,INTERVAL_MS); }};
 @Override public void onCreate(){ super.onCreate(); }
 @Override public int onStartCommand(Intent intent,int flags,int startId){ if(running)return START_STICKY; running=true; createChannel(); startForeground(1,new Notification.Builder(this,CHANNEL_ID).setContentTitle("Quest KeepAwake").setContentText("Always-on keep-awake is active").setSmallIcon(android.R.drawable.ic_lock_idle_lock).setOngoing(true).build()); PowerManager pm=(PowerManager)getSystemService(POWER_SERVICE); wakeLock=pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"QuestNavKeepAwake::StayAwake"); wakeLock.acquire(); applySettings(); sendProxClose(); handler.postDelayed(keepAwakeRunnable,INTERVAL_MS); Log.i(TAG,"Always-on service started"); return START_STICKY; }
 @Override public void onDestroy(){ running=false; handler.removeCallbacks(keepAwakeRunnable); if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release(); super.onDestroy(); }
 @Override public IBinder onBind(Intent intent){ return null; }
 private void applySettings(){ ContentResolver cr=getContentResolver(); try{Settings.System.putInt(cr,Settings.System.SCREEN_OFF_TIMEOUT,Integer.MAX_VALUE);}catch(Exception e){Log.w(TAG,"screen timeout",e);} try{Settings.Global.putInt(cr,Settings.Global.STAY_ON_WHILE_PLUGGED_IN,3);}catch(Exception e){Log.w(TAG,"stay on",e);} try{Settings.Secure.putInt(cr,"adaptive_sleep",-1); Settings.Secure.putInt(cr,"sleep_timeout",-1); Settings.Secure.putInt(cr,"wake_gesture_enabled",0);}catch(Exception e){Log.w(TAG,"secure settings",e);} }
 private void sendProxClose(){ try{Intent i=new Intent("com.oculus.vrpowermanager.prox_close"); i.addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES); sendBroadcast(i); Log.d(TAG,"Sent prox_close");}catch(Exception e){Log.w(TAG,"prox_close",e);} }
 private void createChannel(){ NotificationChannel c=new NotificationChannel(CHANNEL_ID,"KeepAwake Service",NotificationManager.IMPORTANCE_LOW); getSystemService(NotificationManager.class).createNotificationChannel(c); }
}
