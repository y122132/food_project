// food_frontend/src/components/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MealCard from './MealCard';
import DailySummary from './DailySummary';
import FoodAnalyzerModal from './FoodAnalyzerModal';
import MenuRecommender from './MenuRecommender';

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Dashboard({ currentUser, recommendedKcal }) {
  const [dailyMeals, setDailyMeals] = useState({
    '아침': null,
    '점심': null,
    '저녁': null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState(null);
  const [initialMealForModal, setInitialMealForModal] = useState(null);

  const fetchMealsForToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/meals/`, { withCredentials: true });
      const newDailyMeals = { '아침': null, '점심': null, '저녁': null };
      data.forEach(meal => {
        if (meal.title in newDailyMeals) {
          newDailyMeals[meal.title] = meal;
        }
      });
      setDailyMeals(newDailyMeals);
    } catch (err) {
      console.error("오늘의 식사 정보를 불러오는 데 실패했습니다.", err);
      setError("데이터를 불러올 수 없습니다. 다시 로그인 해주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMealsForToday();
    } else {
      setLoading(false);
      setDailyMeals({ '아침': null, '점심': null, '저녁': null });
      setError("로그인이 필요합니다.");
    }
  }, [currentUser, fetchMealsForToday]);

  const handleOpenModal = (mealType, meal) => {
    setActiveMealType(mealType);
    setInitialMealForModal(meal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveMealType(null);
    setInitialMealForModal(null);
  };

  const handleSaveSuccess = () => {
    handleCloseModal();
    fetchMealsForToday();
  };

  // --- NEW: Function to call the recommendation API ---
  const handleGetRecommendation = async (query) => {
    const { data } = await axios.post(
      `${API_BASE}/recommend-menu/`,
      { query },
      { withCredentials: true }
    );
    return data;
  };

  // New State for Recommender Modal
  const [isRecommenderOpen, setIsRecommenderOpen] = useState(false);

  if (loading) return <div className="text-center py-10 text-gray-500">로딩 중...</div>;
  if (error && !currentUser) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* AI Recommendation Trigger Button */}
      <button
        onClick={() => setIsRecommenderOpen(true)}
        className="w-full p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl text-lg font-semibold shadow-lg shadow-purple-200 hover:scale-[1.02] transition-transform duration-200 flex items-center justify-center gap-2"
      >
        <span>✨</span> AI에게 메뉴 추천 받기
      </button>

      <DailySummary meals={Object.values(dailyMeals).filter(m => m)} recommendedKcal={recommendedKcal} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MealCard
          title="아침"
          meal={dailyMeals['아침']}
          onManageClick={handleOpenModal}
        />
        <MealCard
          title="점심"
          meal={dailyMeals['점심']}
          onManageClick={handleOpenModal}
        />
        <MealCard
          title="저녁"
          meal={dailyMeals['저녁']}
          onManageClick={handleOpenModal}
        />
      </div>

      {/* Menu Recommender Modal */}
      {isRecommenderOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRecommenderOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">AI 메뉴 추천</h3>
              <button
                onClick={() => setIsRecommenderOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <MenuRecommender onRecommend={handleGetRecommendation} />
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <FoodAnalyzerModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          mealType={activeMealType}
          initialMeal={initialMealForModal}
          onSaveSuccess={handleSaveSuccess}
          currentUser={currentUser}
          recommendedKcal={recommendedKcal}
        />
      )}
    </div>
  );
}