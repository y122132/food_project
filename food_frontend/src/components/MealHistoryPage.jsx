import { useEffect, useState } from "react";
import axios from "axios";

export default function MealHistoryPage({ apiBase }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${apiBase}/meals/`, {
          withCredentials: true,
        });
        setMeals(data || []);
      } catch (err) {
        console.error(err);
        setMsg("식사 기록을 불러오지 못했습니다. (로그인 여부 확인)");
      } finally {
        setLoading(false);
      }
    };

    fetchMeals();
  }, [apiBase]);

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        background: "#ffffff",
        boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
      }}
    >
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>📜 지난 식사 기록</h2>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
        내가 저장한 최근 식사 기록을 확인할 수 있습니다. (최근 20개)
      </p>

      {loading && <p>불러오는 중...</p>}
      {msg && <p style={{ fontSize: 13, color: "#b91c1c" }}>{msg}</p>}

      {(!loading && meals.length === 0) && (
        <p style={{ fontSize: 13, color: "#9ca3af" }}>
          아직 저장된 식사 기록이 없습니다.
        </p>
      )}

      {meals.map((meal) => (
        <div
          key={meal.id}
          style={{
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: 12,
            marginBottom: 12,
            background: "#f9fafb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            <div>
              <strong>
                {meal.title || "제목 없음"}
              </strong>{" "}
              <span style={{ color: "#6b7280" }}>
                ({new Date(meal.created_at).toLocaleString()})
              </span>
            </div>
            <div style={{ color: "#111827" }}>
              총 칼로리:{" "}
              <strong>{meal.total_kcal != null ? meal.total_kcal.toFixed(1) : "-"}</strong>{" "}
              kcal
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              background: "#ffffff",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "4px 6px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  음식명
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "4px 6px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  중량(g)
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "4px 6px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  칼로리
                </th>
              </tr>
            </thead>
            <tbody>
              {meal.items.map((item) => (
                <tr key={item.id}>
                  <td
                    style={{
                      padding: "4px 6px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {item.food?.representative_name || '알 수 없는 음식'}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      borderBottom: "1px solid #e5e7eb",
                      textAlign: "right",
                    }}
                  >
                    {item.weight_g}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      borderBottom: "1px solid #e5e7eb",
                      textAlign: "right",
                    }}
                  >
                    {item.nutrition?.["에너지(kcal)"] != null
                      ? item.nutrition["에너지(kcal)"].toFixed(1)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
