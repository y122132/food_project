// food_frontend/src/components/FoodAnalyzerModal.jsx
import React, { useEffect, useMemo } from 'react';
import { useFoodAnalyzer } from '../hooks/useFoodAnalyzer';
import Step1Upload from './Step1Upload';
import Step2Select from './Step2Select';
import Step3Result from './Step3Result';

const API_BASE = import.meta.env.VITE_API_BASE;

export default function FoodAnalyzerModal({ 
  isOpen, 
  onClose, 
  mealType, 
  initialMeal,
  onSaveSuccess, 
  currentUser,
  recommendedKcal,
}) {
  const {
    step, setStep, imageFile, imagePreview, predClass, foodOptions,
    selectedFood, setSelectedFood, // REFACTORED
    weight, setWeight, result,
    mealItems, setMealItems, editingItemId, loading, errorMsg, saving,
    totalNutrition, macroPieData,
    handleImageChange, handlePredict, handleCalcAndAdd, removeMealItem,
    startEditItem, handleSaveMeal, resetState
  } = useFoodAnalyzer({ currentUser, API_BASE, mealType });

  // When the modal opens, set the initial state
  useEffect(() => {
    if (isOpen) {
      const startStep = (initialMeal && initialMeal.items.length > 0) ? 3 : 1;
      resetState(startStep);
      if (initialMeal) {
        setMealItems(initialMeal.items);
      }
    }
  }, [isOpen, initialMeal, resetState, setMealItems]);

  if (!isOpen) {
    return null;
  }
  
  const handleSaveWrapper = async () => {
    try {
      await handleSaveMeal();
      onSaveSuccess();
    } catch (error) {
      console.log("Failed to save meal.");
    }
  };

  const cardStyle = {
    border: "none",
    padding: 0,
    background: 'white',
    borderRadius: 16,
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
  };

  const kcalPercent = useMemo(() => {
    if (!totalNutrition) return 0;
    const totalKcal = totalNutrition["energy_kcal"] || 0;
    if (!recommendedKcal) return 0;
    return Math.round((totalKcal / recommendedKcal) * 100);
  }, [totalNutrition, recommendedKcal]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#f3f4f6', padding: '20px 40px', borderRadius: 16,
        width: '90%', maxWidth: '960px', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{fontSize: 24}}>'{mealType}' 식사 관리</h2>
          <button onClick={onClose} style={{fontSize: 24, border: 'none', background: 'transparent', cursor: 'pointer'}}>&times;</button>
        </div>

        <nav
          style={{ display: "flex", gap: 12, marginBottom: 20, fontSize: 14 }}
        >
          {[
            { id: 1, label: "1. 음식 추가" },
            { id: 2, label: "2. 세부 정보 입력" },
            { id: 3, label: "3. 한 끼 식단 확인" },
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

        {errorMsg && (
          <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontSize: 14 }}>
            {errorMsg}
          </div>
        )}
        
        {step === 1 && (
          <Step1Upload cardStyle={cardStyle} handleImageChange={handleImageChange} imagePreview={imagePreview} handlePredict={handlePredict} loading={loading} imageFile={imageFile} />
        )}

        {step === 2 && (
          <Step2Select cardStyle={cardStyle} predClass={predClass} foodOptions={foodOptions} selectedFood={selectedFood} setSelectedFood={setSelectedFood} weight={weight} setWeight={setWeight} setStep={setStep} handleCalcAndAdd={handleCalcAndAdd} loading={loading} editingItemId={editingItemId} mealItems={mealItems} />
        )}

        {step === 3 && (
          <Step3Result
            cardStyle={cardStyle}
            mealType={mealType}
            result={result}
            mealItems={mealItems}
            startEditItem={startEditItem}
            removeMealItem={removeMealItem}
            totalNutrition={totalNutrition}
            macroPieData={macroPieData}
            handleSaveMeal={handleSaveWrapper}
            saving={saving}
            goToNewImageForAnotherFood={() => setStep(1)}
            recommendedKcal={recommendedKcal}
            kcalPercent={kcalPercent}
            // Removed handleClearAllItems
          />
        )}
      </div>
    </div>
  );
}