package com.bani.medreminder;
import android.content.*;
public class AlarmReceiver extends BroadcastReceiver { @Override public void onReceive(Context context,Intent intent){ long medId=intent.getLongExtra("medId",-1);if(medId<0)return;Intent svc=new Intent(context,AlarmService.class).putExtra("medId",medId);context.startForegroundService(svc);Med m=new Db(context).get(medId);if(m!=null)AlarmScheduler.schedule(context,m); } }
