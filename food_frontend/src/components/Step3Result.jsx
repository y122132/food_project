// food_frontend/src/components/Step3Result.jsx
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell } from 'recharts';

const COLORS = {
  '탄수화물(g)': '#60a5fa',
  '단백질(g)': '#34d399',
  '지방(g)': '#f97316',
};

export default function Step3Result({
  cardStyle,
  result,
  mealItems,
  startEditItem,
  removeMealItem,
  totalNutrition,
  macroPieData,
  handleSaveMeal,
  saving,
  goToNewImageForAnotherFood,
}) {
  return (
    <section style={cardStyle}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>
        3) 한 끼 총합
      </h2>

      {result && (
        <p style={{ marginBottom: 12, fontSize: 14, color: "#4b5563" }}>
          마지막으로 추가/수정한 음식: <strong>{result.representative_name}</strong> ({result.input_g} g)
        </p>
      )}

      {/* 한 끼 음식 목록 */}
      <div style={{ marginTop: 12, marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: '0 0 8px 0' }}>
          현재 '{'mealType'}'에 담긴 음식 ({mealItems.length}개)
        </p>
        
        {mealItems.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>아직 추가된 음식이 없습니다.</p>
        ) : (
          <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", background: "#f9fafb" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f3f4f6", color: "#4b5563" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>음식명</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>중량(g)</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>칼로리(kcal)</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>수정/삭제</th>
                </tr>
              </thead>
              <tbody>
                {mealItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{item.food.representative_name}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>{item.weight_g}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>
                      {item.nutrition["energy_kcal"]?.toFixed(1) ?? "-"}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>
                      <button onClick={() => startEditItem(item)} style={{ padding: "4px 8px", borderRadius: 999, border: 'none', background: "#dbeafe", color: "#1d4ed8", fontSize: 12, cursor: 'pointer', marginRight: 4 }}>수정</button>
                      <button onClick={() => removeMealItem(item.id)} style={{ padding: "4px 8px", borderRadius: 999, border: 'none', background: "#fee2e2", color: "#b91c1c", fontSize: 12, cursor: 'pointer' }}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 한 끼 총합 + 그래프 */}
      {totalNutrition && (
        <div style={{ marginBottom: 16 }}>
           <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
            한 끼 총합 영양
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div style={{ flex: '1 1 200px' }}>
                <p style={{margin: '0 0 4px 0'}}><strong>총 칼로리</strong></p>
                <p style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', margin: 0 }}>
                    {totalNutrition['energy_kcal']?.toFixed(0) ?? 0} kcal
                </p>
            </div>
            {/* Macronutrient Chart and Details */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {macroPieData.length > 0 ? (
                    <>
                        <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                                <Pie
                                    data={macroPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={50}
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
      )}

      {/* 버튼 영역 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}> {/* Group left buttons */}
          <button onClick={goToNewImageForAnotherFood} style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #d1d5db", background: "#ffffff", fontSize: 13, cursor: "pointer" }}>
            + 다른 음식 추가하기
          </button>
        </div>
        <button onClick={handleSaveMeal} disabled={saving} style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: saving ? "#9ca3af" : "#16a34a", color: "#ffffff", fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer" }}>
          {saving ? "저장 중..." : "이 식단 전체 저장하기"}
        </button>
      </div>
    </section>
  );
}