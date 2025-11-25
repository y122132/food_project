import { useEffect, useState } from "react";
import axios from "axios";

export default function ProfilePage({ apiBase, currentUser, setRecommendedKcal }) {
  const [form, setForm] = useState({
    gender: "",
    height_cm: "",
    weight_kg: "",
    birth_date: "",
    activity_level: "",
  });
  const [recommended, setRecommended] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${apiBase}/profile/`, {
          withCredentials: true,
        });
        setForm({
          gender: data.gender || "",
          height_cm: data.height_cm || "",
          weight_kg: data.weight_kg || "",
          birth_date: data.birth_date || "",
          activity_level: data.activity_level || "",
        });
        setRecommended(data.recommended_kcal || null);
        if (data.recommended_kcal && setRecommendedKcal) {
          setRecommendedKcal(data.recommended_kcal);
        }
      } catch (err) {
        console.error(err);
        setMsg("프로필 정보를 불러오지 못했습니다. (로그인 여부 확인)");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [apiBase, setRecommendedKcal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const { data } = await axios.put(`${apiBase}/profile/`, form, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      setRecommended(data.recommended_kcal || null);
      if (data.recommended_kcal && setRecommendedKcal) {
        setRecommendedKcal(data.recommended_kcal);
      }
      setMsg("✅ 프로필이 저장되었습니다.");
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
        성별, 키, 몸무게, 생년월일, 활동 수준을 기반으로 하루 권장 칼로리를 계산합니다.
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

        <div style={{ marginBottom: 10 }}>
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
