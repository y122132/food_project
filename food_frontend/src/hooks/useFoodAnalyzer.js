// food_frontend/src/hooks/useFoodAnalyzer.js
import { useState, useMemo, useCallback } from "react";
import axios from "axios";

export function useFoodAnalyzer({ currentUser, API_BASE, mealType }) {
  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // --- Multi-Food Detection State ---
  const [detectedList, setDetectedList] = useState([]);
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0);

  const [predClass, setPredClass] = useState("");
  const [foodOptions, setFoodOptions] = useState([]);

  // --- REFACTORED STATE ---
  const [selectedFood, setSelectedFood] = useState(null); // From string to object

  const [weight, setWeight] = useState(200);
  const [result, setResult] = useState(null);

  // mealItems will now store a food object
  const [mealItems, setMealItems] = useState([]);

  const [editingItemId, setEditingItemId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const resetState = useCallback((startStep = 1) => {
    setStep(startStep);
    setImageFile(null);
    setImagePreview(null);
    setDetectedList([]);
    setCurrentFoodIndex(0);
    setPredClass("");
    setFoodOptions([]);
    setSelectedFood(null); // REFACTORED
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
      setEditingItemId(null);
    }
  };

  // --- REFACTORED to handle new API response ---
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
      const { data } = await axios.post(`${API_BASE}/predict/`, formData, { withCredentials: true });

      // Handle new response structure: { "detected_foods": [...] }
      const detections = data.detected_foods || [];
      setDetectedList(detections);

      if (detections.length > 0) {
        // Load the first detection
        const firstItem = detections[0];
        setCurrentFoodIndex(0);
        setPredClass(firstItem.pred_class);
        setFoodOptions(firstItem.food_options || []);

        if (firstItem.food_options && firstItem.food_options.length > 0) {
          setSelectedFood(firstItem.food_options[0]);
        } else {
          setSelectedFood(null);
        }
        setStep(2);
      } else {
        setErrorMsg("음식을 탐지하지 못했습니다.");
      }

    } catch (err) {
      console.error(err);
      setErrorMsg("이미지 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // --- REFACTORED to use food_id and iterate detectedList ---
  const handleCalcAndAdd = async () => {
    if (!selectedFood) {
      alert("식품을 선택해 주세요.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        food_id: selectedFood.id, // Use food_id
        weight_g: Number(weight),
      };
      const { data } = await axios.post(`${API_BASE}/calc-nutrition/`, payload, { withCredentials: true });

      setResult(data);

      const newItem = {
        id: editingItemId ?? Date.now(),
        food: { // Store partial food object
          id: data.food_id,
          representative_name: data.representative_name,
          food_class: selectedFood.food_class, // PRESERVE food_class for subsequent edits
        },
        weight_g: data.input_g,
        nutrition: data.nutrition,
      };

      if (editingItemId !== null) {
        // Editing an existing item
        setMealItems(prev => prev.map(item => item.id === editingItemId ? newItem : item));
        setEditingItemId(null);
        setStep(3);
      } else {
        // Adding a new item from the detection list
        setMealItems(prev => [...prev, newItem]);

        // Check if there are more items in the detected list
        const nextIndex = currentFoodIndex + 1;
        if (nextIndex < detectedList.length) {
          // Move to next detected item
          const nextItem = detectedList[nextIndex];
          setCurrentFoodIndex(nextIndex);
          setPredClass(nextItem.pred_class);
          setFoodOptions(nextItem.food_options || []);
          if (nextItem.food_options && nextItem.food_options.length > 0) {
            setSelectedFood(nextItem.food_options[0]);
          } else {
            setSelectedFood(null);
          }
          setWeight(200); // Reset weight
          // Stay on Step 2
        } else {
          // All items processed
          setStep(3);
        }
      }
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

  // --- REFACTORED to use new item structure ---
  const startEditItem = async (item) => {
    // --- FINAL DEBUG: Inspect the item object when edit is clicked ---
    console.log("startEditItem called with item:", JSON.stringify(item, null, 2));

    setLoading(true);
    setErrorMsg("");
    try {
      const foodClass = item.food?.food_class;
      if (!foodClass) {
        setErrorMsg("음식 분류 정보가 없어 수정할 수 없습니다.");
        setLoading(false);
        return;
      }

      const { data } = await axios.get(`${API_BASE}/food-options/`, {
        params: { class: foodClass },
        withCredentials: true
      });
      setPredClass(foodClass);
      setFoodOptions(data.food_options || data || []);

      const fullFoodObject = data.food_options.find(opt => opt.id === item.food.id) || item.food;
      setSelectedFood(fullFoodObject);

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
    const firstItemNutrition = mealItems[0]?.nutrition;
    if (!firstItemNutrition) return null;

    const keys = Object.keys(firstItemNutrition);
    const total = {};
    for (const key of keys) {
      total[key] = mealItems.reduce((sum, item) => {
        const v = item.nutrition?.[key];
        return sum + (v == null || isNaN(v) ? 0 : Number(v));
      }, 0);
    }
    return total;
  }, [mealItems]);

  const macroPieData = useMemo(() => {
    if (!totalNutrition) return [];
    const carb = totalNutrition['carbohydrate_g'] || 0;
    const protein = totalNutrition['protein_g'] || 0;
    const fat = totalNutrition['fat_g'] || 0;
    return [
      { name: '탄수화물(g)', value: carb },
      { name: '단백질(g)', value: protein },
      { name: '지방(g)', value: fat },
    ];
  }, [totalNutrition]);

  // --- REFACTORED to send correct payload ---
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
        items: mealItems.map(item => ({
          food_id: item.food.id,
          weight_g: item.weight_g,
        })),
      };

      await axios.post(`${API_BASE}/meals/`, payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      resetState();
    } catch (err) {
      console.error("식사 저장 중 오류 발생:", err);
      const serverError = err.response?.data?.detail || "식사 저장 중 오류가 발생했습니다.";
      setErrorMsg(serverError);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // --- NEW: Skip current food ---
  const handleSkip = () => {
    const nextIndex = currentFoodIndex + 1;
    if (nextIndex < detectedList.length) {
      // Move to next detected item
      const nextItem = detectedList[nextIndex];
      setCurrentFoodIndex(nextIndex);
      setPredClass(nextItem.pred_class);
      setFoodOptions(nextItem.food_options || []);
      if (nextItem.food_options && nextItem.food_options.length > 0) {
        setSelectedFood(nextItem.food_options[0]);
      } else {
        setSelectedFood(null);
      }
      setWeight(200); // Reset weight
      // Stay on Step 2
    } else {
      // All items processed
      setStep(3);
    }
  };

  return {
    step, setStep, imageFile, imagePreview, predClass, foodOptions,
    selectedFood, setSelectedFood, // REFACTORED
    weight, setWeight, result,
    mealItems, setMealItems, editingItemId, loading, errorMsg, saving,
    totalNutrition, macroPieData,
    handleImageChange, handlePredict, handleCalcAndAdd, removeMealItem,
    startEditItem, handleSaveMeal, resetState,
    // New state exports
    detectedList, currentFoodIndex, handleSkip // NEW
  };
}