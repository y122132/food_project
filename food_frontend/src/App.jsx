import { useState, useEffect } from "react";
import axios from "axios";
import ProfilePage from "./components/ProfilePage";
import MealHistoryPage from "./components/MealHistoryPage";
import AuthBox from "./components/AuthBox";
import Dashboard from "./components/Dashboard";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState(null);
  const [recommendedKcal, setRecommendedKcal] = useState(2000);

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
        console.log("Not logged in or failed to fetch profile.");
      }
    };
    fetchProfile();
  }, []);

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
              오늘의 식단을 기록하고 총 섭취 칼로리와 영양을 관리하세요.
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
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          {[
            { id: "dashboard", label: "오늘의 식단" },
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

        {currentView === "dashboard" && <Dashboard currentUser={currentUser} recommendedKcal={recommendedKcal} />}

        {currentView === "profile" && (
          <ProfilePage
            apiBase={API_BASE}
            currentUser={currentUser}
            setRecommendedKcal={setRecommendedKcal}
          />
        )}

        {currentView === "history" && <MealHistoryPage apiBase={API_BASE} />}
      </div>
    </div>
  );
}