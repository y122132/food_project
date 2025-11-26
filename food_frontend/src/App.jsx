import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import ProfilePage from "./components/ProfilePage";
import MealHistoryPage from "./components/MealHistoryPage";
import AuthBox from "./components/AuthBox";
import Step1Upload from "./components/Step1Upload";
import Step2Select from "./components/Step2Select";
import Step3Result from "./components/Step3Result";
import { useFoodAnalyzer } from "./hooks/useFoodAnalyzer";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function App() {
  const [currentView, setCurrentView] = useState("analyzer");
  const [currentUser, setCurrentUser] = useState(null);
  const [recommendedKcal, setRecommendedKcal] = useState(2000);

  const foodAnalyzer = useFoodAnalyzer({ currentUser, API_BASE });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/profile/`, {
          withCredentials: true,
        });
        if (data.user) {
          setCurrentUser(data.user);
        }
        if (data.recommended_kcal) {
          setRecommendedKcal(data.recommended_kcal);
        }
      } catch (err) {
        // Logged out users are expected to fail this, so we just log it.
        // We do NOT setCurrentUser(null) here to avoid a race condition with the login form.
        console.log("Not logged in or failed to fetch profile.");
      }
    };
    fetchProfile();
  }, []);

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    background: "#ffffff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
  };

  const kcalPercent = useMemo(() => {
    if (!foodAnalyzer.totalNutrition) return 0;
    const totalKcal = foodAnalyzer.totalNutrition["에너지(kcal)"] || 0;
    if (!recommendedKcal) return 0;
    return Math.round((totalKcal / recommendedKcal) * 100);
  }, [foodAnalyzer.totalNutrition, recommendedKcal]);


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
          <AuthBox
            apiBase={API_BASE}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        </header>

        <nav
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          {[
            { id: "analyzer", label: "🍱 영양 분석" },
            { id: "profile", label: "👤 내 프로필" },
            { id: "history", label: "📜 지난 식사 기록" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                background: currentView === tab.id ? "#2563eb" : "#ffffff",
                color: currentView === tab.id ? "#ffffff" : "#4b5563",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {currentView === "analyzer" && (
          <>
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
                    background: foodAnalyzer.step === id ? "#2563eb" : "#ffffff",
                    color: foodAnalyzer.step === id ? "#ffffff" : "#4b5563",
                    fontWeight: foodAnalyzer.step === id ? 600 : 400,
                  }}
                >
                  {label}
                </div>
              ))}
            </nav>

            {foodAnalyzer.errorMsg && (
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
                {foodAnalyzer.errorMsg}
              </div>
            )}

            {foodAnalyzer.step === 1 && (
              <Step1Upload
                cardStyle={cardStyle}
                handleImageChange={foodAnalyzer.handleImageChange}
                imagePreview={foodAnalyzer.imagePreview}
                handlePredict={foodAnalyzer.handlePredict}
                loading={foodAnalyzer.loading}
                imageFile={foodAnalyzer.imageFile}
              />
            )}

            {foodAnalyzer.step === 2 && (
              <Step2Select
                cardStyle={cardStyle}
                predClass={foodAnalyzer.predClass}
                foodOptions={foodAnalyzer.foodOptions}
                selectedFoodName={foodAnalyzer.selectedFoodName}
                setSelectedFoodName={foodAnalyzer.setSelectedFoodName}
                weight={foodAnalyzer.weight}
                setWeight={foodAnalyzer.setWeight}
                setStep={foodAnalyzer.setStep}
                handleCalcAndAdd={foodAnalyzer.handleCalcAndAdd}
                loading={foodAnalyzer.loading}
                editingItemId={foodAnalyzer.editingItemId}
                mealItems={foodAnalyzer.mealItems}
              />
            )}

            {foodAnalyzer.step === 3 && (
              <Step3Result
                cardStyle={cardStyle}
                result={foodAnalyzer.result}
                mealItems={foodAnalyzer.mealItems}
                startEditItem={foodAnalyzer.startEditItem}
                removeMealItem={foodAnalyzer.removeMealItem}
                totalNutrition={foodAnalyzer.totalNutrition}
                recommendedKcal={recommendedKcal}
                kcalPercent={kcalPercent}
                macroPieData={foodAnalyzer.macroPieData}
                saveMessage={foodAnalyzer.saveMessage}
                handleSaveMeal={foodAnalyzer.handleSaveMeal}
                saving={foodAnalyzer.saving}
                currentUser={currentUser}
                goToNewImageForAnotherFood={foodAnalyzer.goToNewImageForAnotherFood}
                resetAll={foodAnalyzer.resetAll}
              />
            )}
          </>
        )}

        {currentView === "profile" && (
          <ProfilePage
            apiBase={API_BASE}
            currentUser={currentUser}
            setRecommendedKcal={setRecommendedKcal}
          />
        )}

        {currentView === "history" && (
          <MealHistoryPage apiBase={API_BASE} />
        )}
      </div>
    </div>
  );
}

