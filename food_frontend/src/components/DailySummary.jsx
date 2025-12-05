// food_frontend/src/components/DailySummary.jsx
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell } from 'recharts';
import { useState, useEffect } from 'react';

// Character Images
import SadIcon from '../assets/img/슬픔_이모티콘.png';
import BeggingIcon from '../assets/img/주라_이모티콘.png';
import ThumbsUpIcon from '../assets/img/따봉_이모티콘.png';
import TriumphantIcon from '../assets/img/의기양양_이모티콘.png';
import AnnoyedIcon from '../assets/img/짜증_이모티콘.png';


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
        {/* Calorie Progress */}
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm text-gray-500 font-medium">총 섭취 칼로리</span>
            <span className="text-sm font-medium text-blue-600">
              <strong className="text-2xl text-gray-900 mr-1">{totalKcal.toFixed(0)}</strong>
              / {recommendedKcal} kcal
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden relative">
            {/* Optimal Zone Indicator (90% ~ 110%) - Subtle Shading */}
            {/* Scale is 120%, so 90% is at (90/120)*100 = 75%, Width is (20/120)*100 = 16.66% */}
            <div
              className="absolute top-0 bottom-0 bg-green-400/20 z-0"
              style={{
                left: '75%',
                width: '16.666%'
              }}
              title="권장 구간 (90% ~ 110%)"
            />

            {/* Progress Bar */}
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out relative z-10 ${kcalPercent > 110 ? 'bg-red-500' :
                kcalPercent >= 90 ? 'bg-green-500' :
                  'bg-blue-500'
                }`}
              style={{ width: `${Math.min((kcalPercent / 120) * 100, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-1 font-medium">
            <span>0%</span>
            <span className="text-blue-600">
              목표 범위: {(recommendedKcal * 0.9).toFixed(0)} ~ {(recommendedKcal * 1.1).toFixed(0)} kcal
            </span>
            <span>120%</span>
          </div>
        </div>

        {/* Character Section */}
        <CharacterDisplay kcalPercent={kcalPercent} />

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

function CharacterDisplay({ kcalPercent }) {
  // Determine Character State
  let CharacterIcon = SadIcon;
  let message = "배고파요...";
  let colorClass = "text-gray-500";

  if (kcalPercent < 50) {
    CharacterIcon = SadIcon;
    message = "너무 배고파요 ㅠㅠ";
    colorClass = "text-blue-500";
  } else if (kcalPercent < 90) {
    CharacterIcon = BeggingIcon;
    message = "밥 좀 주세요...";
    colorClass = "text-indigo-500";
  } else if (kcalPercent <= 110) {
    CharacterIcon = ThumbsUpIcon;
    message = "완벽해요!";
    colorClass = "text-green-500";
  } else if (kcalPercent <= 120) {
    CharacterIcon = TriumphantIcon;
    message = "배가 빵빵해요!";
    colorClass = "text-orange-500";
  } else {
    CharacterIcon = AnnoyedIcon;
    message = "그만 먹을래요...";
    colorClass = "text-red-500";
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative">
        <img
          src={CharacterIcon}
          alt="Character Status"
          className="w-32 h-32 object-contain"
        />
      </div>

      {/* Speech Bubble */}
      <div className={`text-sm font-bold ${colorClass} bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 shadow-sm`}>
        {`"${message}"`}
      </div>
    </div>
  );
}