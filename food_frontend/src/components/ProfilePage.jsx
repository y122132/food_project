import { useEffect, useState, useCallback } from "react";
import axios from "axios";

export default function ProfilePage({ apiBase, currentUser, setRecommendedKcal }) {
  const [form, setForm] = useState({
    gender: "",
    height_cm: "",
    weight_kg: "",
    birth_date: "",
    activity_level: "",
    is_vegetarian: false,
    is_vegan: false,
    allergies: [], // List of allergen IDs
  });
  const [recommended, setRecommended] = useState(null);
  const [allergenList, setAllergenList] = useState([]); // List of available allergens from API
  const [newAllergen, setNewAllergen] = useState(""); // State for new custom allergen input
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  // NEW: State for food preferences
  const [foodPreferences, setFoodPreferences] = useState([]);
  const [foodSearchTerm, setFoodSearchTerm] = useState("");
  const [foodSearchResults, setFoodSearchResults] = useState([]);
  const [selectedFoodForPreference, setSelectedFoodForPreference] = useState(null);

  const fetchProfileAndAllergens = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Fetch available allergens
      try {
          const allergenRes = await axios.get(`${apiBase}/allergens/`, { withCredentials: true });
          setAllergenList(allergenRes.data || []);
      } catch (e) {
          console.warn("Failed to fetch allergens", e);
      }

      // 2. Fetch user profile
      const { data } = await axios.get(`${apiBase}/profile/`, {
        withCredentials: true,
      });
      setForm({
        gender: data.gender || "",
        height_cm: data.height_cm || "",
        weight_kg: data.weight_kg || "",
        birth_date: data.birth_date || "",
        activity_level: data.activity_level || "",
        is_vegetarian: data.is_vegetarian || false,
        is_vegan: data.is_vegan || false,
        allergies: data.allergies ? data.allergies.map(a => a.id) : [], // Convert object list to ID list
      });
      setRecommended(data.recommended_kcal || null);
      if (data.recommended_kcal && setRecommendedKcal) {
        setRecommendedKcal(data.recommended_kcal);
      }

      // NEW: Fetch user food preferences
      try {
        const preferenceRes = await axios.get(`${apiBase}/food-preferences/`, { withCredentials: true });
        setFoodPreferences(preferenceRes.data || []);
      } catch (e) {
        console.warn("Failed to fetch food preferences", e);
      }
    } catch (err) {
      console.error(err);
      setMsg("프로필 정보를 불러오지 못했습니다. (로그인 여부 확인)");
    } finally {
      setLoading(false);
    }
  }, [apiBase, setRecommendedKcal, setLoading, setForm, setRecommended, setMsg, setAllergenList, setFoodPreferences]);

  useEffect(() => {
    fetchProfileAndAllergens();
  }, [fetchProfileAndAllergens]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
  };

  const handleAllergenToggle = (allergenId) => {
    setForm((prev) => {
        const current = prev.allergies;
        if (current.includes(allergenId)) {
            return { ...prev, allergies: current.filter(id => id !== allergenId) };
        } else {
            return { ...prev, allergies: [...current, allergenId] };
        }
    });
  };

  const handleDeleteAllergen = async (e, allergenId) => {
    e.stopPropagation(); // Prevent toggling the selection
    if (!window.confirm("이 알러지 태그를 완전히 삭제하시겠습니까?")) return;

    try {
      await axios.delete(`${apiBase}/allergens/${allergenId}/`, {
        withCredentials: true
      });
      
      setAllergenList(prev => prev.filter(a => a.id !== allergenId));
      // Also remove from selected list if present
      setForm(prev => ({
          ...prev,
          allergies: prev.allergies.filter(id => id !== allergenId)
      }));
    } catch (err) {
      console.error("Failed to delete allergen", err);
      alert("알러지 삭제 실패: 사용 중인 항목이거나 권한이 없을 수 있습니다.");
    }
  };

  const handleAddCustomAllergen = async (e) => {
    e.preventDefault();
    if (!newAllergen.trim()) return;

    try {
      // Create the new allergen on the server
      const { data } = await axios.post(`${apiBase}/allergens/`, { name: newAllergen }, {
        withCredentials: true
      });
      
      // Add to the list if not already there
      setAllergenList(prev => {
          if (prev.find(a => a.id === data.id)) return prev;
          return [...prev, data];
      });

      // Automatically select it
      handleAllergenToggle(data.id);
      
      setNewAllergen(""); // Clear input
    } catch (err) {
      console.error("Failed to add allergen", err);
      alert("알러지 추가 실패: 이미 존재하는 알러지이거나 오류가 발생했습니다.");
    }
  };

  // NEW: Functions for Food Preferences
  const handleFoodSearch = async () => {
    if (!foodSearchTerm.trim()) {
      setFoodSearchResults([]);
      return;
    }
    setLoading(true); // Reuse loading for search
    setMsg(""); // Clear messages
    try {
      const { data } = await axios.get(`${apiBase}/food-options/?name=${foodSearchTerm}`, { withCredentials: true });
      setFoodSearchResults(data.food_options || []); // Assuming food_options returns a list of foods
    } catch (err) {
      console.error("음식 검색 중 오류 발생:", err);
      setMsg("❌ 음식 검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPreference = async (foodId, preferenceType) => {
    setLoading(true);
    setMsg("");
    try {
      const payload = { food_id: foodId, preference: preferenceType };
      const { data } = await axios.post(`${apiBase}/food-preferences/`, payload, { withCredentials: true });
      
      // Update local state to reflect the change
      setFoodPreferences(prev => {
        const existingIndex = prev.findIndex(p => p.food.id === foodId);
        if (existingIndex > -1) {
          // Update existing preference
          const newPrefs = [...prev];
          newPrefs[existingIndex] = data;
          return newPrefs;
        } else {
          // Add new preference
          return [...prev, data];
        }
      });
      setMsg(`✅ ${data.food.representative_name}을(를) ${preferenceType === 'LIKE' ? '선호' : '비선호'} 음식으로 ${data.created ? '추가' : '업데이트'}했습니다.`);
      setSelectedFoodForPreference(null); // Clear selection
      setFoodSearchTerm("");
      setFoodSearchResults([]);
    } catch (err) {
      console.error("선호 음식 추가/업데이트 실패:", err);
      setMsg("❌ 선호 음식 추가/업데이트 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreference = async (foodId) => {
    if (!window.confirm("이 음식 선호도를 삭제하시겠습니까?")) return;

    setLoading(true);
    setMsg("");
    try {
      await axios.delete(`${apiBase}/food-preferences/${foodId}/`, { withCredentials: true });
      setFoodPreferences(prev => prev.filter(p => p.food.id !== foodId));
      setMsg("✅ 선호 음식 삭제 완료.");
    } catch (err) {
      console.error("선호 음식 삭제 실패:", err);
      setMsg("❌ 선호 음식 삭제 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      // Prepare payload: rename 'allergies' to 'allergy_ids' for the backend
      const payload = {
          ...form,
          allergy_ids: form.allergies // Send IDs to 'allergy_ids' field
      };
      delete payload.allergies; // Remove the read-only field

      const { data } = await axios.put(`${apiBase}/profile/`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      setRecommended(data.recommended_kcal || null);
      if (data.recommended_kcal && setRecommendedKcal) {
        setRecommendedKcal(data.recommended_kcal);
      }
      
      // Re-sync form state with response (which returns full objects in 'allergies')
      if (data.allergies) {
          setForm(prev => ({
              ...prev,
              allergies: data.allergies.map(a => a.id)
          }));
      }
      
      setMsg("✅ 프로필이 저장되었습니다.");
      // Re-fetch profile and allergens to ensure UI is fully synchronized with DB
      await fetchProfileAndAllergens();
    } catch (err) {
      console.error(err);
      setMsg("❌ 프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        background: "#ffffff",
        boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
      }}
    >
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>👤 내 프로필 / 권장 칼로리</h2>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
        신체 정보와 식습관을 입력하면 맞춤형 메뉴 추천과 칼로리 분석을 받을 수 있습니다.
      </p>

      {recommended && (
        <p
          style={{
            fontSize: 14,
            marginBottom: 12,
            background: "#eff6ff",
            padding: "8px 10px",
            borderRadius: 12,
          }}
        >
          현재 계산된 하루 권장 칼로리:{" "}
          <strong style={{ color: "#1d4ed8" }}>{recommended}</strong> kcal
        </p>
      )}

      {msg && (
        <p style={{ fontSize: 13, marginBottom: 8, color: "#4b5563" }}>{msg}</p>
      )}

      <form onSubmit={handleSubmit} style={{ fontSize: 14 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 4 }}>성별</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }}
          >
            <option value="">선택</option>
            <option value="M">남성</option>
            <option value="F">여성</option>
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 4 }}>키 (cm)</label>
          <input
            type="number"
            name="height_cm"
            value={form.height_cm}
            onChange={handleChange}
            style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 4 }}>몸무게 (kg)</label>
          <input
            type="number"
            name="weight_kg"
            value={form.weight_kg}
            onChange={handleChange}
            style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 4 }}>생년월일</label>
          <input
            type="date"
            name="birth_date"
            value={form.birth_date || ""}
            onChange={handleChange}
            style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 4 }}>활동 수준</label>
          <select
            name="activity_level"
            value={form.activity_level}
            onChange={handleChange}
            style={{ padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }}
          >
            <option value="">선택</option>
            <option value="low">활동 적음</option>
            <option value="light">약간 활동적</option>
            <option value="active">활동적</option>
            <option value="very_active">매우 활동적</option>
          </select>
        </div>

        <hr style={{border: "0", borderTop: "1px solid #e5e7eb", margin: "20px 0"}} />
        
        <h3 style={{fontSize: 16, marginBottom: 10}}>🥗 식습관 및 알러지</h3>
        
        <div style={{ marginBottom: 10, display: 'flex', gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input 
                    type="checkbox" 
                    name="is_vegetarian" 
                    checked={form.is_vegetarian} 
                    onChange={handleChange}
                    style={{marginRight: 6}} 
                />
                채식주의자 (Vegetarian)
            </label>
        </div>

        <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6 }}>알러지 정보 (해당하는 항목 선택)</label>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input 
                    type="text" 
                    value={newAllergen}
                    onChange={(e) => setNewAllergen(e.target.value)}
                    placeholder="새로운 알러지 직접 입력"
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", flex: 1 }}
                />
                <button 
                    type="button" 
                    onClick={handleAddCustomAllergen}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#3b82f6", color: "white", cursor: "pointer" }}
                >
                    추가
                </button>
            </div>

            {allergenList.length === 0 ? (
                 <p style={{fontSize: 13, color: "#9ca3af"}}>등록된 알러지 정보가 없습니다. 직접 추가해보세요!</p>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {allergenList.map(allergen => (
                        <label 
                            key={allergen.id} 
                            style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                padding: "4px 8px 4px 12px", 
                                border: "1px solid #d1d5db", 
                                borderRadius: 99, 
                                fontSize: 13,
                                cursor: "pointer",
                                background: form.allergies.includes(allergen.id) ? "#e0f2fe" : "transparent",
                                borderColor: form.allergies.includes(allergen.id) ? "#3b82f6" : "#d1d5db"
                            }}
                        >
                            <input 
                                type="checkbox" 
                                checked={form.allergies.includes(allergen.id)}
                                onChange={() => handleAllergenToggle(allergen.id)}
                                style={{ display: "none" }} 
                            />
                            <span style={{marginRight: 6}}>{allergen.name}</span>
                            <button
                                type="button"
                                onClick={(e) => handleDeleteAllergen(e, allergen.id)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    fontSize: 14,
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="이 알러지 태그 삭제"
                            >
                                &times;
                            </button>
                        </label>
                    ))}
                </div>
            )}
        </div>

        <hr style={{border: "0", borderTop: "1px solid #e5e7eb", margin: "20px 0"}} />
        
        <h3 style={{fontSize: 16, marginBottom: 10}}>❤️ 음식 선호도 관리</h3>
        <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", marginBottom: 4 }}>선호/비선호 음식 검색 및 설정</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input 
                    type="text" 
                    value={foodSearchTerm}
                    onChange={(e) => setFoodSearchTerm(e.target.value)}
                    placeholder="음식 이름 검색 (예: 김치찌개)"
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", flex: 1 }}
                />
                <button 
                    type="button" 
                    onClick={handleFoodSearch}
                    disabled={loading}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#3b82f6", color: "white", cursor: loading ? "default" : "pointer" }}
                >
                    검색
                </button>
            </div>

            {foodSearchResults.length > 0 && (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 150, overflowY: "auto", marginBottom: 10 }}>
                    {foodSearchResults.map(food => (
                        <div key={food.id} 
                            style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center", 
                                padding: "8px 10px", 
                                borderBottom: "1px solid #eee",
                                background: selectedFoodForPreference?.id === food.id ? "#e0f2fe" : "white"
                            }}
                            onClick={() => setSelectedFoodForPreference(food)}
                        >
                            <span style={{ cursor: "pointer" }}>{food.representative_name} ({food.food_class})</span>
                            <div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleAddPreference(food.id, 'LIKE'); }}
                                    disabled={loading}
                                    style={{ 
                                        padding: "4px 8px", 
                                        borderRadius: 99, 
                                        border: "1px solid #10b981", 
                                        background: "white", 
                                        color: "#10b981", 
                                        fontSize: 12, 
                                        cursor: loading ? "default" : "pointer", 
                                        marginRight: 4 
                                    }}
                                >
                                    선호
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleAddPreference(food.id, 'DISLIKE'); }}
                                    disabled={loading}
                                    style={{ 
                                        padding: "4px 8px", 
                                        borderRadius: 99, 
                                        border: "1px solid #ef4444", 
                                        background: "white", 
                                        color: "#ef4444", 
                                        fontSize: 12, 
                                        cursor: loading ? "default" : "pointer" 
                                    }}
                                >
                                    비선호
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {foodSearchResults.length === 0 && foodSearchTerm.trim() && !loading && (
                <p style={{fontSize: 13, color: "#9ca3af"}}>검색 결과가 없습니다.</p>
            )}
        </div>

        <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>현재 설정된 선호/비선호 음식</h4>
            {foodPreferences.length === 0 ? (
                <p style={{fontSize: 13, color: "#9ca3af"}}>설정된 선호/비선호 음식이 없습니다.</p>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {foodPreferences.map(pref => (
                        <div 
                            key={pref.id} 
                            style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                padding: "4px 8px 4px 12px", 
                                border: `1px solid ${pref.preference === 'LIKE' ? '#10b981' : '#ef4444'}`, 
                                borderRadius: 99,
                                fontSize: 13,
                                background: pref.preference === 'LIKE' ? "#d1fae5" : "#fee2e2",
                                color: pref.preference === 'LIKE' ? "#065f46" : "#991b1b"
                            }}
                        >
                            <span style={{marginRight: 6}}>{pref.food.representative_name}</span>
                            <button
                                type="button"
                                onClick={() => handleDeletePreference(pref.food.id)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: pref.preference === 'LIKE' ? "#065f46" : "#991b1b",
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    fontSize: 14,
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="선호도 삭제"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            background: loading ? "#9ca3af" : "#2563eb",
            color: "#ffffff",
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "저장 중..." : "프로필 저장"}
        </button>
      </form>
    </section>
  );
}
