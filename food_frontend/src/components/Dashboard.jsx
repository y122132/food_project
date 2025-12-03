// food_frontend/src/components/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MealCard from './MealCard';
import DailySummary from './DailySummary';
import FoodAnalyzerModal from './FoodAnalyzerModal';
import MenuRecommender from './MenuRecommender'; // Import the new component
import './Dashboard.css'; // Import the new CSS file

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

  if (loading) return <div>로딩 중...</div>;
  if (error && !currentUser) return <div style={{ color: 'red', textAlign: 'center', marginTop: '40px' }}>{error}</div>;

  return (
    <div>
      <MenuRecommender onRecommend={handleGetRecommendation} /> {/* Pass the function as a prop */}
      <DailySummary meals={Object.values(dailyMeals).filter(m => m)} recommendedKcal={recommendedKcal} />
      <div className="meal-cards-grid"> {/* Apply class name here */}
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