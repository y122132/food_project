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

  // New State for Recommender Modal
  const [isRecommenderOpen, setIsRecommenderOpen] = useState(false);

  if (loading) return <div>로딩 중...</div>;
  if (error && !currentUser) return <div style={{ color: 'red', textAlign: 'center', marginTop: '40px' }}>{error}</div>;

  return (
    <div>
      {/* AI Recommendation Trigger Button */}
      <button 
        onClick={() => setIsRecommenderOpen(true)}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          fontSize: '1.1rem',
          fontWeight: '600',
          marginBottom: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 10px rgba(168, 85, 247, 0.3)',
          transition: 'transform 0.2s ease'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span>✨</span> AI에게 메뉴 추천 받기
      </button>

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

      {/* Menu Recommender Modal */}
      {isRecommenderOpen && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
            backdropFilter: 'blur(4px)'
        }} onClick={(e) => {
            if(e.target === e.currentTarget) setIsRecommenderOpen(false);
        }}>
            <div style={{
            background: 'white', 
            borderRadius: 24,
            width: '95%', 
            maxWidth: '800px', 
            maxHeight: '85vh', 
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937' }}>AI 메뉴 추천</h3>
                    <button 
                        onClick={() => setIsRecommenderOpen(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#9ca3af',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        &times;
                    </button>
                </div>
                <div style={{ padding: '20px' }}>
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