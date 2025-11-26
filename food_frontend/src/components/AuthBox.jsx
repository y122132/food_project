import { useState } from "react";
import axios from "axios";

export default function AuthBox({ apiBase, currentUser, setCurrentUser }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({ username: "", password: "", email: "" });
  const [msg, setMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const url =
        mode === "login"
          ? `${apiBase}/auth/login/`
          : `${apiBase}/auth/register/`;
      const { data } = await axios.post(url, form, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      setCurrentUser(data);
      setMsg(mode === "login" ? "로그인 성공" : "회원가입 성공");
    } catch (err) {
      console.error(err);
      // 백엔드 응답이 있는 경우
      if (err.response && err.response.data) {
        const data = err.response.data;

        // 1) detail 필드가 있는 경우 (예: {"detail": "..."})
        if (typeof data.detail === "string") {
          setMsg(data.detail);
          return;
        }

        // 2) {"username": ["이미 존재하는 아이디입니다."]} 같은 형태인 경우
        const messages = [];
        for (const [field, value] of Object.entries(data)) {
          if (Array.isArray(value)) {
            messages.push(`${field}: ${value.join(" ")}`);
          } else if (typeof value === "string") {
            messages.push(`${field}: ${value}`);
          }
        }

        if (messages.length > 0) {
          setMsg(messages.join(" / "));
          return;
        }
      }

      // 그래도 못 찾으면 기본 문구
      setMsg("오류가 발생했습니다. 입력 값을 다시 확인해 주세요.");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${apiBase}/auth/logout/`,
        {},
        { withCredentials: true }
      );
      setCurrentUser(null);
      setMsg("로그아웃 되었습니다.");
    } catch (err) {
      console.error(err);
      setMsg("로그아웃 중 오류가 발생했습니다.");
    }
  };

  if (currentUser) {
    return (
      <div style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
        <span>
          안녕하세요, <strong>{currentUser.username}</strong> 님
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            cursor: "pointer",
          }}
        >
          로그아웃
        </button>
        {msg && <span style={{ color: "#6b7280" }}>{msg}</span>}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 8,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        fontSize: 12,
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <button
          onClick={() => setMode("login")}
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            background: mode === "login" ? "#2563eb" : "#ffffff",
            color: mode === "login" ? "#ffffff" : "#4b5563",
            marginRight: 4,
            cursor: "pointer",
          }}
        >
          로그인
        </button>
        <button
          onClick={() => setMode("register")}
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            background: mode === "register" ? "#2563eb" : "#ffffff",
            color: mode === "register" ? "#ffffff" : "#4b5563",
            cursor: "pointer",
          }}
        >
          회원가입
        </button>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <input
          name="username"
          placeholder="아이디"
          value={form.username}
          onChange={handleChange}
          style={{ padding: 4, borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        {mode === "register" && (
          <input
            name="email"
            placeholder="이메일(선택)"
            value={form.email}
            onChange={handleChange}
            style={{ padding: 4, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        )}
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          value={form.password}
          onChange={handleChange}
          style={{ padding: 4, borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        <button
          type="submit"
          style={{
            marginTop: 4,
            padding: "4px 8px",
            borderRadius: 999,
            border: "none",
            background: "#16a34a",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          {mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>
      {msg && <p style={{ marginTop: 4, color: "#6b7280" }}>{msg}</p>}
    </div>
  );
}
