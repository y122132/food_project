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
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">
              🍱 음식 영양 분석
            </h1>
            <p className="text-gray-500 text-sm">
              오늘의 식단을 기록하고 총 섭취 칼로리와 영양을 스마트하게 관리하세요.
            </p>
          </div>
          <AuthBox
            apiBase={API_BASE}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        </header>

        {/* Navigation Tabs */}
        <nav className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: "dashboard", label: "오늘의 식단" },
            { id: "profile", label: "👤 내 프로필" },
            { id: "history", label: "📜 지난 식사 기록" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-in-out whitespace-nowrap
                ${currentView === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <main className="transition-all duration-300 ease-in-out">
          {currentView === "dashboard" && (
            <Dashboard currentUser={currentUser} recommendedKcal={recommendedKcal} />
          )}

          {currentView === "profile" && (
            <ProfilePage
              apiBase={API_BASE}
              currentUser={currentUser}
              setRecommendedKcal={setRecommendedKcal}
            />
          )}

          {currentView === "history" && <MealHistoryPage apiBase={API_BASE} />}
        </main>
      </div>
    </div>
  );
}