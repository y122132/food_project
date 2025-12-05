// food_frontend/src/components/DailySummary.jsx
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell } from 'recharts';

const COLORS = {
  '탄수화물(g)': '#60a5fa', // blue-400
  '단백질(g)': '#34d399',   // green-400
  '지방(g)': '#f97316',     // orange-500
};

export default function DailySummary({ meals, recommendedKcal = 2000 }) {
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
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">하루 영양 요약</h3>
      <div className="flex flex-col md:flex-row gap-8 items-center">

        {/* Calorie Progress */}
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm text-gray-500 font-medium">총 섭취 칼로리</span>
            <span className="text-sm font-medium text-blue-600">
              <strong className="text-2xl text-gray-900 mr-1">{totalKcal.toFixed(0)}</strong>
              / {recommendedKcal} kcal
            </span>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${kcalPercent > 100 ? 'bg-red-500' : 'bg-blue-500'
                }`}
              style={{ width: `${Math.min(kcalPercent, 100)}%` }}
            />
          </div>
          <p className="text-right text-xs text-gray-400 mt-1">
            권장량의 {kcalPercent}% 섭취
          </p>
        </div>

        {/* Macronutrient Chart and Details */}
        <div className="flex-1 w-full flex flex-col items-center">
          {macroPieData.length > 0 ? (
            <div className="flex items-center gap-6 w-full justify-center">
              <div className="w-32 h-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={5}
                    >
                      {macroPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value, name) => {
                        const totalVal = macroPieData.reduce((acc, cur) => acc + cur.value, 0);
                        const percent = totalVal > 0 ? ((value / totalVal) * 100).toFixed(0) : 0;
                        return [`${percent}%`, name.split('(')[0]];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                {macroPieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[entry.name] }}></div>
                    <span className="text-gray-600 font-medium w-16">{entry.name.split('(')[0]}</span>
                    <span className="text-gray-900 font-bold">{entry.value.toFixed(1)}g</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-8">기록된 영양 정보가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}