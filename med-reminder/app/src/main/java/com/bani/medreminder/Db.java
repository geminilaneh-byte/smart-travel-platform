package com.bani.medreminder;
import android.content.*; import android.database.Cursor; import android.database.sqlite.*; import java.util.*;
public class Db extends SQLiteOpenHelper {
 public Db(Context c){ super(c,"meds.db",null,1); }
 @Override public void onCreate(SQLiteDatabase db){ db.execSQL("CREATE TABLE meds(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,dose TEXT,hour INTEGER,minute INTEGER,stock INTEGER,last_taken TEXT DEFAULT '')"); }
 @Override public void onUpgrade(SQLiteDatabase db,int oldV,int newV){}
 public long add(String name,String dose,int hour,int minute,int stock){ ContentValues v=new ContentValues(); v.put("name",name);v.put("dose",dose);v.put("hour",hour);v.put("minute",minute);v.put("stock",stock);return getWritableDatabase().insert("meds",null,v); }
 public List<Med> all(){ List<Med> out=new ArrayList<>(); try(Cursor c=getReadableDatabase().rawQuery("SELECT * FROM meds ORDER BY hour,minute",null)){ while(c.moveToNext()){ Med m=new Med();m.id=c.getLong(0);m.name=c.getString(1);m.dose=c.getString(2);m.hour=c.getInt(3);m.minute=c.getInt(4);m.stock=c.getInt(5);m.lastTakenDate=c.getString(6);out.add(m);} } return out; }
 public Med get(long id){ try(Cursor c=getReadableDatabase().rawQuery("SELECT * FROM meds WHERE id=?",new String[]{String.valueOf(id)})){ if(c.moveToFirst()){ Med m=new Med();m.id=c.getLong(0);m.name=c.getString(1);m.dose=c.getString(2);m.hour=c.getInt(3);m.minute=c.getInt(4);m.stock=c.getInt(5);m.lastTakenDate=c.getString(6);return m;} } return null; }
 public void markTaken(long id,String date){ Med m=get(id);if(m==null)return;ContentValues v=new ContentValues();v.put("last_taken",date);v.put("stock",Math.max(0,m.stock-1));getWritableDatabase().update("meds",v,"id=?",new String[]{String.valueOf(id)}); }
 public void delete(long id){ getWritableDatabase().delete("meds","id=?",new String[]{String.valueOf(id)}); }
}
