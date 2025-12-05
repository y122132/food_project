// food_frontend/src/components/MealCard.jsx
import React from 'react';

export default function MealCard({ title, meal, onManageClick }) {
  const mealExists = meal && meal.items && meal.items.length > 0;
  const foodNames = mealExists ? meal.items.map(item => item.food_name).join(', ') : '기록된 음식이 없습니다.';

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between h-full">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">
          {mealExists ? `${meal.total_kcal.toFixed(0)}` : '0'} <span className="text-lg font-medium text-gray-500">kcal</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2 min-h-[2.5em]">
          {mealExists ? (
            meal.items.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {item.food?.representative_name || '알 수 없는 음식'}
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-400">기록된 음식이 없습니다.</p>
          )}
        </div>
      </div>
      <div className="mt-6">
        <button
          onClick={() => onManageClick(title, meal)}
          className={`
            w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200
            ${mealExists
              ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              : 'bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100'
            }
          `}
        >
          {mealExists ? '식사 관리' : '+ 식사 기록하기'}
        </button>
      </div>
    </div>
  );
}
