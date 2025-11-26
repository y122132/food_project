// food_frontend/src/components/Step1Upload.jsx
export default function Step1Upload({
  cardStyle,
  handleImageChange,
  imagePreview,
  handlePredict,
  loading,
  imageFile,
}) {
  return (
    <section style={cardStyle}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>1) 음식 사진 업로드</h2>
      <p style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
        휴대폰이나 카메라로 찍은 음식 사진을 업로드하면, 모델이 어떤 음식인지 먼저 분류합니다.
      </p>

      <input type="file" accept="image/*" onChange={handleImageChange} />

      {imagePreview && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <img
            src={imagePreview}
            alt="preview"
            style={{
              width: 260,
              height: 260,
              borderRadius: 16,
              objectFit: "cover",
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}
          />
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            <p style={{ marginBottom: 8 }}>
              이미지를 확인한 뒤, 아래 버튼을 눌러 분석을 시작하세요.
            </p>
            <button
              onClick={handlePredict}
              disabled={loading || !imageFile}
              style={{
                marginTop: 4,
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                background:
                  loading || !imageFile ? "#9ca3af" : "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                cursor: loading || !imageFile ? "default" : "pointer",
              }}
            >
              {loading ? "분석 중..." : "이미지 분석하기"}
            </button>
          </div>
        </div>
      )}

      {!imagePreview && (
        <p style={{ marginTop: 16, color: "#9ca3af", fontSize: 13 }}>
          아직 이미지가 없습니다. 상단의 파일 선택 버튼을 눌러 주세요.
        </p>
      )}
    </section>
  );
}
