// food_frontend/src/components/Step3Result.jsx
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Legend,
} from "recharts";

export default function Step3Result({
  cardStyle,
  result,
  mealItems,
  startEditItem,
  removeMealItem,
  totalNutrition,
  recommendedKcal,
  kcalPercent,
  macroPieData,
  saveMessage,
  handleSaveMeal,
  saving,
  currentUser,
  goToNewImageForAnotherFood,
  resetAll,
}) {
  return (
    <section style={cardStyle}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>
        3) 결과 보기 / 한 끼 총합
      </h2>

      {/* 마지막 결과 요약 */}
      {result && (
        <>
          <p
            style={{ marginBottom: 6, fontSize: 14, color: "#4b5563" }}
          >
            마지막으로 추가한 음식:{" "}
            <strong style={{ color: "#111827" }}>
              {result.food_name}
            </strong>{" "}
            ({result.input_g} g, 대표식품: {result.pred_class})
          </p>
        </>
      )}

      {/* 한 끼 음식 목록 */}
      <div style={{ marginTop: 12, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#111827",
              margin: 0,
            }}
          >
            한 끼에 담긴 음식 ({mealItems.length}개)
          </p>
        </div>

        {mealItems.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            아직 추가된 음식이 없습니다. 1단계에서 사진을 업로드하고 추가해 주세요.
          </p>
        ) : (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              background: "#f9fafb",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f3f4f6",
                    color: "#4b5563",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    음식명
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    중량(g)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    칼로리(kcal)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    탄수화물(g)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    단백질(g)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    지방(g)
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "6px 8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    수정 / 삭제
                  </th>
                </tr>
              </thead>
              <tbody>
                {mealItems.map((item) => (
                  <tr key={item.id}>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {item.food_name}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "right",
                      }}
                    >
                      {item.weight_g}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "right",
                      }}
                    >
                      {item.nutrition["에너지(kcal)"] != null
                        ? item.nutrition["에너지(kcal)"].toFixed(1)
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "right",
                      }}
                    >
                      {item.nutrition["탄수화물(g)"] != null
                        ? item.nutrition["탄수화물(g)"].toFixed(1)
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "right",
                      }}
                    >
                      {item.nutrition["단백질(g)"] != null
                        ? item.nutrition["단백질(g)"].toFixed(1)
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "right",
                      }}
                    >
                      {item.nutrition["지방(g)"] != null
                        ? item.nutrition["지방(g)"].toFixed(1)
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "center",
                      }}
                    >
                      <button
                        onClick={() => startEditItem(item)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "none",
                          background: "#dbeafe",
                          color: "#1d4ed8",
                          fontSize: 12,
                          cursor: "pointer",
                          marginRight: 4,
                        }}
                      >
                        수정
                      </button>
                      <button
                        onClick={() => removeMealItem(item.id)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "none",
                          background: "#fee2e2",
                          color: "#b91c1c",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        삭제
                      </button>
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
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 6,
            }}
          >
            한 끼 총합 (칼로리 / 탄수화물 / 단백질 / 지방)
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            칼로리는 하루 권장 섭취량 대비 바 차트로, 탄/단/지는 비율을
            원형 그래프로 확인할 수 있습니다.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            {/* 칼로리 바 진행바 */}
            <div
              style={{
                flex: "1 1 260px",
                minWidth: 260,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: 12,
                background: "#ffffff",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                  margin: "0 0 4px",
                }}
              >
                칼로리 (섭취 / 권장)
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  margin: "0 0 8px",
                }}
              >
                총 섭취 칼로리:{" "}
                <strong>
                  {totalNutrition["에너지(kcal)"]?.toFixed(1) ?? 0}
                </strong>{" "}
                kcal / 권장: <strong>{recommendedKcal}</strong> kcal (
                {Math.min(kcalPercent, 999)}%)
              </p>

              {/* 진행 바 바깥 트랙 */}
              <div
                style={{
                  width: "100%",
                  height: 20,
                  borderRadius: 999,
                  background: "#e5e7eb",
                  overflow: "hidden",
                }}
              >
                {/* 안쪽 채워지는 바 */}
                <div
                  style={{
                    width: `${Math.min(kcalPercent, 100)}%`, // 100% 이상이면 꽉 차게
                    height: "100%",
                    background: kcalPercent <= 100 ? "#22c55e" : "#ef4444", // 100% 넘으면 빨간색
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <p
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                * 100% 이상이면 권장 칼로리를 초과한 상태입니다.
              </p>
            </div>

            {/* 탄/단/지 원형 차트 */}
            <div
              style={{
                flex: "1 1 260px",
                minWidth: 260,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: 12,
                background: "#ffffff",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                  margin: "0 0 4px",
                }}
              >
                탄수화물 / 단백질 / 지방 비율
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  margin: "0 0 6px",
                }}
              >
                한 끼 전체 기준 비율입니다. (g 기준)
              </p>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie
                      data={macroPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      // 데이터 각각에 지정한 fill을 사용
                      label
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 버튼 영역 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
          gap: 8,
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {saveMessage}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSaveMeal}
            disabled={saving || mealItems.length === 0 || !currentUser}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              background:
                saving || mealItems.length === 0 || !currentUser
                  ? "#9ca3af"
                  : "#22c55e",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor:
                saving || mealItems.length === 0 || !currentUser
                  ? "default"
                  : "pointer",
            }}
          >
            {saving ? "저장 중..." : "이 식사 저장하기"}
          </button>

          <button
            onClick={goToNewImageForAnotherFood}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            다른 음식 사진으로 추가하기
          </button>

          <button
            onClick={resetAll}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            새로운 식사 시작하기 →
          </button>
        </div>
      </div>
    </section>
  );
}
