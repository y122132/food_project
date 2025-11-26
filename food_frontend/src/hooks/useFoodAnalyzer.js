// food_frontend/src/hooks/useFoodAnalyzer.js
import { useState, useMemo, useCallback } from "react";
import axios from "axios";

// This is a restored and enhanced version of the hook to manage the 3-step modal workflow.
export function useFoodAnalyzer({ currentUser, API_BASE, mealType }) {
  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [predClass, setPredClass] = useState("");
  const [foodOptions, setFoodOptions] = useState([]);
  const [selectedFoodName, setSelectedFoodName] = useState("");
  const [weight, setWeight] = useState(200);
  const [result, setResult] = useState(null); // The result of the last nutrition calculation
  const [mealItems, setMealItems] = useState([]); // The list of items for the current meal in the modal
  const [editingItemId, setEditingItemId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  
  const resetState = useCallback((startStep = 1) => {
    setStep(startStep);
    setImageFile(null);
    setImagePreview(null);
    setPredClass("");
    setFoodOptions([]);
    setSelectedFoodName("");
    setWeight(200);
    setResult(null);
    setMealItems([]);
    setEditingItemId(null);
    setLoading(false);
    setErrorMsg("");
    setSaving(false);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStep(1);
      setEditingItemId(null); // New image means we are adding, not editing
    }
  };

  const handlePredict = async () => {
    if (!imageFile) {
      alert("이미지를 먼저 선택해 주세요.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const { data } = await axios.post(`${API_BASE}/predict/`, formData);

      setPredClass(data.pred_class);
      setFoodOptions(data.food_options || []);
      if (data.food_options && data.food_options.length > 0) {
        setSelectedFoodName(data.food_options[0]["식품명"]);
      } else {
        setSelectedFoodName("");
      }
      setStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg("이미지 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleCalcAndAdd = async () => {
    if (!selectedFoodName) {
      alert("식품명을 선택해 주세요.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        pred_class: predClass,
        food_name: selectedFoodName,
        weight_g: Number(weight),
      };
      const { data } = await axios.post(`${API_BASE}/calc-nutrition/`, payload);

      setResult(data); // Save the result of the single calculation

      // If we are editing an item
      if (editingItemId !== null) {
        setMealItems(prev =>
          prev.map(item =>
            item.id === editingItemId
              ? { ...item, pred_class: data.pred_class, food_name: data.food_name, weight_g: data.input_g, nutrition: data.nutrition }
              : item
          )
        );
      } else { // If we are adding a new item
        setMealItems(prev => [
          ...prev,
          { id: Date.now(), pred_class: data.pred_class, food_name: data.food_name, weight_g: data.input_g, nutrition: data.nutrition },
        ]);
      }
      setEditingItemId(null);
      setStep(3); // Go to the results view
    } catch (err) {
      console.error("영양 성분 계산 중 오류 발생:", err);
      setErrorMsg("영양 성분 계산 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  
  const removeMealItem = (id) => {
    setMealItems((prev) => prev.filter((item) => item.id !== id));
  };
  
  const startEditItem = async (item) => {
    setLoading(true);
    setErrorMsg("");
    try {
      // Fetch food options for the item's class
      const { data } = await axios.get(`${API_BASE}/food-options/`, { params: { class: item.pred_class } });
      setPredClass(item.pred_class);
      setFoodOptions(data.food_options || data || []);
      setSelectedFoodName(item.food_name);
      setWeight(item.weight_g);
      setResult(null);
      setEditingItemId(item.id);
      setStep(2); // Go back to step 2 to edit
    } catch (err) {
      console.error(err);
      setErrorMsg("수정할 음식 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const totalNutrition = useMemo(() => {
    if (mealItems.length === 0) return null;
    const keys = Object.keys(mealItems[0].nutrition || {});
    const total = {};
    for (const key of keys) {
      total[key] = mealItems.reduce((sum, item) => {
        const v = item.nutrition[key];
        return sum + (v == null || isNaN(v) ? 0 : Number(v));
      }, 0);
    }
    return total;
  }, [mealItems]);

  const macroPieData = useMemo(() => {
    if (!totalNutrition) return [];
    return [
      { name: '탄수화물(g)', value: totalNutrition['탄수화물(g)'] || 0 },
      { name: '단백질(g)', value: totalNutrition['단백질(g)'] || 0 },
      { name: '지방(g)', value: totalNutrition['지방(g)'] || 0 },
    ];
  }, [totalNutrition]);

  const handleSaveMeal = async () => {
    if (!currentUser) {
      alert("식사를 저장하려면 먼저 로그인해야 합니다.");
      throw new Error("Not authenticated");
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const payload = {
        title: mealType || "",
        total_kcal: totalNutrition ? totalNutrition["에너지(kcal)"] || 0 : 0, // Handle totalNutrition being null if mealItems is empty
        items: mealItems.map(({ id, ...item }) => item), // Remove client-side id before sending
      };
      // If mealItems is empty, the backend will delete the meal itself.
      await axios.post(`${API_BASE}/meals/`, payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      resetState();
    } catch (err) {
      console.error("식사 저장 중 오류 발생:", err);
      setErrorMsg("식사 저장 중 오류가 발생했습니다.");
      throw err;
    } finally {
      setSaving(false);
    }
  };
  
  return {
    step, setStep, imageFile, imagePreview, predClass, foodOptions,
    selectedFoodName, setSelectedFoodName, weight, setWeight, result,
    mealItems, setMealItems, editingItemId, loading, errorMsg, saving,
    totalNutrition, macroPieData,
    handleImageChange, handlePredict, handleCalcAndAdd, removeMealItem,
    startEditItem, handleSaveMeal, resetState
  };
}