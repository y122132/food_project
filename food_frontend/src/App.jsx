import { useState, useMemo } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function App() {
  const [step, setStep] = useState(1); // 1: 업로드, 2: 세부 선택, 3: 결과

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [predClass, setPredClass] = useState("");
  const [foodOptions, setFoodOptions] = useState([]);
  const [selectedFoodName, setSelectedFoodName] = useState("");

  const [weight, setWeight] = useState(200); // g

  const [result, setResult] = useState(null);      // 마지막 계산 결과
  const [mealItems, setMealItems] = useState([]);  // 한 끼에 담긴 음식들

  const [editingItemId, setEditingItemId] = useState(null); // 수정 중인 음식 id (없으면 null)

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // -----------------------------
  // 공통 카드 스타일
  // -----------------------------
  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    background: "#ffffff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
  };

  // -----------------------------
  // 이미지 선택
  // -----------------------------
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setErrorMsg("");
    setPredClass("");
    setFoodOptions([]);
    setSelectedFoodName("");
    setResult(null);
    setStep(1);
    setEditingItemId(null); // 새 이미지면 수정모드 해제

    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  // -----------------------------
  // 1단계: 이미지 분석
  // -----------------------------
  const handlePredict = async () => {
    if (!imageFile) {
      alert("이미지를 먼저 선택해 주세요.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const { data } = await axios.post(`${API_BASE}/predict/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPredClass(data.pred_class);
      setFoodOptions(data.food_options || []);
      if (data.food_options && data.food_options.length > 0) {
        setSelectedFoodName(data.food_options[0]["식품명"]);
      } else {
        setSelectedFoodName("");
      }
      setStep(2); // 세부 식품 선택 단계로 이동
      setEditingItemId(null); // 새 이미지 분석은 항상 "새 추가" 모드
    } catch (err) {
      console.error(err);
      setErrorMsg("이미지 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 2단계: 영양 계산 + 한 끼 목록에 추가/수정
  // -----------------------------
  const handleCalcAndAdd = async () => {
    if (!predClass) {
      alert("먼저 이미지를 분석해 주세요.");
      return;
    }
    if (!selectedFoodName) {
      alert("식품명을 선택해 주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try{
      const payload = {
        pred_class: predClass,
        food_name: selectedFoodName,
        weight_g: Number(weight),
      };

      const { data } = await axios.post(
        `${API_BASE}/calc-nutrition/`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      setResult(data);

      if (editingItemId === null) {
        // 새 음식 추가
        setMealItems((prev) => [
          ...prev,
          {
            id: Date.now(),
            pred_class: data.pred_class,
            food_name: data.food_name,
            weight_g: data.input_g,
            nutrition: data.nutrition,
          },
        ]);
      } else {
        // 기존 음식 수정
        setMealItems((prev) =>
          prev.map((item) =>
            item.id === editingItemId
              ? {
                  ...item,
                  pred_class: data.pred_class,
                  food_name: data.food_name,
                  weight_g: data.input_g,
                  nutrition: data.nutrition,
                }
              : item
          )
        );
      }

      setEditingItemId(null); // 수정 완료 후 해제
      setStep(3); // 결과 페이지로 이동
    } catch (err) {
      console.error(err);
      if (err.response?.data?.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg("영양 성분 계산 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 한 끼 항목 삭제
  // -----------------------------
  const removeMealItem = (id) => {
    setMealItems((prev) => prev.filter((item) => item.id !== id));
  };

  // -----------------------------
  // 한 끼 항목 수정 시작
  //  - 클릭한 음식의 pred_class 로 food_options 불러오고
  //  - food_name, weight 로 2단계 폼 채운 후 step=2
  // -----------------------------
  const startEditItem = async (item) => {
    try {
      setLoading(true);
      setErrorMsg("");

      // 대표식품명 기준 세부 식품 리스트 다시 가져오기
      const { data } = await axios.get(`${API_BASE}/food-options/`, {
        params: { class: item.pred_class },
      });

      const options = data.food_options || data || [];

      setPredClass(item.pred_class);
      setFoodOptions(options);
      setSelectedFoodName(item.food_name);
      setWeight(item.weight_g);
      setResult(null);
      setEditingItemId(item.id);
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg("세부 식품 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 한 끼 전체 영양성분 합계 계산
  // -----------------------------
  const totalNutrition = useMemo(() => {
    if (mealItems.length === 0) return null;

    const keys = Object.keys(mealItems[0].nutrition || {});
    const total = {};
    for (const key of keys) {
      total[key] = mealItems.reduce((sum, item) => {
        const v = item.nutrition[key];
        if (v == null || isNaN(v)) return sum;
        return sum + Number(v);
      }, 0);
    }
    return total;
  }, [mealItems]);

  // 하루 권장 칼로리 (원하면 나중에 설정값으로 뺄 수 있음)
  const RECOMMENDED_KCAL = 2000;

  // 탄/단/지 원형 차트용 데이터
  const macroPieData = useMemo(() => {
    if (!totalNutrition) return [];
    return [
      {
        name: "탄수화물(g)",
        value: totalNutrition["탄수화물(g)"] || 0,
        fill: "#60a5fa", // 파란색 계열
      },
      {
        name: "단백질(g)",
        value: totalNutrition["단백질(g)"] || 0,
        fill: "#34d399", // 초록색 계열
      },
      {
        name: "지방(g)",
        value: totalNutrition["지방(g)"] || 0,
        fill: "#f97316", // 주황색 계열
      },
    ];
  }, [totalNutrition]);

  // 섭취 칼로리 / 권장 칼로리 비율 (%)
  const kcalPercent = useMemo(() => {
    if (!totalNutrition) return 0;
    const totalKcal = totalNutrition["에너지(kcal)"] || 0;
    if (!RECOMMENDED_KCAL) return 0;
    return Math.round((totalKcal / RECOMMENDED_KCAL) * 100);
  }, [totalNutrition]);

  // -----------------------------
  // 다른 음식 사진으로 추가하기
  //  - mealItems는 유지, 이미지/예측 관련만 초기화하고 1단계로 이동
  // -----------------------------
  const goToNewImageForAnotherFood = () => {
    setStep(1);
    setImageFile(null);
    setImagePreview(null);
    setPredClass("");
    setFoodOptions([]);
    setSelectedFoodName("");
    setWeight(200);
    setResult(null);
    setErrorMsg("");
    setEditingItemId(null);
    // mealItems는 그대로 유지됨
  };

  const resetAll = () => {
    setStep(1);
    setImageFile(null);
    setImagePreview(null);
    setPredClass("");
    setFoodOptions([]);
    setSelectedFoodName("");
    setWeight(200);
    setResult(null);
    setMealItems([]);
    setErrorMsg("");
    setEditingItemId(null);
  };

  // -----------------------------
  // 렌더링
  // -----------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "24px 12px 40px",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* 헤더 */}
        <header
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 4 }}>🍱 음식 영양 분석</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
              음식 사진 → 분류 → 세부 식품 선택 → 섭취 중량에 따른 영양 성분 계산 & 한 끼 총합
            </p>
          </div>
          <button
            onClick={resetAll}
            style={{
              borderRadius: 999,
              border: "1px solid #d1d5db",
              padding: "6px 14px",
              background: "#ffffff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            초기화
          </button>
        </header>

        {/* 단계 표시 */}
        <nav
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {[
            { id: 1, label: "1. 음식 사진 업로드" },
            { id: 2, label: "2. 세부 식품 선택 + 중량" },
            { id: 3, label: "3. 결과 / 한 끼 총합" },
          ].map(({ id, label }) => (
            <div
              key={id}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 999,
                textAlign: "center",
                border: "1px solid #e5e7eb",
                background: step === id ? "#2563eb" : "#ffffff",
                color: step === id ? "#ffffff" : "#4b5563",
                fontWeight: step === id ? 600 : 400,
              }}
            >
              {label}
            </div>
          ))}
        </nav>

        {/* 에러 메시지 */}
        {errorMsg && (
          <div
            style={{
              padding: "10px 14px",
              marginBottom: 16,
              borderRadius: 12,
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: 14,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* 1단계: 이미지 업로드 */}
        {step === 1 && (
          <section style={cardStyle}>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>1) 음식 사진 업로드</h2>
            <p style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
              휴대폰이나 카메라로 찍은 음식 사진을 업로드하면, 모델이 어떤 음식인지 먼저 분류합니다.
            </p>

            <input type="file" accept="image/*" onChange={handleImageChange} />

            {imagePreview && (
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{
                    width: 260,
                    height: 260,
                    borderRadius: 16,
                    objectFit: "cover",
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                  }}
                />
                <div style={{ fontSize: 14, color: "#6b7280" }}>
                  <p style={{ marginBottom: 8 }}>
                    이미지를 확인한 뒤, 아래 버튼을 눌러 분석을 시작하세요.
                  </p>
                  <button
                    onClick={handlePredict}
                    disabled={loading || !imageFile}
                    style={{
                      marginTop: 4,
                      padding: "10px 18px",
                      borderRadius: 999,
                      border: "none",
                      background:
                        loading || !imageFile ? "#9ca3af" : "#2563eb",
                      color: "#ffffff",
                      fontWeight: 600,
                      cursor: loading || !imageFile ? "default" : "pointer",
                    }}
                  >
                    {loading ? "분석 중..." : "이미지 분석하기"}
                  </button>
                </div>
              </div>
            )}

            {!imagePreview && (
              <p style={{ marginTop: 16, color: "#9ca3af", fontSize: 13 }}>
                아직 이미지가 없습니다. 상단의 파일 선택 버튼을 눌러 주세요.
              </p>
            )}
          </section>
        )}

        {/* 2단계: 세부 식품 + 중량 */}
        {step === 2 && (
          <section style={cardStyle}>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>
              2) 세부 식품 선택 & 섭취 중량 설정
            </h2>

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
                  const name = opt["식품명"];
                  const sub = opt["식품중분류명"];
                  const checked = selectedFoodName === name;

                  return (
                    <label
                      key={idx}
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
                        value={name}
                        checked={checked}
                        onChange={() => setSelectedFoodName(name)}
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

              <button
                onClick={handleCalcAndAdd}
                disabled={loading || !selectedFoodName}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    loading || !selectedFoodName ? "#9ca3af" : "#16a34a",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor:
                    loading || !selectedFoodName ? "default" : "pointer",
                }}
              >
                {loading
                  ? "계산 중..."
                  : editingItemId === null
                  ? "한 끼에 추가 & 결과 보기"
                  : "수정 완료 & 결과 보기"}
              </button>
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
                      {item.food_name} ({item.weight_g} g)
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* 3단계: 결과 / 한 끼 총합 */}
        {step === 3 && (
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
                      kcal / 권장: <strong>{RECOMMENDED_KCAL}</strong> kcal (
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
              }}
            >
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
                다른 음식 추가하기
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
          </section>
        )}
      </div>
    </div>
  );
}
