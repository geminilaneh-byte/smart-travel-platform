package com.bani.medreminder;

public class Med {
    public long id;
    public String name="";
    public String dose="";
    public int hour;
    public int minute;
    public int stock;
    public String lastTakenDate="";
    public String imageUri="";
    public String mealRelation="";
    public String prescriber="";
    public String indication="";
    public double unitsPerDose=1.0;
    public int refillLeadDays=5;

    public int estimatedDosesRemaining(){
        if(unitsPerDose<=0) return stock;
        return (int)Math.floor(stock/unitsPerDose);
    }
}
