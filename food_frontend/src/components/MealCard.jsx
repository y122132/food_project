// food_frontend/src/components/MealCard.jsx
import React from 'react';

export default function MealCard({ title, meal, onManageClick }) {
  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    background: "#ffffff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };

  const mealExists = meal && meal.items && meal.items.length > 0;
  const foodNames = mealExists ? meal.items.map(item => item.food_name).join(', ') : '기록된 음식이 없습니다.';

  return (
    <div style={cardStyle}>
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h3>
        <p style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', margin: 0 }}>
          {mealExists ? `${meal.total_kcal.toFixed(0)} kcal` : '0 kcal'}
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: '1.5em' }}>
          {foodNames}
        </p>
      </div>
      <div style={{ marginTop: 16 }}>
        <button 
          onClick={() => onManageClick(title, meal)}
          style={{
            padding: '8px 12px',
            borderRadius: 999,
            border: '1px solid #d1d5db',
            background: '#ffffff',
            cursor: 'pointer',
            width: '100%',
            fontWeight: 600,
          }}
        >
          {mealExists ? '식사 관리' : '+ 식사 기록하기'}
        </button>
      </div>
    </div>
  );
}
