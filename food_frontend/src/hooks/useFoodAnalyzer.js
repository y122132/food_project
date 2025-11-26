// food_frontend/src/hooks/useFoodAnalyzer.js
import { useState, useMemo } from "react";
import axios from "axios";

export function useFoodAnalyzer({ currentUser, API_BASE }) {
  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [predClass, setPredClass] = useState("");
  const [foodOptions, setFoodOptions] = useState([]);
  const [selectedFoodName, setSelectedFoodName] = useState("");
  const [weight, setWeight] = useState(200);
  const [result, setResult] = useState(null);
  const [mealItems, setMealItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setErrorMsg("");
    setPredClass("");
    setFoodOptions([]);
    setSelectedFoodName("");
    setResult(null);
    setStep(1);
    setEditingItemId(null);

    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

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
      setStep(2);
      setEditingItemId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("이미지 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

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

    try {
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

      setEditingItemId(null);
      setStep(3);
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

  const removeMealItem = (id) => {
    setMealItems((prev) => prev.filter((item) => item.id !== id));
  };

  const startEditItem = async (item) => {
    try {
      setLoading(true);
      setErrorMsg("");

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

  const macroPieData = useMemo(() => {
    if (!totalNutrition) return [];
    return [
      {
        name: "탄수화물(g)",
        value: totalNutrition["탄수화물(g)"] || 0,
        fill: "#60a5fa",
      },
      {
        name: "단백질(g)",
        value: totalNutrition["단백질(g)"] || 0,
        fill: "#34d399",
      },
      {
        name: "지방(g)",
        value: totalNutrition["지방(g)"] || 0,
        fill: "#f97316",
      },
    ];
  }, [totalNutrition]);

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

  const handleSaveMeal = async () => {
    if (!currentUser) {
      alert("식사를 저장하려면 먼저 로그인해야 합니다.");
      return;
    }
    if (mealItems.length === 0 || !totalNutrition) {
      alert("저장할 식사 내용이 없습니다.");
      return;
    }
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        title: "",
        total_kcal: totalNutrition["에너지(kcal)"] || null,
        items: mealItems.map((item) => ({
          pred_class: item.pred_class,
          food_name: item.food_name,
          weight_g: item.weight_g,
          nutrition: item.nutrition,
        })),
      };
      await axios.post(`${API_BASE}/meals/`, payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      setSaveMessage("✅ 식사가 저장되었습니다.");
    } catch (err) {
      console.error(err);
      setSaveMessage("❌ 식사 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return {
    step,
    imageFile,
    imagePreview,
    predClass,
    foodOptions,
    selectedFoodName,
    weight,
    result,
    mealItems,
    editingItemId,
    loading,
    errorMsg,
    saving,
    saveMessage,
    totalNutrition,
    macroPieData,
    handleImageChange,
    handlePredict,
    handleCalcAndAdd,
    removeMealItem,
    startEditItem,
    goToNewImageForAnotherFood,
    resetAll,
    handleSaveMeal,
    setWeight,
    setSelectedFoodName,
    setStep
  };
}
