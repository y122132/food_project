// food_frontend/src/components/DailySummary.jsx
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell } from 'recharts';

const COLORS = {
  '탄수화물(g)': '#60a5fa', // blue-400
  '단백질(g)': '#34d399',   // green-400
  '지방(g)': '#f97316',     // orange-500
};

export default function DailySummary({ meals, recommendedKcal = 2000 }) {
  const cardStyle = {
    border: "none", // Removed blue border
    borderRadius: 16,
    padding: 20,
    background: "#ffffff", // Changed background to white
    boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
    marginBottom: '20px', // Added margin-bottom
  };

  const totalNutrition = useMemo(() => {
    if (!meals || meals.length === 0) return null;
    const allItems = meals.flatMap(meal => meal.items);
    if (allItems.length === 0) return null;

    const keys = Object.keys(allItems[0].nutrition || {});
    const total = {};
    for (const key of keys) {
      total[key] = allItems.reduce((sum, item) => {
        const v = item.nutrition[key];
        if (v == null || isNaN(v)) return sum;
        return sum + Number(v);
      }, 0);
    }
    return total;
  }, [meals]);

  const totalKcal = totalNutrition ? totalNutrition['energy_kcal'] || 0 : 0;
  const kcalPercent = useMemo(() => {
    if (!totalKcal || !recommendedKcal) return 0;
    return Math.round((totalKcal / recommendedKcal) * 100);
  }, [totalKcal, recommendedKcal]);

  const macroPieData = useMemo(() => {
    if (!totalNutrition) return [];
    return [
      { name: '탄수화물(g)', value: totalNutrition['carbohydrate_g'] || 0 },
      { name: '단백질(g)', value: totalNutrition['protein_g'] || 0 },
      { name: '지방(g)', value: totalNutrition['fat_g'] || 0 },
    ].filter(item => item.value > 0);
  }, [totalNutrition]);

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, marginBottom: 12, color: '#1e3a8a' }}>하루 총합</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
        
        {/* Calorie Progress */}
        <div style={{ flex: '1 1 300px' }}>
          <p style={{ fontSize: 14, color: '#1e40af', margin: '0 0 8px 0' }}>
            <strong>{totalKcal.toFixed(0)}</strong> / {recommendedKcal} kcal ({kcalPercent}%)
          </p>
          <div style={{ width: '100%', height: 24, borderRadius: 999, background: '#dbeafe', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(kcalPercent, 100)}%`,
                height: "100%",
                background: kcalPercent <= 100 ? "#2563eb" : "#ef4444",
                transition: "width 0.5s ease-in-out",
              }}
            />
          </div>
        </div>

        {/* Macronutrient Chart and Details */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {macroPieData.length > 0 ? (
                <>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie
                                data={macroPieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                                {macroPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [`${value.toFixed(1)}g`, name]} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px', fontSize: 13 }}>
                        {macroPieData.map((entry, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[entry.name], marginRight: 5 }}></div>
                                <span>{entry.name.split('(')[0]}: {entry.value.toFixed(1)}g</span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p style={{textAlign: 'center', color: '#6b7280'}}>기록된 영양 정보가 없습니다.</p>
            )}
        </div>
      </div>
    </div>
  );
}