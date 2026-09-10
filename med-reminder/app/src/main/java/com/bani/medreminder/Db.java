package com.bani.medreminder;
import android.content.*; import android.database.Cursor; import android.database.sqlite.*; import java.util.*;
public class Db extends SQLiteOpenHelper {
 public Db(Context c){ super(c,"meds.db",null,2); }
 @Override public void onCreate(SQLiteDatabase db){ db.execSQL("CREATE TABLE meds(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,dose TEXT,hour INTEGER,minute INTEGER,stock INTEGER,last_taken TEXT DEFAULT '',image_uri TEXT DEFAULT '')"); }
 @Override public void onUpgrade(SQLiteDatabase db,int oldV,int newV){ if(oldV<2) db.execSQL("ALTER TABLE meds ADD COLUMN image_uri TEXT DEFAULT ''"); }
 public long add(String name,String dose,int hour,int minute,int stock,String imageUri){ ContentValues v=new ContentValues(); v.put("name",name);v.put("dose",dose);v.put("hour",hour);v.put("minute",minute);v.put("stock",stock);v.put("image_uri",imageUri==null?"":imageUri);return getWritableDatabase().insert("meds",null,v); }
 private Med from(Cursor c){ Med m=new Med();m.id=c.getLong(c.getColumnIndexOrThrow("id"));m.name=c.getString(c.getColumnIndexOrThrow("name"));m.dose=c.getString(c.getColumnIndexOrThrow("dose"));m.hour=c.getInt(c.getColumnIndexOrThrow("hour"));m.minute=c.getInt(c.getColumnIndexOrThrow("minute"));m.stock=c.getInt(c.getColumnIndexOrThrow("stock"));m.lastTakenDate=c.getString(c.getColumnIndexOrThrow("last_taken"));m.imageUri=c.getString(c.getColumnIndexOrThrow("image_uri"));return m; }
 public List<Med> all(){ List<Med> out=new ArrayList<>(); try(Cursor c=getReadableDatabase().rawQuery("SELECT * FROM meds ORDER BY hour,minute",null)){ while(c.moveToNext()) out.add(from(c)); } return out; }
 public Med get(long id){ try(Cursor c=getReadableDatabase().rawQuery("SELECT * FROM meds WHERE id=?",new String[]{String.valueOf(id)})){ if(c.moveToFirst()) return from(c); } return null; }
 public void markTaken(long id,String date){ Med m=get(id);if(m==null)return;ContentValues v=new ContentValues();v.put("last_taken",date);v.put("stock",Math.max(0,m.stock-1));getWritableDatabase().update("meds",v,"id=?",new String[]{String.valueOf(id)}); }
 public void delete(long id){ getWritableDatabase().delete("meds","id=?",new String[]{String.valueOf(id)}); }
}
