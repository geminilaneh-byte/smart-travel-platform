package com.bani.medreminder;
import android.content.*; import android.database.Cursor; import android.database.sqlite.*; import java.util.*;
public class Db extends SQLiteOpenHelper {
 public Db(Context c){ super(c,"meds.db",null,3); }
 @Override public void onCreate(SQLiteDatabase db){
  db.execSQL("CREATE TABLE meds(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,dose TEXT,hour INTEGER,minute INTEGER,stock INTEGER,last_taken TEXT DEFAULT '',image_uri TEXT DEFAULT '',meal_relation TEXT DEFAULT '',prescriber TEXT DEFAULT '',indication TEXT DEFAULT '',units_per_dose REAL DEFAULT 1,refill_lead_days INTEGER DEFAULT 5)");
  db.execSQL("CREATE TABLE profile(id INTEGER PRIMARY KEY CHECK(id=1),display_name TEXT DEFAULT '',birth_year INTEGER DEFAULT 0,sex TEXT DEFAULT '',pregnant INTEGER DEFAULT 0,breastfeeding INTEGER DEFAULT 0,allergies TEXT DEFAULT '',conditions TEXT DEFAULT '',large_text INTEGER DEFAULT 0,spoken_guidance INTEGER DEFAULT 0,strong_alerts INTEGER DEFAULT 0)");
 }
 @Override public void onUpgrade(SQLiteDatabase db,int oldV,int newV){
  if(oldV<2) db.execSQL("ALTER TABLE meds ADD COLUMN image_uri TEXT DEFAULT ''");
  if(oldV<3){
   db.execSQL("ALTER TABLE meds ADD COLUMN meal_relation TEXT DEFAULT ''");
   db.execSQL("ALTER TABLE meds ADD COLUMN prescriber TEXT DEFAULT ''");
   db.execSQL("ALTER TABLE meds ADD COLUMN indication TEXT DEFAULT ''");
   db.execSQL("ALTER TABLE meds ADD COLUMN units_per_dose REAL DEFAULT 1");
   db.execSQL("ALTER TABLE meds ADD COLUMN refill_lead_days INTEGER DEFAULT 5");
   db.execSQL("CREATE TABLE IF NOT EXISTS profile(id INTEGER PRIMARY KEY CHECK(id=1),display_name TEXT DEFAULT '',birth_year INTEGER DEFAULT 0,sex TEXT DEFAULT '',pregnant INTEGER DEFAULT 0,breastfeeding INTEGER DEFAULT 0,allergies TEXT DEFAULT '',conditions TEXT DEFAULT '',large_text INTEGER DEFAULT 0,spoken_guidance INTEGER DEFAULT 0,strong_alerts INTEGER DEFAULT 0)");
  }
 }
 public long add(String name,String dose,int hour,int minute,int stock,String imageUri){return add(name,dose,hour,minute,stock,imageUri,"","","",1.0,5);}
 public long add(String name,String dose,int hour,int minute,int stock,String imageUri,String mealRelation,String prescriber,String indication,double unitsPerDose,int refillLeadDays){ ContentValues v=new ContentValues(); v.put("name",name);v.put("dose",dose);v.put("hour",hour);v.put("minute",minute);v.put("stock",stock);v.put("image_uri",imageUri==null?"":imageUri);v.put("meal_relation",mealRelation);v.put("prescriber",prescriber);v.put("indication",indication);v.put("units_per_dose",unitsPerDose<=0?1.0:unitsPerDose);v.put("refill_lead_days",Math.max(0,refillLeadDays));return getWritableDatabase().insert("meds",null,v); }
 private Med from(Cursor c){ Med m=new Med();m.id=c.getLong(c.getColumnIndexOrThrow("id"));m.name=c.getString(c.getColumnIndexOrThrow("name"));m.dose=c.getString(c.getColumnIndexOrThrow("dose"));m.hour=c.getInt(c.getColumnIndexOrThrow("hour"));m.minute=c.getInt(c.getColumnIndexOrThrow("minute"));m.stock=c.getInt(c.getColumnIndexOrThrow("stock"));m.lastTakenDate=c.getString(c.getColumnIndexOrThrow("last_taken"));m.imageUri=c.getString(c.getColumnIndexOrThrow("image_uri"));m.mealRelation=c.getString(c.getColumnIndexOrThrow("meal_relation"));m.prescriber=c.getString(c.getColumnIndexOrThrow("prescriber"));m.indication=c.getString(c.getColumnIndexOrThrow("indication"));m.unitsPerDose=c.getDouble(c.getColumnIndexOrThrow("units_per_dose"));m.refillLeadDays=c.getInt(c.getColumnIndexOrThrow("refill_lead_days"));return m; }
 public List<Med> all(){ List<Med> out=new ArrayList<>(); try(Cursor c=getReadableDatabase().rawQuery("SELECT * FROM meds ORDER BY hour,minute",null)){ while(c.moveToNext()) out.add(from(c)); } return out; }
 public Med get(long id){ try(Cursor c=getReadableDatabase().rawQuery("SELECT * FROM meds WHERE id=?",new String[]{String.valueOf(id)})){ if(c.moveToFirst()) return from(c); } return null; }
 public void markTaken(long id,String date){ Med m=get(id);if(m==null)return;ContentValues v=new ContentValues();v.put("last_taken",date);v.put("stock",Math.max(0,(int)Math.floor(m.stock-Math.max(1.0,m.unitsPerDose))));getWritableDatabase().update("meds",v,"id=?",new String[]{String.valueOf(id)}); }
 public void delete(long id){ getWritableDatabase().delete("meds","id=?",new String[]{String.valueOf(id)}); }
 public Profile getProfile(){ Profile p=new Profile();try(Cursor c=getReadableDatabase().rawQuery("SELECT * FROM profile WHERE id=1",null)){if(c.moveToFirst()){p.id=1;p.displayName=c.getString(c.getColumnIndexOrThrow("display_name"));p.birthYear=c.getInt(c.getColumnIndexOrThrow("birth_year"));p.sex=c.getString(c.getColumnIndexOrThrow("sex"));p.pregnant=c.getInt(c.getColumnIndexOrThrow("pregnant"))==1;p.breastfeeding=c.getInt(c.getColumnIndexOrThrow("breastfeeding"))==1;p.allergies=c.getString(c.getColumnIndexOrThrow("allergies"));p.conditions=c.getString(c.getColumnIndexOrThrow("conditions"));p.largeText=c.getInt(c.getColumnIndexOrThrow("large_text"))==1;p.spokenGuidance=c.getInt(c.getColumnIndexOrThrow("spoken_guidance"))==1;p.strongAlerts=c.getInt(c.getColumnIndexOrThrow("strong_alerts"))==1;}}return p;}
 public void saveProfile(Profile p){ContentValues v=new ContentValues();v.put("id",1);v.put("display_name",p.displayName);v.put("birth_year",p.birthYear);v.put("sex",p.sex);v.put("pregnant",p.pregnant?1:0);v.put("breastfeeding",p.breastfeeding?1:0);v.put("allergies",p.allergies);v.put("conditions",p.conditions);v.put("large_text",p.largeText?1:0);v.put("spoken_guidance",p.spokenGuidance?1:0);v.put("strong_alerts",p.strongAlerts?1:0);getWritableDatabase().insertWithOnConflict("profile",null,v,SQLiteDatabase.CONFLICT_REPLACE);}
}
