// food_frontend/src/components/Step2Select.jsx
export default function Step2Select({
  cardStyle,
  predClass,
  foodOptions,
  selectedFood, // REFACTORED
  setSelectedFood, // REFACTORED
  weight,
  setWeight,
  setStep,
  handleCalcAndAdd,
  loading,
  editingItemId,
  mealItems,
  detectedList = [], // NEW: Default to empty array
  currentFoodIndex = 0, // NEW
  handleSkip, // NEW
}) {
  
  // Determine button label based on state
  let buttonLabel = "한 끼에 추가 & 결과 보기";
  if (loading) {
    buttonLabel = "계산 중...";
  } else if (editingItemId !== null) {
    buttonLabel = "수정 완료 & 결과 보기";
  } else if (detectedList.length > 1 && currentFoodIndex < detectedList.length - 1) {
    buttonLabel = "현재 음식 추가 & 다음 음식으로";
  }

  return (
    <section style={cardStyle}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>
        2) 세부 식품 선택 & 섭취 중량 설정
      </h2>

      {/* Progress Indicator for Multi-Detection */}
      {detectedList.length > 1 && editingItemId === null && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#e0f2fe", borderRadius: 8, color: "#0369a1", fontWeight: 600, fontSize: 14 }}>
          탐지된 음식 {currentFoodIndex + 1} / {detectedList.length}
        </div>
      )}

      <p style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
        모델이 예측한 대표식품명:{" "}
        <strong style={{ color: "#111827" }}>{predClass || "-"}</strong>
      </p>

      {/* 세부 식품 리스트 (라디오 버튼) */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
          세부 식품 선택
        </p>
        {foodOptions.length === 0 && (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            이 대표식품명에 매핑된 세부 식품이 없습니다.
          </p>
        )}
        <div
          style={{
            maxHeight: 260,
            overflowY: "auto",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: 8,
            background: "#f9fafb",
          }}
        >
          {foodOptions.map((opt, idx) => {
            const name = opt.representative_name || opt.food_name; // Use representative_name
            const sub = opt.food_class;
            const checked = selectedFood?.id === opt.id; // REFACTORED

            return (
              <label
                key={opt.id || idx} // Use stable id
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 8px",
                  borderRadius: 10,
                  cursor: "pointer",
                  background: checked ? "#dbeafe" : "transparent",
                  marginBottom: 4,
                }}
              >
                <input
                  type="radio"
                  name="foodOption"
                  value={opt.id} // REFACTORED
                  checked={checked}
                  onChange={() => setSelectedFood(opt)} // REFACTORED
                  style={{ marginRight: 8 }}
                />
                <div>
                  <div style={{ fontSize: 14, color: "#111827" }}>
                    {name}
                  </div>
                  {sub && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: 2,
                      }}
                    >
                      분류: {sub}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 섭취 중량 슬라이더 */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
          섭취 중량 (g)
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="range"
            min={10}
            max={1000}
            step={10}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{ flex: 1 }}
          />
          <div
            style={{
              minWidth: 80,
              textAlign: "right",
              fontSize: 14,
              color: "#111827",
            }}
          >
            <strong>{weight}</strong> g
          </div>
        </div>
        <p style={{ marginTop: 4, fontSize: 12, color: "#9ca3af" }}>
          10g ~ 1000g 범위에서 조절할 수 있습니다.
        </p>
      </div>

      {/* 버튼들 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <button
          onClick={() => setStep(1)}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← 사진 다시 선택
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Skip Button */}
          {detectedList.length > 1 && editingItemId === null && (
            <button
              onClick={handleSkip}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                background: "#f3f4f6",
                color: "#4b5563",
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              이 음식 건너뛰기
            </button>
          )}

          <button
            onClick={handleCalcAndAdd}
            disabled={loading || !selectedFood} // REFACTORED
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background:
                loading || !selectedFood ? "#9ca3af" : "#16a34a", // REFACTORED
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 14,
              cursor:
                loading || !selectedFood ? "default" : "pointer", // REFACTORED
            }}
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      {/* 현재 한 끼 요약 */}
      <div style={{ marginTop: 16 }}>
        <p
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 4,
          }}
        >
          현재 한 끼에 추가된 음식:
        </p>
        {mealItems.length === 0 ? (
          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            아직 추가된 음식이 없습니다.
          </p>
        ) : (
          <ul
            style={{
              fontSize: 12,
              color: "#4b5563",
              paddingLeft: 18,
              margin: 0,
            }}
          >
            {mealItems.map((item) => (
              <li key={item.id}>
                {item.food.representative_name} ({item.weight_g} g) {/* REFACTORED */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
